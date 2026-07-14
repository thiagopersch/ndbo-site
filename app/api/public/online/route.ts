import { NextResponse } from "next/server";
import type { Prisma } from "@/lib/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { buildPaginatedResult, parsePaginationParams } from "@/lib/pagination";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { page, pageSize, search } = parsePaginationParams(url);

  const where: Prisma.PlayerWhereInput = {
    online: 1,
    deleted: 0,
    ...(search ? { name: { contains: search } } : {}),
  };

  const [players, total] = await Promise.all([
    prisma.player.findMany({
      where,
      orderBy: { level: "desc" },
      select: { id: true, name: true, level: true, vocation: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.player.count({ where }),
  ]);

  return NextResponse.json({ ...buildPaginatedResult(players, total, page, pageSize), count: total });
}
