import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { uniqueCopyName } from "@/lib/duplicate-utils";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const source = await prisma.vocationTypeClass.findUnique({ where: { id: Number(id) } });

  if (!source) {
    return NextResponse.json({ error: "Classe não encontrada." }, { status: 404 });
  }

  const name = await uniqueCopyName(
    source.name,
    async (candidate) =>
      (await prisma.vocationTypeClass.findUnique({ where: { name: candidate }, select: { id: true } })) != null,
  );

  const vocationClass = await prisma.vocationTypeClass.create({ data: { name } });

  await logAudit({
    accountId: Number(session.user.id),
    action: "duplicate",
    entity: "vocation_type_class",
    entityId: vocationClass.id,
    metadata: { sourceId: source.id, name: vocationClass.name },
  });

  return NextResponse.json({ id: vocationClass.id, name: vocationClass.name }, { status: 201 });
}
