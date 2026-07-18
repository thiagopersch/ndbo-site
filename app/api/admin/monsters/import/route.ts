import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { parseMonsterXml } from "@/lib/monster-xml-parser";
import { monsterFormToRow } from "@/lib/monster-mapper";

/**
 * Import de um ou mais arquivos XML de monstro (`data/monster/*.xml`, um único `<monster>`
 * por arquivo — diferente de Item/Movement, que bundlam várias linhas num XML só). Aceita
 * múltiplos arquivos no mesmo request (`files`), processando um a um e agregando o
 * resultado — mantém compatibilidade com o campo legado `file` (um único arquivo).
 */
export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const formData = await request.formData();
  const legacyFile = formData.get("file");
  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File);
  if (legacyFile instanceof File) files.push(legacyFile);

  const updateExisting = formData.get("replaceExisting") === "true";
  const category = formData.get("category");
  const subcategory = formData.get("subcategory");

  if (files.length === 0) {
    return NextResponse.json(
      { error: "Nenhum arquivo enviado." },
      { status: 422 },
    );
  }

  if (typeof category !== "string" || !category.trim()) {
    return NextResponse.json(
      { error: "Informe o universo (categoria) para importar." },
      { status: 422 },
    );
  }

  if (typeof subcategory !== "string" || !subcategory.trim()) {
    return NextResponse.json(
      { error: "Informe a subcategoria/subpasta para importar." },
      { status: 422 },
    );
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const file of files) {
    const xml = await file.text();
    const { monster, error } = parseMonsterXml(xml, { category, subcategory });

    if (!monster) {
      skipped += 1;
      errors.push(`${file.name}: ${error ?? "arquivo inválido"}`);
      continue;
    }

    const existing = await prisma.monster.findUnique({
      where: { name: monster.name },
    });

    if (existing && !updateExisting) {
      skipped += 1;
      errors.push(
        `${file.name}: já existe um monstro chamado "${monster.name}"`,
      );
      continue;
    }

    const saved = existing
      ? await prisma.monster.update({
          where: { id: existing.id },
          data: monsterFormToRow(monster),
        })
      : await prisma.monster.create({ data: monsterFormToRow(monster) });

    await logAudit({
      accountId: Number(session.user.id),
      action: "import",
      entity: "monster",
      entityId: saved.id,
      metadata: { name: saved.name, updated: Boolean(existing) },
    });

    imported += 1;
  }

  return NextResponse.json({ imported, skipped, errors: errors.slice(0, 50) });
}
