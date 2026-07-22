import { NextResponse } from "next/server";
import type { Prisma } from "@/lib/generated/prisma/client";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { buildPaginatedResult, parsePaginationParams } from "@/lib/pagination";
import { groundFormSchema } from "@/lib/validations/admin/ground";
import { assertCategoryForBrush, TilesetIntegrityError } from "@/lib/tileset-integrity";
import { groundItemIds, idsWithItem } from "@/lib/brush-item-ids";

export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const url = new URL(request.url);
  const { page, pageSize, search } = parsePaginationParams(url);

  const searchId = search ? Number(search) : NaN;
  const isNumericSearch = search !== "" && Number.isFinite(searchId);

  // Busca por id de item: `server_lookid` (coluna) + qualquer id usado em `items` (grama/
  // tocos do chão) — não dá pra filtrar JSON aninhado no banco, então varre a tabela em
  // memória.
  let contentMatchIds: number[] = [];
  if (isNumericSearch) {
    const candidates = await prisma.ground.findMany({ select: { id: true, items: true } });
    contentMatchIds = idsWithItem(candidates, groundItemIds, searchId);
  }

  const where: Prisma.GroundWhereInput = search
    ? {
        OR: [
          { name: { contains: search } },
          ...(isNumericSearch
            ? [{ serverLookId: searchId }, { id: { in: contentMatchIds } }]
            : []),
        ],
      }
    : {};

  const [grounds, total] = await Promise.all([
    prisma.ground.findMany({
      where,
      orderBy: { id: "asc" },
      select: { id: true, name: true, serverLookId: true, zOrder: true, soloOptional: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.ground.count({ where }),
  ]);

  return NextResponse.json(buildPaginatedResult(grounds, total, page, pageSize));
}

export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const body = await request.json();
  const parsed = groundFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  }

  try {
    await assertCategoryForBrush(parsed.data.tilesetCategoryId, "terrain");

    const ground = await prisma.ground.create({
      data: {
        name: parsed.data.name,
        serverLookId: parsed.data.serverLookId,
        zOrder: parsed.data.zOrder,
        soloOptional: parsed.data.soloOptional,
        items: parsed.data.items,
        borders: parsed.data.borders,
        friends: parsed.data.friends,
        tilesetCategoryId: parsed.data.tilesetCategoryId,
      },
    });

    await logAudit({
      accountId: Number(session.user.id),
      action: "create",
      entity: "ground",
      entityId: ground.id,
      metadata: { name: ground.name },
    });

    return NextResponse.json({ ground }, { status: 201 });
  } catch (error) {
    if (error instanceof TilesetIntegrityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
