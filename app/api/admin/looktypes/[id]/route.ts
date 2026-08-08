import { promises as fs } from "node:fs";

import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { looktypeSchema } from "@/lib/validations/admin/looktype";
import { looktypeFrameDirPath } from "@/lib/looktype-storage";
import { clampFrameDurationMs } from "@/lib/obd/obd-render";

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

  const existing = await prisma.looktype.findUnique({ where: { id: Number(id) } });
  if (!existing) {
    return NextResponse.json({ error: "Looktype não encontrada." }, { status: 404 });
  }

  const frameDurationsMs =
    parsed.data.frameSpeedMs != null && existing.frameCount > 0
      ? Array.from({ length: existing.frameCount }, () => clampFrameDurationMs(parsed.data.frameSpeedMs))
      : undefined;

  // Só o nome tem índice único no banco (ver `prisma/schema.prisma`); o número é checado aqui em
  // aplicação, mesmo motivo do `POST /api/admin/looktypes`.
  if (parsed.data.category !== "item" && parsed.data.looktypeNumber !== null) {
    const numberConflict = await prisma.looktype.findFirst({
      where: {
        category: parsed.data.category,
        looktypeNumber: parsed.data.looktypeNumber,
        id: { not: Number(id) },
      },
    });
    if (numberConflict) {
      return NextResponse.json(
        {
          error: `Já existe uma sprite com o número ${parsed.data.looktypeNumber} na categoria ${parsed.data.category} (#${numberConflict.id} "${numberConflict.name}").`,
        },
        { status: 409 },
      );
    }
  }

  let looktype;
  try {
    looktype = await prisma.looktype.update({
      where: { id: Number(id) },
      data: {
        name: parsed.data.name,
        category: parsed.data.category,
        looktypeNumber: parsed.data.category === "item" ? null : parsed.data.looktypeNumber,
        ...(frameDurationsMs ? { frameDurationsMs } : {}),
      },
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { error: `Já existe uma sprite chamada "${parsed.data.name}" na categoria ${parsed.data.category}.` },
        { status: 409 },
      );
    }
    throw error;
  }

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
