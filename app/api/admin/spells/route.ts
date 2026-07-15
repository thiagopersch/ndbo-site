import { NextResponse } from "next/server";
import type { Prisma } from "@/lib/generated/prisma/client";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { buildPaginatedResult, parsePaginationParams } from "@/lib/pagination";
import { spellFormSchema } from "@/lib/validations/admin/spell";
import { spellFormToScalarData } from "@/lib/spell-mapper";

export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const url = new URL(request.url);
  const { page, pageSize, search } = parsePaginationParams(url);
  const kind = url.searchParams.get("kind");
  const level = url.searchParams.get("level");
  const groups = (url.searchParams.get("group") ?? "").split(",").filter(Boolean);
  const vocationIds = (url.searchParams.get("vocationIds") ?? "")
    .split(",")
    .filter(Boolean)
    .map(Number)
    .filter((id) => Number.isFinite(id));

  const where: Prisma.SpellWhereInput = {
    ...(search ? { name: { contains: search } } : {}),
    ...(kind ? { kind } : {}),
    ...(level ? { level: Number(level) } : {}),
    ...(groups.length ? { OR: groups.map((group) => ({ group: { contains: group } })) } : {}),
    ...(vocationIds.length ? { vocations: { some: { vocationId: { in: vocationIds } } } } : {}),
  };

  const [spells, total] = await Promise.all([
    prisma.spell.findMany({
      where,
      orderBy: { id: "asc" },
      select: {
        id: true,
        kind: true,
        name: true,
        words: true,
        runeItemId: true,
        level: true,
        mana: true,
        _count: { select: { vocations: true } },
        vocations: {
          select: { vocation: { select: { name: true } } },
          orderBy: { vocation: { name: "asc" } },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.spell.count({ where }),
  ]);

  return NextResponse.json(buildPaginatedResult(spells, total, page, pageSize));
}

export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const body = await request.json();
  const parsed = spellFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  }

  const spell = await prisma.spell.create({
    data: {
      ...spellFormToScalarData(parsed.data),
      vocations: {
        create: parsed.data.vocations.map((vocation) => ({
          vocationId: vocation.vocationId,
          showInDescription: vocation.showInDescription,
        })),
      },
    },
  });

  await logAudit({
    accountId: Number(session.user.id),
    action: "create",
    entity: "spell",
    entityId: spell.id,
    metadata: { name: spell.name, kind: spell.kind },
  });

  return NextResponse.json({ spell }, { status: 201 });
}
