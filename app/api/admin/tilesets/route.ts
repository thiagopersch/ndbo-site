import { NextResponse } from "next/server";
import type { Prisma } from "@/lib/generated/prisma/client";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { buildPaginatedResult, parsePaginationParams } from "@/lib/pagination";
import { tilesetFormSchema } from "@/lib/validations/admin/tileset";
import { tilesetToFormInput } from "@/lib/tileset-mapper";
import { assertUniqueTilesetName, TilesetIntegrityError } from "@/lib/tileset-integrity";

export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const url = new URL(request.url);
  const { page, pageSize, search } = parsePaginationParams(url);

  const where: Prisma.TilesetWhereInput = search ? { name: { contains: search } } : {};

  const [tilesets, total] = await Promise.all([
    prisma.tileset.findMany({
      where,
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: { _count: { select: { categories: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.tileset.count({ where }),
  ]);

  return NextResponse.json(buildPaginatedResult(tilesets, total, page, pageSize));
}

export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const body = await request.json();
  const parsed = tilesetFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  }

  try {
    await assertUniqueTilesetName(parsed.data.name);

    const tileset = await prisma.tileset.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        order: parsed.data.order,
        active: parsed.data.active,
        icon: parsed.data.icon,
      },
    });

    await logAudit({
      accountId: Number(session.user.id),
      action: "create",
      entity: "tileset",
      entityId: tileset.id,
      metadata: { name: tileset.name },
    });

    return NextResponse.json({ tileset: tilesetToFormInput(tileset) }, { status: 201 });
  } catch (error) {
    if (error instanceof TilesetIntegrityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
