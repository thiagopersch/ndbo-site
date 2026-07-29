import dayjs from "dayjs";

import { prisma } from "@/lib/prisma";
import { BAN_TYPES } from "@/lib/validations/admin/ban";
import { SLOT_TYPES, WEAPON_TYPES } from "@/lib/validations/admin/item";

const TREND_DAYS = 30;

function percentChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

function accountGroupLabel(groupId: number): string {
  if (groupId === 1) return "Jogador";
  if (groupId === 2) return "Tutor";
  if (groupId === 6) return "Admin master";
  if (groupId >= 3) return "GM/Admin";
  return "Outro";
}

function bucketByDay(dates: Date[]): Record<string, number> {
  const buckets: Record<string, number> = {};
  for (const date of dates) {
    const key = dayjs(date).format("YYYY-MM-DD");
    buckets[key] = (buckets[key] ?? 0) + 1;
  }
  return buckets;
}

export type DashboardStats = Awaited<ReturnType<typeof getDashboardStats>>;

export async function getDashboardStats() {
  const now = dayjs();
  const since30 = now.subtract(TREND_DAYS, "day").startOf("day").toDate();
  const since7 = now.subtract(7, "day").toDate();
  const since14 = now.subtract(14, "day").toDate();
  const startOfToday = now.startOf("day").toDate();
  const endOfToday = now.endOf("day").toDate();

  const [
    totalAccounts,
    accountsLast7,
    accountsPrev7,
    latestAccounts,
    accountsByGroup,
    accountsCreatedRecent,

    totalPlayers,
    playersLast7,
    playersPrev7,
    latestPlayers,
    playersCreatedRecent,

    totalMonsters,
    monstersByCategory,

    itemsBySlotType,
    itemsByWeaponType,

    totalBans,
    activeBans,
    latestBans,
    bansByType,

    monsterBoostToday,

    openTickets,
    ticketsByStatus,

    vocationsByTypeClass,
    vocationsByTypeUniverse,
    vocationsByPremium,
  ] = await Promise.all([
    prisma.account.count(),
    prisma.account.count({ where: { createdAt: { gte: since7 } } }),
    prisma.account.count({
      where: { createdAt: { gte: since14, lt: since7 } },
    }),
    prisma.account.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, createdAt: true, groupId: true },
    }),
    prisma.account.groupBy({ by: ["groupId"], _count: { _all: true } }),
    prisma.account.findMany({
      where: { createdAt: { gte: since30 } },
      select: { createdAt: true },
    }),

    prisma.player.count({ where: { deleted: 0 } }),
    prisma.player.count({ where: { deleted: 0, createdAt: { gte: since7 } } }),
    prisma.player.count({
      where: { deleted: 0, createdAt: { gte: since14, lt: since7 } },
    }),
    prisma.player.findMany({
      where: { deleted: 0 },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, level: true, createdAt: true },
    }),
    prisma.player.findMany({
      where: { deleted: 0, createdAt: { gte: since30 } },
      select: { createdAt: true },
    }),

    prisma.monster.count(),
    prisma.monster.groupBy({ by: ["category"], _count: { _all: true } }),

    prisma.item.groupBy({ by: ["slotType"], _count: { _all: true } }),
    prisma.item.groupBy({ by: ["weaponType"], _count: { _all: true } }),

    prisma.ban.count(),
    prisma.ban.count({ where: { active: true } }),
    prisma.ban.findMany({ orderBy: { added: "desc" }, take: 5 }),
    prisma.ban.groupBy({ by: ["type"], _count: { _all: true } }),

    prisma.monsterBoost.findFirst({
      where: { date: { gte: startOfToday, lte: endOfToday } },
      orderBy: { id: "desc" },
    }),

    prisma.ticket.count({ where: { status: "open" } }),
    prisma.ticket.groupBy({ by: ["status"], _count: { _all: true } }),

    prisma.vocation.groupBy({ by: ["typeClassId"], _count: { _all: true } }),
    prisma.vocation.groupBy({ by: ["typeUniverseId"], _count: { _all: true } }),
    prisma.vocation.groupBy({ by: ["needpremium"], _count: { _all: true } }),
  ]);

  const monsterBoostTodayMonster = monsterBoostToday
    ? await prisma.monster.findUnique({
        where: { name: monsterBoostToday.monster },
        select: { id: true },
      })
    : null;
  const monsterBoostTodayImage = monsterBoostTodayMonster
    ? await prisma.entityImage.findUnique({
        where: {
          entityType_entityId: {
            entityType: "monster",
            entityId: monsterBoostTodayMonster.id,
          },
        },
        select: { extension: true, updatedAt: true },
      })
    : null;

  const accountBuckets = bucketByDay(
    accountsCreatedRecent.map((row) => row.createdAt),
  );
  const playerBuckets = bucketByDay(
    playersCreatedRecent.map((row) => row.createdAt),
  );

  const createdTrend = Array.from({ length: TREND_DAYS }, (_, index) => {
    const day = now.subtract(TREND_DAYS - 1 - index, "day");
    const key = day.format("YYYY-MM-DD");
    return {
      date: key,
      label: day.format("DD/MM"),
      contas: accountBuckets[key] ?? 0,
      players: playerBuckets[key] ?? 0,
    };
  });

  const groupLabelTotals = new Map<string, number>();
  for (const row of accountsByGroup) {
    const label = accountGroupLabel(row.groupId);
    groupLabelTotals.set(
      label,
      (groupLabelTotals.get(label) ?? 0) + row._count._all,
    );
  }
  const accountsByGroupChart = Array.from(
    groupLabelTotals,
    ([label, total]) => ({ label, total }),
  );

  const banTypeLabelOf = (type: number) =>
    BAN_TYPES.find((t) => t.value === type)?.label ?? `Tipo ${type}`;
  const bansByTypeChart = bansByType.map((row) => ({
    label: banTypeLabelOf(row.type),
    total: row._count._all,
  }));

  // Quantidade de items por slot (head/body/legs/...) + por weapon type (sword/axe/...)
  // num único gráfico — um item pode contar em ambos (ex.: uma espada tem slotType="hand"
  // e weaponType="sword"), cada eixo é uma classificação independente do item.
  const slotTypeTotals = new Map(itemsBySlotType.map((row) => [row.slotType, row._count._all]));
  const weaponTypeTotals = new Map(itemsByWeaponType.map((row) => [row.weaponType, row._count._all]));
  const itemsByTypeChart = [
    ...SLOT_TYPES.filter(Boolean).map((slot) => ({ label: slot, total: slotTypeTotals.get(slot) ?? 0 })),
    ...WEAPON_TYPES.filter(Boolean).map((weapon) => ({ label: weapon, total: weaponTypeTotals.get(weapon) ?? 0 })),
  ];

  const monstersByCategoryChart = monstersByCategory
    .map((row) => ({
      label: row.category || "Sem universo",
      total: row._count._all,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const ticketStatusLabels: Record<string, string> = {
    open: "Aberto",
    answered: "Respondido",
    closed: "Fechado",
  };
  const ticketsByStatusChart = ticketsByStatus.map((row) => ({
    label: ticketStatusLabels[row.status] ?? row.status,
    total: row._count._all,
  }));

  const [typeClasses, typeUniverses] = await Promise.all([
    prisma.vocationTypeClass.findMany({ select: { id: true, name: true } }),
    prisma.vocationTypeUniverse.findMany({ select: { id: true, name: true } }),
  ]);
  const typeClassNameById = new Map(typeClasses.map((row) => [row.id, row.name]));
  const typeUniverseNameById = new Map(typeUniverses.map((row) => [row.id, row.name]));

  const vocationsByTypeClassChart = vocationsByTypeClass.map((row) => ({
    label: row.typeClassId != null ? (typeClassNameById.get(row.typeClassId) ?? "Sem classe") : "Sem classe",
    total: row._count._all,
  }));
  const vocationsByTypeUniverseChart = vocationsByTypeUniverse.map((row) => ({
    label:
      row.typeUniverseId != null
        ? (typeUniverseNameById.get(row.typeUniverseId) ?? "Sem universo")
        : "Sem universo",
    total: row._count._all,
  }));
  const vocationsByPremiumChart = vocationsByPremium.map((row) => ({
    label: row.needpremium ? "Premium" : "Free",
    total: row._count._all,
  }));

  return {
    accounts: {
      total: totalAccounts,
      last7: accountsLast7,
      delta: accountsLast7 - accountsPrev7,
      percent: percentChange(accountsLast7, accountsPrev7),
      latest: latestAccounts,
      byGroup: accountsByGroupChart,
    },
    players: {
      total: totalPlayers,
      last7: playersLast7,
      delta: playersLast7 - playersPrev7,
      percent: percentChange(playersLast7, playersPrev7),
      latest: latestPlayers,
    },
    monsters: {
      total: totalMonsters,
      byCategory: monstersByCategoryChart,
    },
    items: {
      byType: itemsByTypeChart,
    },
    bans: {
      total: totalBans,
      active: activeBans,
      latest: latestBans,
      byType: bansByTypeChart,
    },
    monsterBoostToday: monsterBoostToday
      ? {
          ...monsterBoostToday,
          monsterId: monsterBoostTodayMonster?.id ?? null,
          image: monsterBoostTodayImage,
        }
      : null,
    tickets: {
      open: openTickets,
      byStatus: ticketsByStatusChart,
    },
    vocations: {
      byTypeClass: vocationsByTypeClassChart,
      byTypeUniverse: vocationsByTypeUniverseChart,
      byPremium: vocationsByPremiumChart,
    },
    createdTrend,
  };
}
