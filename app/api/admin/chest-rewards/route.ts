import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { buildPaginatedResult, parsePaginationParams } from "@/lib/pagination";
import { chestRewardSchema } from "@/lib/validations/admin/chest-reward";

export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const url = new URL(request.url);
  const { page, pageSize } = parsePaginationParams(url);

  const [chestRewards, total] = await Promise.all([
    prisma.chestReward.findMany({
      orderBy: { id: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.chestReward.count(),
  ]);

  return NextResponse.json(buildPaginatedResult(chestRewards, total, page, pageSize));
}

export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const body = await request.json();
  const parsed = chestRewardSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  }

  const chestReward = await prisma.chestReward.create({ data: parsed.data });

  await logAudit({
    accountId: Number(session.user.id),
    action: "create",
    entity: "chest_reward",
    entityId: chestReward.id,
    metadata: parsed.data,
  });

  return NextResponse.json({ chestReward }, { status: 201 });
}
