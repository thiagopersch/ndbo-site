import { promises as fs } from "node:fs";

import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { looktypeSchema } from "@/lib/validations/admin/looktype";
import { looktypeFrameDirPath } from "@/lib/looktype-storage";

type Params = { params: Promise<{ id: string }> };

/** O `id` da URL manda — não é editável (trocar exigiria mover a pasta de frames em disco). */
export async function PATCH(request: Request, { params }: Params) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const body = await request.json();
  const parsed = looktypeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  }

  const looktype = await prisma.looktype.update({
    where: { id: Number(id) },
    data: {
      name: parsed.data.name,
      category: parsed.data.category,
      looktypeNumber: parsed.data.category === "item" ? null : parsed.data.looktypeNumber,
    },
  });

  await logAudit({
    accountId: Number(session.user.id),
    action: "update",
    entity: "looktype",
    entityId: looktype.id,
    metadata: { name: looktype.name, category: looktype.category, looktypeNumber: looktype.looktypeNumber },
  });

  return NextResponse.json({ looktype });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  await prisma.looktype.delete({ where: { id: Number(id) } });
  await fs.rm(looktypeFrameDirPath(Number(id)), { recursive: true, force: true });

  await logAudit({
    accountId: Number(session.user.id),
    action: "delete",
    entity: "looktype",
    entityId: id,
  });

  return NextResponse.json({ success: true });
}
