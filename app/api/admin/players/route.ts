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

  const vocationIds = [...new Set(players.map((player) => player.vocation))];
  const vocations = vocationIds.length
    ? await prisma.vocation.findMany({ where: { id: { in: vocationIds } }, select: { id: true, name: true } })
    : [];
  const vocationNameById = new Map(vocations.map((vocation) => [vocation.id, vocation.name]));

  const data = players.map((player) => ({
    ...player,
    vocationName: vocationNameById.get(player.vocation) ?? "Desconhecida",
  }));

  return NextResponse.json(buildPaginatedResult(data, total, page, pageSize));
}
