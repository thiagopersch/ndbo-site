import { NextResponse } from "next/server";
import type { Prisma } from "@/lib/generated/prisma/client";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { buildPaginatedResult, parsePaginationParams } from "@/lib/pagination";
import { vocationTypeSchema } from "@/lib/validations/admin/vocation";
import { hasDuplicateName } from "@/lib/unique-name";

export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const url = new URL(request.url);
  const { page, pageSize, search } = parsePaginationParams(url);

  const where: Prisma.VocationTypeUniverseWhereInput = search ? { name: { contains: search } } : {};

  const [universes, total] = await Promise.all([
    prisma.vocationTypeUniverse.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.vocationTypeUniverse.count({ where }),
  ]);

  return NextResponse.json(buildPaginatedResult(universes, total, page, pageSize));
}

export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const body = await request.json();
  const parsed = vocationTypeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  }

  const existingNames = await prisma.vocationTypeUniverse.findMany({ select: { id: true, name: true } });
  if (hasDuplicateName(existingNames, parsed.data.name)) {
    return NextResponse.json({ error: "Já existe um universo com esse nome." }, { status: 409 });
  }

  const universe = await prisma.vocationTypeUniverse.create({ data: parsed.data });

  await logAudit({
    accountId: Number(session.user.id),
    action: "create",
    entity: "vocation_type_universe",
    entityId: universe.id,
    metadata: parsed.data,
  });

  return NextResponse.json({ universe }, { status: 201 });
}
