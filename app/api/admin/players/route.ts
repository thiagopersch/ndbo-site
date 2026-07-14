import { NextResponse } from "next/server";
import type { Prisma } from "@/lib/generated/prisma/client";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { buildPaginatedResult, parsePaginationParams } from "@/lib/pagination";

export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const url = new URL(request.url);
  const { page, pageSize, search } = parsePaginationParams(url);

  const where: Prisma.PlayerWhereInput = search ? { name: { contains: search } } : {};

  const [players, total] = await Promise.all([
    prisma.player.findMany({
      where,
      orderBy: { id: "desc" },
      select: {
        id: true,
        name: true,
        level: true,
        vocation: true,
        groupId: true,
        online: true,
        deleted: true,
        accountId: true,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.player.count({ where }),
  ]);

  return NextResponse.json(buildPaginatedResult(players, total, page, pageSize));
}
