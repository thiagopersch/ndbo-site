import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/**
 * Onde essa looktype está realmente usada — computado a partir de FKs reais (não mais uma tag
 * livre escolhida pelo admin). NPCs/Vocações/Items/Spells referenciam o id do registro
 * (`lookTypeId`); monstros ainda usam o número cru da aparência (`Monster.lookType`, mesmo
 * campo do monsters.xml), então casamos pelo `looktypeNumber` — só faz sentido quando a
 * categoria é "outfit" (é a única numeração que NPC/Vocação/Monstro compartilham).
 */
export async function GET(_request: Request, { params }: Params) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const looktypeId = Number(id);

  const looktype = await prisma.looktype.findUnique({ where: { id: looktypeId } });
  if (!looktype) {
    return NextResponse.json({ error: "Looktype não encontrada." }, { status: 404 });
  }

  const [npcs, vocations, monsters, items, spells] = await Promise.all([
    prisma.npc.findMany({ where: { lookTypeId: looktypeId }, select: { id: true, name: true } }),
    prisma.vocation.findMany({ where: { lookTypeId: looktypeId }, select: { id: true, name: true } }),
    looktype.category === "outfit" && looktype.looktypeNumber !== null
      ? prisma.monster.findMany({
          where: { lookType: looktype.looktypeNumber },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    prisma.item.findMany({ where: { lookTypeId: looktypeId }, select: { id: true, name: true } }),
    prisma.spell.findMany({ where: { lookTypeId: looktypeId }, select: { id: true, name: true } }),
  ]);

  return NextResponse.json({
    npcs,
    vocations,
    monsters,
    items,
    spells,
    total: npcs.length + vocations.length + monsters.length + items.length + spells.length,
  });
}
