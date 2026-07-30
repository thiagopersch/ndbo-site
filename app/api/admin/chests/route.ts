import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { buildPaginatedResult, parsePaginationParams } from "@/lib/pagination";
import { chestSchema, MAX_CHESTS } from "@/lib/validations/admin/chest";

export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const url = new URL(request.url);
  const { page, pageSize } = parsePaginationParams(url);

  const [chests, total] = await Promise.all([
    prisma.chest.findMany({
      orderBy: { id: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.chest.count(),
  ]);

  return NextResponse.json(buildPaginatedResult(chests, total, page, pageSize));
}

export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const body = await request.json();
  const parsed = chestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  }

  const existingCount = await prisma.chest.count();
  if (existingCount >= MAX_CHESTS) {
    return NextResponse.json(
      { error: `O sistema de baús do OTC exibe no máximo ${MAX_CHESTS} baús (1 central + 2 laterais).` },
      { status: 422 },
    );
  }

  const chest = await prisma.chest.create({
    data: {
      name: parsed.data.name,
      keyItemId: parsed.data.keyItemId,
      rewards: parsed.data.rewards,
      published: parsed.data.published,
    },
  });

  await logAudit({
    accountId: Number(session.user.id),
    action: "create",
    entity: "chest",
    entityId: chest.id,
    metadata: { name: chest.name },
  });

  return NextResponse.json({ chest }, { status: 201 });
}
