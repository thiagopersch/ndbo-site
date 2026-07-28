import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * Contas de staff (GM e acima, `group_id >= 3`) e o player especial "Account Manager" não
 * devem aparecer em nenhuma listagem pública que jogadores navegam (ranking, home, últimas
 * mortes, quem está online, membros de guild). Isso NÃO se aplica à área `/account` do
 * próprio jogador — lá cada um sempre vê seus próprios personagens, seja qual for o group_id.
 */
export const PUBLIC_LISTING_GROUP_ID_LIMIT = 3;
export const ACCOUNT_MANAGER_NAME = "Account Manager";

/** Filtro Prisma reutilizável em `Player.where` direto ou dentro de uma relação
 * `player: {...}` (ex.: `PlayerDeath.where`), já que o shape é o mesmo `PlayerWhereInput`. */
export function publicPlayerVisibilityWhere(): Prisma.PlayerWhereInput {
  return {
    account: { groupId: { lt: PUBLIC_LISTING_GROUP_ID_LIMIT } },
    name: { not: ACCOUNT_MANAGER_NAME },
  };
}
