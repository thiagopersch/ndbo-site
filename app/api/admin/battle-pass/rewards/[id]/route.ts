import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { battlePassRewardSchema, RARITY_ORDER } from "@/lib/validations/admin/battle-pass";

type Params = { params: Promise<{ id: string }> };

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

export async function PATCH(request: Request, { params }: Params) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const body = await request.json();
  const parsed = battlePassRewardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  }

  const existing = await prisma.battlePassReward.findUnique({ where: { id: Number(id) } });
  if (!existing) {
    return NextResponse.json({ error: "Recompensa não encontrada." }, { status: 404 });
  }

  const { level, track, itemId, rarity } = parsed.data;
  const error = await validateOrdering(existing.seasonId, track, level, itemId, rarity, existing.id);
  if (error) {
    return NextResponse.json({ error }, { status: 422 });
  }

  const reward = await prisma.battlePassReward.update({
    where: { id: Number(id) },
    data: parsed.data,
  });

  await logAudit({
    accountId: Number(session.user.id),
    action: "update",
    entity: "battle_pass_reward",
    entityId: reward.id,
    metadata: parsed.data,
  });

  return NextResponse.json({ reward });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  await prisma.battlePassReward.delete({ where: { id: Number(id) } });

  await logAudit({
    accountId: Number(session.user.id),
    action: "delete",
    entity: "battle_pass_reward",
    entityId: id,
  });

  return NextResponse.json({ success: true });
}
