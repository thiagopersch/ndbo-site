import { NextResponse } from "next/server";
import type { Prisma } from "@/lib/generated/prisma/client";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { buildPaginatedResult, parsePaginationParams } from "@/lib/pagination";
import { dailyRewardMonthlySchema } from "@/lib/validations/admin/daily-reward";

export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const url = new URL(request.url);
  const { page, pageSize, search } = parsePaginationParams(url);
  const searchAsNumber = Number(search);

  const where: Prisma.DailyRewardsMonthlyWhereInput =
    search && Number.isFinite(searchAsNumber) ? { itemId: searchAsNumber } : {};

  const [rewards, total] = await Promise.all([
    prisma.dailyRewardsMonthly.findMany({
      where,
      orderBy: [{ year: "desc" }, { month: "desc" }, { day: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.dailyRewardsMonthly.count({ where }),
  ]);

  return NextResponse.json(buildPaginatedResult(rewards, total, page, pageSize));
}

export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const body = await request.json();
  const parsed = dailyRewardMonthlySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  }

  const reward = await prisma.dailyRewardsMonthly.upsert({
    where: {
      month_year_day: {
        month: parsed.data.month,
        year: parsed.data.year,
        day: parsed.data.day,
      },
    },
    update: parsed.data,
    create: parsed.data,
  });

  await logAudit({
    accountId: Number(session.user.id),
    action: "upsert",
    entity: "daily_rewards_monthly",
    entityId: `${reward.year}-${reward.month}-${reward.day}`,
    metadata: parsed.data,
  });

  return NextResponse.json({ reward }, { status: 201 });
}

export async function DELETE(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const { month, year, day } = await request.json();

  await prisma.dailyRewardsMonthly.delete({
    where: { month_year_day: { month, year, day } },
  });

  await logAudit({
    accountId: Number(session.user.id),
    action: "delete",
    entity: "daily_rewards_monthly",
    entityId: `${year}-${month}-${day}`,
  });

  return NextResponse.json({ success: true });
}
