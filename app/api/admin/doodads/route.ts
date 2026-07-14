import { NextResponse } from "next/server";
import type { Prisma } from "@/lib/generated/prisma/client";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { buildPaginatedResult, parsePaginationParams } from "@/lib/pagination";
import { doodadFormSchema } from "@/lib/validations/admin/doodad";
import { doodadFormToContent } from "@/lib/doodad-mapper";
import { assertCategoryForBrush, TilesetIntegrityError } from "@/lib/tileset-integrity";

export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const url = new URL(request.url);
  const { page, pageSize, search } = parsePaginationParams(url);

  const where: Prisma.DoodadBrushWhereInput = search ? { name: { contains: search } } : {};

  const [brushes, total] = await Promise.all([
    prisma.doodadBrush.findMany({
      where,
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        type: true,
        serverLookId: true,
        draggable: true,
        onBlocking: true,
        thickness: true,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.doodadBrush.count({ where }),
  ]);

  return NextResponse.json(buildPaginatedResult(brushes, total, page, pageSize));
}

export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const body = await request.json();
  const parsed = doodadFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  }

  try {
    await assertCategoryForBrush(parsed.data.tilesetCategoryId, "doodad");

    const brush = await prisma.doodadBrush.create({
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        serverLookId: parsed.data.serverLookId,
        draggable: parsed.data.draggable,
        onBlocking: parsed.data.onBlocking,
        thickness: parsed.data.thickness,
        onDuplicate: parsed.data.onDuplicate,
        oneSize: parsed.data.oneSize,
        redoBorders: parsed.data.redoBorders,
        reborder: parsed.data.reborder,
        content: doodadFormToContent(parsed.data),
        tilesetCategoryId: parsed.data.tilesetCategoryId,
      },
    });

    await logAudit({
      accountId: Number(session.user.id),
      action: "create",
      entity: "doodad_brush",
      entityId: brush.id,
      metadata: { name: brush.name, type: brush.type },
    });

    return NextResponse.json({ brush }, { status: 201 });
  } catch (error) {
    if (error instanceof TilesetIntegrityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
