import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { ensureActiveSeason } from "@/lib/battle-pass-season";
import { battlePassRewardSchema, RARITY_ORDER } from "@/lib/validations/admin/battle-pass";

async function validateOrdering(
  seasonId: number,
  track: string,
  level: number,
  itemId: number,
  rarity: keyof typeof RARITY_ORDER,
  excludeId?: number,
) {
  const siblings = await prisma.battlePassReward.findMany({
    where: { seasonId, track, id: excludeId ? { not: excludeId } : undefined },
  });

  if (siblings.some((s) => s.itemId === itemId)) {
    return "Este item já é recompensa de outro level nesta trilha — recompensas não podem repetir.";
  }

  const targetOrder = RARITY_ORDER[rarity];
  for (const sibling of siblings) {
    const siblingOrder = RARITY_ORDER[sibling.rarity as keyof typeof RARITY_ORDER];
    if (sibling.level < level && siblingOrder > targetOrder) {
      return `Level ${sibling.level} já é "${sibling.rarity}", mais raro que "${rarity}" — a raridade deve crescer com o level.`;
    }
    if (sibling.level > level && siblingOrder < targetOrder) {
      return `Level ${sibling.level} é "${sibling.rarity}", menos raro que "${rarity}" — a raridade deve crescer com o level.`;
    }
  }

  return null;
}

export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const body = await request.json();
  const parsed = battlePassRewardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  }

  const season = await ensureActiveSeason();
  const { level, track, itemId, rarity } = parsed.data;

  const error = await validateOrdering(season.id, track, level, itemId, rarity);
  if (error) {
    return NextResponse.json({ error }, { status: 422 });
  }

  const reward = await prisma.battlePassReward.create({
    data: { ...parsed.data, seasonId: season.id },
  });

  await logAudit({
    accountId: Number(session.user.id),
    action: "create",
    entity: "battle_pass_reward",
    entityId: reward.id,
    metadata: parsed.data,
  });

  return NextResponse.json({ reward }, { status: 201 });
}
