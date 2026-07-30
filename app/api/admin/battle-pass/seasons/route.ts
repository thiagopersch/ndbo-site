import { NextResponse } from "next/server";
import type { Prisma } from "@/lib/generated/prisma/client";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { syncActiveSeason } from "@/lib/battle-pass-season";
import { battlePassSeasonSchema, validateRewardsOrdering } from "@/lib/validations/admin/battle-pass";

export async function GET() {
  const { response } = await requireAdminSession();
  if (response) return response;

  const seasons = await prisma.battlePassSeason.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: { _count: { select: { missions: true, rewards: true } } },
  });

  return NextResponse.json({ seasons });
}

export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const body = await request.json();
  const parsed = battlePassSeasonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 422 },
    );
  }

  const { month, year, missions, rewards, ...seasonFields } = parsed.data;

  const orderingError = validateRewardsOrdering(rewards);
  if (orderingError) {
    return NextResponse.json({ error: orderingError }, { status: 422 });
  }

  const existing = await prisma.battlePassSeason.findUnique({ where: { month_year: { month, year } } });
  if (existing) {
    return NextResponse.json({ error: "Já existe uma temporada para esse mês/ano." }, { status: 409 });
  }

  const season = await prisma.battlePassSeason.create({
    data: {
      month,
      year,
      ...seasonFields,
      missions: {
        create: missions.map((mission) => ({
          ...mission,
          target: mission.target as unknown as Prisma.InputJsonValue,
        })),
      },
      rewards: { create: rewards },
    },
  });

  await syncActiveSeason();

  await logAudit({
    accountId: Number(session.user.id),
    action: "create",
    entity: "battle_pass_season",
    entityId: season.id,
    metadata: { month, year },
  });

  return NextResponse.json({ season }, { status: 201 });
}
