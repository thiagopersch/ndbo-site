import { NextResponse } from "next/server";
import type { Prisma } from "@/lib/generated/prisma/client";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { buildPaginatedResult, parsePaginationParams } from "@/lib/pagination";
import { borderFormSchema } from "@/lib/validations/admin/border";

export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const url = new URL(request.url);
  const { page, pageSize, search } = parsePaginationParams(url);

  const where: Prisma.BorderWhereInput = search ? { name: { contains: search } } : {};

  const [borders, total] = await Promise.all([
    prisma.border.findMany({
      where,
      orderBy: { id: "asc" },
      select: { id: true, name: true, group: true, optional: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.border.count({ where }),
  ]);

  return NextResponse.json(buildPaginatedResult(borders, total, page, pageSize));
}

export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const body = await request.json();
  const parsed = borderFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  }

  const existing = await prisma.border.findUnique({ where: { id: parsed.data.id } });
  if (existing) {
    return NextResponse.json({ error: "Já existe um border com esse id." }, { status: 409 });
  }

  const border = await prisma.border.create({
    data: {
      id: parsed.data.id,
      name: parsed.data.name,
      group: parsed.data.group,
      optional: parsed.data.optional,
      edges: parsed.data.edges,
    },
  });

  await logAudit({
    accountId: Number(session.user.id),
    action: "create",
    entity: "border",
    entityId: border.id,
    metadata: { name: border.name },
  });

  return NextResponse.json({ border }, { status: 201 });
}
