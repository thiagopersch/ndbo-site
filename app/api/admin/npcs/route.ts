import { NextResponse } from "next/server";
import type { Prisma } from "@/lib/generated/prisma/client";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { buildPaginatedResult, parsePaginationParams } from "@/lib/pagination";
import { npcSchema } from "@/lib/validations/admin/npc";
import { writeNpcFiles } from "@/lib/npc-generator";

export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const url = new URL(request.url);
  const { page, pageSize, search } = parsePaginationParams(url);

  const where: Prisma.NpcWhereInput = search ? { name: { contains: search } } : {};

  const [npcs, total] = await Promise.all([
    prisma.npc.findMany({
      where,
      include: { script: true },
      orderBy: { id: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.npc.count({ where }),
  ]);

  return NextResponse.json(buildPaginatedResult(npcs, total, page, pageSize));
}

export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const body = await request.json();
  const parsed = npcSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  }

  const { shopItems, ...npcFields } = parsed.data;

  const npc = await prisma.npc.create({
    data: {
      ...npcFields,
      shopItems: shopItems.filter((item) => item.direction && item.itemId) as unknown as Prisma.InputJsonValue,
    },
  });

  try {
    await writeNpcFiles(parsed.data);
  } catch (error) {
    return NextResponse.json(
      { npc, warning: `NPC salvo no banco, mas falhou ao gravar os arquivos: ${String(error)}` },
      { status: 201 },
    );
  }

  await logAudit({
    accountId: Number(session.user.id),
    action: "create",
    entity: "npc",
    entityId: npc.id,
    metadata: { name: npc.name, type: npc.type },
  });

  return NextResponse.json({ npc }, { status: 201 });
}
