import { NextResponse } from "next/server";
import type { Prisma } from "@/lib/generated/prisma/client";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { buildPaginatedResult, parsePaginationParams } from "@/lib/pagination";
import { borderFormSchema } from "@/lib/validations/admin/border";
import { borderItemIds, idsWithItem } from "@/lib/brush-item-ids";

/** Teto de segurança para `all=true` — bem acima do que `borders.xml` real chega a ter,
 * só para não deixar a query totalmente sem limite. */
const ALL_BORDERS_CAP = 2000;

export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const url = new URL(request.url);
  const { page, pageSize, search } = parsePaginationParams(url);
  // Usado pelo combobox "Border" do form de Ground: esse campo precisa da lista completa
  // para buscar/selecionar por nome ou id, não de uma página — o `pageSize` normal é
  // limitado a 200 (`paginationQuerySchema`), o que já cortou borders reais (havia mais
  // de 200 cadastrados) fora da lista.
  const all = url.searchParams.get("all") === "true";

  const searchId = search ? Number(search) : NaN;
  const isNumericSearch = search !== "" && Number.isFinite(searchId);

  // Busca por id de item: cada `edge` do border referencia um item (`borderitem`) — não dá
  // pra filtrar isso no banco (JSON aninhado), então varre a tabela em memória.
  let contentMatchIds: number[] = [];
  if (isNumericSearch) {
    const candidates = await prisma.border.findMany({ select: { id: true, edges: true } });
    contentMatchIds = idsWithItem(candidates, borderItemIds, searchId);
  }

  const where: Prisma.BorderWhereInput = search
    ? {
        OR: [
          { name: { contains: search } },
          ...(isNumericSearch ? [{ id: { in: contentMatchIds } }] : []),
        ],
      }
    : {};
  const skip = all ? 0 : (page - 1) * pageSize;
  const take = all ? ALL_BORDERS_CAP : pageSize;

  const [borders, total] = await Promise.all([
    prisma.border.findMany({
      where,
      orderBy: { id: "asc" },
      select: { id: true, name: true, group: true, optional: true },
      skip,
      take,
    }),
    prisma.border.count({ where }),
  ]);

  return NextResponse.json(
    all ? buildPaginatedResult(borders, total, 1, Math.max(total, 1)) : buildPaginatedResult(borders, total, page, pageSize)
  );
}

export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const body = await request.json();
  const parsed = borderFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  }

  const existing = await prisma.border.findUnique({ where: { id: parsed.data.id } });
  if (existing) {
    return NextResponse.json({ error: "Já existe um border com esse id." }, { status: 409 });
  }

  const border = await prisma.border.create({
    data: {
      id: parsed.data.id,
      name: parsed.data.name,
      group: parsed.data.group,
      optional: parsed.data.optional,
      edges: parsed.data.edges,
    },
  });

  await logAudit({
    accountId: Number(session.user.id),
    action: "create",
    entity: "border",
    entityId: border.id,
    metadata: { name: border.name },
  });

  return NextResponse.json({ border }, { status: 201 });
}
