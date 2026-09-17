import fs from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/prisma";
import { itemFormToRow, itemRowToFormInput } from "@/lib/item-mapper";
import { itemToXml, itemsToXmlDocument } from "@/lib/item-xml";
import { parseItemsXml } from "@/lib/item-xml-parser";
import type { ItemInput } from "@/lib/validations/admin/item";

/** Margem de tolerância entre o `mtime` do arquivo e o `updatedAt` mais recente do banco — mesmo
 * raciocínio de `RECONCILE_SKEW_MS` em `lib/npc-file-sync.ts`: evita reconciliar de novo só por
 * causa da diferença de resolução entre o relógio do FS e o timestamp gravado pelo próprio
 * `writeAllItemsToXml`/reconciliação anterior. */
const RECONCILE_SKEW_MS = 1000;

/** Mesmo tamanho de lote de `IMPORT_CHUNK_SIZE` em `lib/item-mapper.ts` — um `items.xml` real tem
 * 4000+ entradas após expandir `fromid`/`toid`, grande demais para um único `$transaction`. */
const RECONCILE_CHUNK_SIZE = 300;

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

export function getItemsXmlPath(): string {
  const base = process.env.OTSERVER_DATA_PATH;
  if (!base) {
    throw new Error("OTSERVER_DATA_PATH não configurado (.env)");
  }
  return path.join(base, "items", "items.xml");
}

/**
 * Reescreve `data/items/items.xml` inteiro a partir do estado atual da tabela `items` — efeito
 * colateral de toda mutação do CRUD de items (create/update/delete/range/duplicate). `items.xml`
 * é um arquivo monolítico (ao contrário de NPCs, um por entidade), então não dá para atualizar só
 * a entrada que mudou sem reprocessar a lista inteira; mesma abordagem que `/api/admin/items/export`
 * já fazia manualmente. Nunca lança — uma falha de FS (ex.: `OTSERVER_DATA_PATH` ausente em dev)
 * não pode derrubar a resposta da API, já que a gravação no banco (o backup) já foi concluída.
 */
export async function writeAllItemsToXml(): Promise<void> {
  try {
    const items = await prisma.item.findMany({ orderBy: { id: "asc" } });
    const xml = itemsToXmlDocument(items.map(itemRowToFormInput));
    const xmlPath = getItemsXmlPath();
    await fs.mkdir(path.dirname(xmlPath), { recursive: true });
    await fs.writeFile(xmlPath, xml, "utf-8");
  } catch (error) {
    console.warn("[items-xml-sync] Falha ao gravar items.xml:", error);
  }
}

/**
 * Se `items.xml` foi modificado (por fora do painel — edição manual, RME, git pull) depois do
 * último registro sincronizado no banco, reimporta o arquivo inteiro: cria/atualiza cada item por
 * id (preservando os campos que só existem no banco/portal — `published`, `lookTypeId` — igual à
 * separação que `buildXmlDerivedUpdate` faz para NPCs) e remove do banco os ids que não aparecem
 * mais no arquivo. Nunca lança — se o arquivo não existir, não puder ser lido, ou o XML for
 * inválido, apenas loga um aviso e mantém o banco como está.
 */
export async function reconcileItemsFromDisk(): Promise<void> {
  const xmlPath = getItemsXmlPath();

  let stat: Awaited<ReturnType<typeof fs.stat>>;
  try {
    stat = await fs.stat(xmlPath);
  } catch {
    return;
  }

  try {
    const latest = await prisma.item.aggregate({ _max: { updatedAt: true } });
    const latestUpdatedAt = latest._max.updatedAt;

    if (latestUpdatedAt && stat.mtime.getTime() <= latestUpdatedAt.getTime() + RECONCILE_SKEW_MS) {
      return;
    }

    const xml = await fs.readFile(xmlPath, "utf-8");
    const { items, errors } = parseItemsXml(xml);

    if (items.length === 0) {
      if (errors.length > 0) {
        console.warn("[items-xml-sync] items.xml não pôde ser reconciliado:", errors.slice(0, 5));
      }
      return;
    }

    const existing = await prisma.item.findMany({ select: { id: true, published: true, lookTypeId: true } });
    const existingById = new Map(existing.map((row) => [row.id, row]));
    const idsInXml = new Set(items.map((item) => item.id));

    const idsToDelete = existing.map((row) => row.id).filter((id) => !idsInXml.has(id));

    for (const batch of chunk(items, RECONCILE_CHUNK_SIZE)) {
      await prisma.$transaction(
        batch.map((item) => {
          const current = existingById.get(item.id);
          const data = itemFormToRow({
            ...item,
            published: current?.published ?? item.published,
            lookTypeId: current?.lookTypeId ?? item.lookTypeId,
          });
          return prisma.item.upsert({ where: { id: item.id }, update: data, create: data });
        }),
        { timeout: 60_000 },
      );
    }

    if (idsToDelete.length > 0) {
      await prisma.item.deleteMany({ where: { id: { in: idsToDelete } } });
    }
  } catch (error) {
    console.warn("[items-xml-sync] Erro ao reconciliar items.xml:", error);
  }
}

export type SyncItemsXmlResult = {
  added: number;
  updated: number;
  unchanged: number;
  total: number;
};

/**
 * Ação manual (botão "Sincronizar items.xml" na listagem): leva o estado atual da tabela `items`
 * (a fonte que o CRUD edita) pro arquivo, com diff — ao contrário de `writeAllItemsToXml`, que
 * reescreve tudo cegamente. Item cuja serialização já bate com o banco é pulado, item desatualizado
 * é atualizado no lugar, item que só existe no banco é adicionado respeitando a ordem de id. Nunca
 * remove do arquivo uma entrada que não está no banco (preserva itens só-arquivo intocados). Ao
 * contrário das duas funções acima, deixa erro subir — é uma ação de clique, não um efeito
 * colateral silencioso, então a rota deve poder reportar falha ao usuário.
 */
export async function syncItemsXmlFromDatabase(): Promise<SyncItemsXmlResult> {
  const dbItems = (await prisma.item.findMany({ orderBy: { id: "asc" } })).map(itemRowToFormInput);

  const xmlPath = getItemsXmlPath();
  let fileItems: ItemInput[] = [];
  try {
    const xml = await fs.readFile(xmlPath, "utf-8");
    fileItems = parseItemsXml(xml).items;
  } catch {
    fileItems = [];
  }

  const finalById = new Map(fileItems.map((item) => [item.id, item]));

  let added = 0;
  let updated = 0;
  let unchanged = 0;

  for (const dbItem of dbItems) {
    const fileItem = finalById.get(dbItem.id);

    if (!fileItem) {
      added += 1;
      finalById.set(dbItem.id, dbItem);
    } else if (itemToXml(fileItem) !== itemToXml(dbItem)) {
      updated += 1;
      finalById.set(dbItem.id, dbItem);
    } else {
      unchanged += 1;
    }
  }

  if (added > 0 || updated > 0) {
    const finalItems = [...finalById.values()].sort((a, b) => a.id - b.id);
    await fs.mkdir(path.dirname(xmlPath), { recursive: true });
    await fs.writeFile(xmlPath, itemsToXmlDocument(finalItems), "utf-8");
  }

  return { added, updated, unchanged, total: dbItems.length };
}
