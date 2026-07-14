import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { parseMonsterXml } from "@/lib/monster-xml-parser";
import { monsterFormToRow } from "@/lib/monster-mapper";

export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const formData = await request.formData();
  const file = formData.get("file");
  const updateExisting = formData.get("replaceExisting") === "true";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 422 });
  }

  const xml = await file.text();
  const { monster, error } = parseMonsterXml(xml);

  if (!monster) {
    return NextResponse.json({ error: error ?? "Arquivo inválido.", details: [error] }, { status: 422 });
  }

  const existing = await prisma.monster.findUnique({ where: { name: monster.name } });

  if (existing && !updateExisting) {
    return NextResponse.json(
      {
        error: `Já existe um monstro chamado "${monster.name}". Marque a opção de atualização para sobrescrever.`,
      },
      { status: 409 }
    );
  }

  const saved = existing
    ? await prisma.monster.update({ where: { id: existing.id }, data: monsterFormToRow(monster) })
    : await prisma.monster.create({ data: monsterFormToRow(monster) });

  await logAudit({
    accountId: Number(session.user.id),
    action: "import",
    entity: "monster",
    entityId: saved.id,
    metadata: { name: saved.name, updated: Boolean(existing) },
  });

  return NextResponse.json({ imported: 1, skipped: 0, errors: [] });
}
