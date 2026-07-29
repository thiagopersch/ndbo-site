import { prisma } from "@/lib/prisma";

/**
 * Retorna a temporada ativa do mês/ano atual, criando-a (clonando missões/recompensas da
 * temporada anterior mais recente, se houver) quando ainda não existe. Mesmo efeito da rotação
 * automática de meia-noite no servidor (ver globalevents/scripts/battle_pass_rotation.lua),
 * chamado aqui também para que o admin sempre tenha uma temporada para editar assim que o mês
 * vira, mesmo sem o jogo ter processado a rotação ainda.
 */
export async function ensureActiveSeason() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const existing = await prisma.battlePassSeason.findUnique({
    where: { month_year: { month, year } },
  });
  if (existing) return existing;

  const previous = await prisma.battlePassSeason.findFirst({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: { missions: true, rewards: true },
  });

  return prisma.$transaction(async (tx) => {
    await tx.battlePassSeason.updateMany({ data: { isActive: false } });

    const season = await tx.battlePassSeason.create({
      data: {
        month,
        year,
        isActive: true,
        maxLevel: previous?.maxLevel ?? 100,
        xpPerLevel: previous?.xpPerLevel ?? 1000,
        goldPassItemId: previous?.goldPassItemId ?? 0,
        goldPassCost: previous?.goldPassCost ?? 0,
      },
    });

    if (previous) {
      if (previous.missions.length > 0) {
        await tx.battlePassMission.createMany({
          data: previous.missions.map((m) => ({
            seasonId: season.id,
            type: m.type,
            target: m.target ?? undefined,
            description: m.description,
            xpReward: m.xpReward,
            published: m.published,
          })),
        });
      }
      if (previous.rewards.length > 0) {
        await tx.battlePassReward.createMany({
          data: previous.rewards.map((r) => ({
            seasonId: season.id,
            level: r.level,
            track: r.track,
            rarity: r.rarity,
            itemId: r.itemId,
            count: r.count,
          })),
        });
      }
    }

    return season;
  });
}
