import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { vocationTypeSchema } from "@/lib/validations/admin/vocation";
import { hasDuplicateName } from "@/lib/unique-name";

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

  const existingNames = await prisma.vocationTypeClass.findMany({ select: { id: true, name: true } });
  if (hasDuplicateName(existingNames, parsed.data.name, Number(id))) {
    return NextResponse.json({ error: "Já existe uma classe com esse nome." }, { status: 409 });
  }

  const vocationClass = await prisma.vocationTypeClass.update({
    where: { id: Number(id) },
    data: parsed.data,
  });

  await logAudit({
    accountId: Number(session.user.id),
    action: "update",
    entity: "vocation_type_class",
    entityId: vocationClass.id,
    metadata: parsed.data,
  });

  return NextResponse.json({ class: vocationClass });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  await prisma.vocationTypeClass.delete({ where: { id: Number(id) } });

  await logAudit({
    accountId: Number(session.user.id),
    action: "delete",
    entity: "vocation_type_class",
    entityId: id,
  });

  return NextResponse.json({ success: true });
}
