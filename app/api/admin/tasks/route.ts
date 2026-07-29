import { NextResponse } from "next/server";
import type { Prisma, TaskDefinition } from "@/lib/generated/prisma/client";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { buildPaginatedResult, parsePaginationParams } from "@/lib/pagination";
import { taskDefinitionSchema, taskDefinitionInputToRow } from "@/lib/validations/admin/task-definition";
import { isTaskDifficulty } from "@/lib/task-difficulty";

type TaskMonster = { name: string; kills: number };
type TaskRewards = { items?: [number, number][] };

/** `monsters`/`rewards` são JSON (sem FK) — filtrar por monstro/item exige carregar as linhas
 * já filtradas pelas colunas reais e aplicar esses dois filtros em memória (ver comentário no
 * corpo do handler). Aceitável pro tamanho esperado desse catálogo (centenas de tasks, não
 * milhões) e evita `JSON_SEARCH`/`JSON_CONTAINS` cru só pra esse caso. */
function matchesMonsterFilter(row: TaskDefinition, monsterQuery: string): boolean {
  const monsters = (row.monsters as TaskMonster[] | null) ?? [];
  return monsters.some((monster) => monster.name.toLowerCase().includes(monsterQuery.toLowerCase()));
}

function matchesItemFilter(row: TaskDefinition, itemQuery: string, matchingItemIds: Set<number> | null): boolean {
  const items = ((row.rewards as TaskRewards | null)?.items ?? []) as [number, number][];
  const numericQuery = Number(itemQuery);
  if (Number.isInteger(numericQuery)) {
    if (items.some(([itemId]) => itemId === numericQuery)) return true;
  }
  if (matchingItemIds) {
    return items.some(([itemId]) => matchingItemIds.has(itemId));
  }
  return false;
}

export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const url = new URL(request.url);
  const { page, pageSize, search } = parsePaginationParams(url);

  const categoryId = url.searchParams.get("categoryId");
  const difficulty = url.searchParams.get("difficulty");
  const levelMin = url.searchParams.get("levelMin");
  const levelMax = url.searchParams.get("levelMax");
  const killsMin = url.searchParams.get("killsMin");
  const killsMax = url.searchParams.get("killsMax");
  const status = url.searchParams.get("status"); // "published" | "draft"
  const monsterQuery = url.searchParams.get("monster");
  const itemQuery = url.searchParams.get("item");

  const where: Prisma.TaskDefinitionWhereInput = {
    ...(search ? { OR: [{ name: { contains: search } }, { id: { contains: search } }] } : {}),
    ...(categoryId ? { categoryId: Number(categoryId) } : {}),
    ...(difficulty && isTaskDifficulty(difficulty) ? { difficulty } : {}),
    ...(status === "published" ? { published: true } : {}),
    ...(status === "draft" ? { published: false } : {}),
    ...(levelMin || levelMax
      ? { levelRequired: { ...(levelMin ? { gte: Number(levelMin) } : {}), ...(levelMax ? { lte: Number(levelMax) } : {}) } }
      : {}),
    ...(killsMin || killsMax
      ? { killsRequired: { ...(killsMin ? { gte: Number(killsMin) } : {}), ...(killsMax ? { lte: Number(killsMax) } : {}) } }
      : {}),
  };

  const needsInMemoryFilter = Boolean(monsterQuery || itemQuery);

  if (!needsInMemoryFilter) {
    const [entries, total] = await Promise.all([
      prisma.taskDefinition.findMany({
        where,
        orderBy: { levelRequired: "asc" },
        include: { categoryRef: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.taskDefinition.count({ where }),
    ]);
    return NextResponse.json(buildPaginatedResult(entries, total, page, pageSize));
  }

  const matchingItemIds = itemQuery && !Number.isInteger(Number(itemQuery))
    ? new Set(
        (await prisma.item.findMany({ where: { name: { contains: itemQuery } }, select: { id: true } })).map(
          (item) => item.id,
        ),
      )
    : null;

  const allMatching = await prisma.taskDefinition.findMany({
    where,
    orderBy: { levelRequired: "asc" },
    include: { categoryRef: true },
  });

  const filtered = allMatching.filter((row) => {
    if (monsterQuery && !matchesMonsterFilter(row, monsterQuery)) return false;
    if (itemQuery && !matchesItemFilter(row, itemQuery, matchingItemIds)) return false;
    return true;
  });

  const total = filtered.length;
  const entries = filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  return NextResponse.json(buildPaginatedResult(entries, total, page, pageSize));
}

export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const body = await request.json();
  const parsed = taskDefinitionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 422 },
    );
  }

  const existing = await prisma.taskDefinition.findUnique({ where: { id: parsed.data.id } });
  if (existing) {
    return NextResponse.json({ error: "Já existe uma task com esse identificador." }, { status: 409 });
  }

  const category = await prisma.category.findUnique({ where: { id: parsed.data.categoryId } });
  if (!category) {
    return NextResponse.json({ error: "Categoria não encontrada." }, { status: 422 });
  }

  const entry = await prisma.taskDefinition.create({ data: taskDefinitionInputToRow(parsed.data, category.name) });

  await logAudit({
    accountId: Number(session.user.id),
    action: "create",
    entity: "task_definition",
    entityId: entry.id,
    metadata: { name: entry.name },
  });

  return NextResponse.json({ entry }, { status: 201 });
}
