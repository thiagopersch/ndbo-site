import { NextResponse } from "next/server";
import type { Prisma } from "@/lib/generated/prisma/client";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { buildPaginatedResult, parsePaginationParams } from "@/lib/pagination";
import { wallFormSchema } from "@/lib/validations/admin/wall";
import { wallFormToContent } from "@/lib/wall-mapper";
import { assertCategoryForBrush, TilesetIntegrityError } from "@/lib/tileset-integrity";
import { idsWithItem, wallItemIds } from "@/lib/brush-item-ids";

export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const url = new URL(request.url);
  const { page, pageSize, search } = parsePaginationParams(url);

  const searchId = search ? Number(search) : NaN;
  const isNumericSearch = search !== "" && Number.isFinite(searchId);

  // Busca por id de item: `server_lookid` (coluna) + qualquer id usado dentro do conteúdo
  // (walls/items/composites/alternates) — não dá pra filtrar JSON aninhado no banco, então
  // varre a tabela em memória.
  let contentMatchIds: number[] = [];
  if (isNumericSearch) {
    const candidates = await prisma.wallBrush.findMany({ select: { id: true, content: true } });
    contentMatchIds = idsWithItem(candidates, wallItemIds, searchId);
  }

  const where: Prisma.WallBrushWhereInput = search
    ? {
        OR: [
          { name: { contains: search } },
          ...(isNumericSearch
            ? [{ serverLookId: searchId }, { id: { in: contentMatchIds } }]
            : []),
        ],
      }
    : {};

  const [brushes, total] = await Promise.all([
    prisma.wallBrush.findMany({
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
    prisma.wallBrush.count({ where }),
  ]);

  return NextResponse.json(buildPaginatedResult(brushes, total, page, pageSize));
}

export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const body = await request.json();
  const parsed = wallFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  }

  try {
    await assertCategoryForBrush(parsed.data.tilesetCategoryId, "terrain");

    const brush = await prisma.wallBrush.create({
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
        content: wallFormToContent(parsed.data),
        friends: parsed.data.friends,
        tilesetCategoryId: parsed.data.tilesetCategoryId,
      },
    });

    await logAudit({
      accountId: Number(session.user.id),
      action: "create",
      entity: "wall_brush",
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
