import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { vocationTypeSchema } from "@/lib/validations/admin/vocation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const body = await request.json();
  const parsed = vocationTypeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  }

  const universe = await prisma.vocationTypeUniverse.update({
    where: { id: Number(id) },
    data: parsed.data,
  });

  await logAudit({
    accountId: Number(session.user.id),
    action: "update",
    entity: "vocation_type_universe",
    entityId: universe.id,
    metadata: parsed.data,
  });

  return NextResponse.json({ universe });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  await prisma.vocationTypeUniverse.delete({ where: { id: Number(id) } });

  await logAudit({
    accountId: Number(session.user.id),
    action: "delete",
    entity: "vocation_type_universe",
    entityId: id,
  });

  return NextResponse.json({ success: true });
}
