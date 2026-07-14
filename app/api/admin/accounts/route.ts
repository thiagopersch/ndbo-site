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

  const where: Prisma.AccountWhereInput = search ? { name: { contains: search } } : {};

  const [accounts, total] = await Promise.all([
    prisma.account.findMany({
      where,
      orderBy: { id: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        groupId: true,
        blocked: true,
        premdays: true,
        warnings: true,
        _count: { select: { players: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.account.count({ where }),
  ]);

  return NextResponse.json(buildPaginatedResult(accounts, total, page, pageSize));
}
