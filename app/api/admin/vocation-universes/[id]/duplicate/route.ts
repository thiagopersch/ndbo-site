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
  const source = await prisma.vocationTypeUniverse.findUnique({ where: { id: Number(id) } });

  if (!source) {
    return NextResponse.json({ error: "Universo não encontrado." }, { status: 404 });
  }

  const name = await uniqueCopyName(
    source.name,
    async (candidate) =>
      (await prisma.vocationTypeUniverse.findUnique({ where: { name: candidate }, select: { id: true } })) != null,
  );

  const vocationUniverse = await prisma.vocationTypeUniverse.create({ data: { name } });

  await logAudit({
    accountId: Number(session.user.id),
    action: "duplicate",
    entity: "vocation_type_universe",
    entityId: vocationUniverse.id,
    metadata: { sourceId: source.id, name: vocationUniverse.name },
  });

  return NextResponse.json({ id: vocationUniverse.id, name: vocationUniverse.name }, { status: 201 });
}
