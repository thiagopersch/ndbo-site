import { NextResponse } from "next/server";
import type { Prisma } from "@/lib/generated/prisma/client";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { ensureActiveSeason } from "@/lib/battle-pass-season";
import { battlePassMissionSchema } from "@/lib/validations/admin/battle-pass";

export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const body = await request.json();
  const parsed = battlePassMissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  }

  const season = await ensureActiveSeason();
  const { target, ...rest } = parsed.data;
  const mission = await prisma.battlePassMission.create({
    data: { ...rest, seasonId: season.id, target: target as unknown as Prisma.InputJsonValue },
  });

  await logAudit({
    accountId: Number(session.user.id),
    action: "create",
    entity: "battle_pass_mission",
    entityId: mission.id,
    metadata: parsed.data,
  });

  return NextResponse.json({ mission }, { status: 201 });
}
