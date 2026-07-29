import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { ensureActiveSeason } from "@/lib/battle-pass-season";
import { battlePassSeasonSchema } from "@/lib/validations/admin/battle-pass";

export async function GET() {
  const { response } = await requireAdminSession();
  if (response) return response;

  const season = await ensureActiveSeason();
  const full = await prisma.battlePassSeason.findUnique({
    where: { id: season.id },
    include: {
      missions: { orderBy: { id: "asc" } },
      rewards: { orderBy: [{ track: "asc" }, { level: "asc" }] },
    },
  });

  return NextResponse.json({ season: full });
}

export async function PATCH(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const body = await request.json();
  const parsed = battlePassSeasonSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  }

  const season = await ensureActiveSeason();
  const updated = await prisma.battlePassSeason.update({
    where: { id: season.id },
    data: parsed.data,
  });

  await logAudit({
    accountId: Number(session.user.id),
    action: "update",
    entity: "battle_pass_season",
    entityId: updated.id,
    metadata: parsed.data,
  });

  return NextResponse.json({ season: updated });
}
