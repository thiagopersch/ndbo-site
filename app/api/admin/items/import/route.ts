import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { parseItemsXml } from "@/lib/item-xml-parser";
import { importItemsBatched } from "@/lib/item-mapper";

/**
 * Import em lote (upsert em chunks de `$transaction`, ou `deleteMany`+`createMany` chunked
 * quando `replaceExisting`) — ver `importItemsBatched` em `lib/item-mapper.ts`. Suporta o
 * items.xml real (~4000+ itens após expansão de fromid/toid) sem estourar uma única transação.
 */
export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const formData = await request.formData();
  const file = formData.get("file");
  const replaceExisting = formData.get("replaceExisting") === "true";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 422 });
  }

  const xml = await file.text();
  const { items, errors } = parseItemsXml(xml);

  if (items.length === 0) {
    return NextResponse.json(
      { error: "Nenhum item válido encontrado no arquivo.", details: errors },
      { status: 422 }
    );
  }

  await importItemsBatched(prisma, items, { replaceExisting });

  await logAudit({
    accountId: Number(session.user.id),
    action: "import",
    entity: "item",
    metadata: { imported: items.length, skipped: errors.length, replaceExisting },
  });

  return NextResponse.json({
    imported: items.length,
    skipped: errors.length,
    errors: errors.slice(0, 50),
  });
}
