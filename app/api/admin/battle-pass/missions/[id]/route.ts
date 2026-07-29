import { NextResponse } from "next/server";
import type { Prisma } from "@/lib/generated/prisma/client";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { battlePassMissionSchema } from "@/lib/validations/admin/battle-pass";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const body = await request.json();
  const parsed = battlePassMissionSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  }

  const { target, ...rest } = parsed.data;
  const mission = await prisma.battlePassMission.update({
    where: { id: Number(id) },
    data: { ...rest, target: target as unknown as Prisma.InputJsonValue },
  });

  await logAudit({
    accountId: Number(session.user.id),
    action: "update",
    entity: "battle_pass_mission",
    entityId: mission.id,
    metadata: parsed.data,
  });

  return NextResponse.json({ mission });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  await prisma.battlePassMission.delete({ where: { id: Number(id) } });

  await logAudit({
    accountId: Number(session.user.id),
    action: "delete",
    entity: "battle_pass_mission",
    entityId: id,
  });

  return NextResponse.json({ success: true });
}
