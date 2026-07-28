import { NextResponse } from "next/server";
import type { Prisma } from "@/lib/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { Prisma as PrismaNS } from "@/lib/generated/prisma/client";
import { buildPaginatedResult, parsePaginationParams } from "@/lib/pagination";
import {
  ACCOUNT_MANAGER_NAME,
  PUBLIC_LISTING_GROUP_ID_LIMIT,
  publicPlayerVisibilityWhere,
} from "@/lib/public-player-visibility";

/** `skill_t` clássico do OTServer (`src/creature.h`/`player.h` upstream) — ordem usada
 * pela coluna `skillid` de `player_skills`. Não há constante equivalente no projeto
 * porque nenhuma outra tela lê essa tabela ainda; esta é a primeira. */
const SKILL_IDS: Record<string, number> = {
  fist: 0,
  club: 1,
  sword: 2,
  axe: 3,
  distance: 4,
  shielding: 5,
  fishing: 6,
};

/** Colunas simples do próprio `players` (sem precisar de join) que também podem ser
 * escolhidas como critério de ranking. */
const SCALAR_SKILLS: Record<string, "level" | "maglevel" | "resets"> = {
  level: "level",
  maglevel: "maglevel",
  resets: "resets",
};

type RankingRow = {
  id: number;
  name: string;
  vocation: number;
  experience: bigint;
  online: number;
  /** Vem como `bigint` quando é resultado de `COALESCE()`/agregação no MariaDB (branch
   * de skill via join) e como `number` já convertido no branch de coluna simples do
   * Prisma — sempre normalizado com `Number()` antes de sair na resposta. */
  rankValue: number | bigint;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { page, pageSize, search } = parsePaginationParams(url);
  const skill = url.searchParams.get("skill") ?? "level";
  const skip = (page - 1) * pageSize;

  let rows: RankingRow[];
  let total: number;

  if (skill in SKILL_IDS) {
    const skillId = SKILL_IDS[skill];
    const searchClause = search ? PrismaNS.sql`AND p.name LIKE ${`%${search}%`}` : PrismaNS.empty;

    const [dataRows, countRows] = await Promise.all([
      prisma.$queryRaw<RankingRow[]>`
        SELECT p.id, p.name, p.vocation, p.experience, p.online,
               COALESCE(ps.value, 0) AS rankValue
        FROM players p
        JOIN accounts a ON a.id = p.account_id
        LEFT JOIN player_skills ps ON ps.player_id = p.id AND ps.skillid = ${skillId}
        WHERE p.deleted = 0 AND a.group_id < ${PUBLIC_LISTING_GROUP_ID_LIMIT} AND p.name != ${ACCOUNT_MANAGER_NAME} ${searchClause}
        ORDER BY rankValue DESC, p.experience DESC
        LIMIT ${pageSize} OFFSET ${skip}
      `,
      prisma.$queryRaw<{ total: bigint }[]>`
        SELECT COUNT(*) AS total
        FROM players p
        JOIN accounts a ON a.id = p.account_id
        WHERE p.deleted = 0 AND a.group_id < ${PUBLIC_LISTING_GROUP_ID_LIMIT} AND p.name != ${ACCOUNT_MANAGER_NAME} ${searchClause}
      `,
    ]);

    rows = dataRows;
    total = Number(countRows[0]?.total ?? 0);
  } else {
    const scalarField = SCALAR_SKILLS[skill] ?? "level";

    const where: Prisma.PlayerWhereInput = {
      deleted: 0,
      ...publicPlayerVisibilityWhere(),
      AND: search ? [{ name: { contains: search } }] : undefined,
    };

    const [players, playerTotal] = await Promise.all([
      prisma.player.findMany({
        where,
        orderBy: [{ [scalarField]: "desc" }, { experience: "desc" }],
        // Seleciona os 3 campos possíveis (em vez de uma chave computada) — uma
        // `select` com chave dinâmica confunde a inferência de tipo do Prisma (o
        // retorno vira uma união de todas as relações do model).
        select: {
          id: true,
          name: true,
          vocation: true,
          experience: true,
          online: true,
          level: true,
          maglevel: true,
          resets: true,
        },
        skip,
        take: pageSize,
      }),
      prisma.player.count({ where }),
    ]);

    rows = players.map((player) => ({
      id: player.id,
      name: player.name,
      vocation: player.vocation,
      experience: player.experience,
      online: player.online,
      rankValue: player[scalarField],
    }));
    total = playerTotal;
  }

  const vocationIds = [...new Set(rows.map((row) => row.vocation))];
  const vocations = vocationIds.length
    ? await prisma.vocation.findMany({ where: { id: { in: vocationIds } }, select: { id: true, name: true } })
    : [];
  const vocationNameById = new Map(vocations.map((vocation) => [vocation.id, vocation.name]));

  return NextResponse.json(
    buildPaginatedResult(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        vocationName: vocationNameById.get(row.vocation) ?? "Desconhecida",
        experience: row.experience.toString(),
        online: row.online,
        rankValue: Number(row.rankValue),
      })),
      total,
      page,
      pageSize
    )
  );
}
