import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { tilesetToFormInput } from "@/lib/tileset-mapper";

type Params = { params: Promise<{ id: string }> };

/** Gera um nome único incrementando "(cópia)" / "(cópia 2)" / ... */
async function uniqueCopyName(baseName: string): Promise<string> {
  let candidate = `${baseName} (cópia)`;
  let attempt = 2;

  while (await prisma.tileset.findUnique({ where: { name: candidate }, select: { id: true } })) {
    candidate = `${baseName} (cópia ${attempt})`;
    attempt += 1;
  }

  return candidate;
}

/** Duplica o Tileset e suas categorias (nome/kind/type/ordem/descrição), sem copiar os
 * vínculos de brush (Ground/WallBrush/DoodadBrush) nem `TilesetItemEntry` — a cópia
 * nasce com categorias vazias, evitando duplicar brushes reais ou dados de item. */
export async function POST(_request: Request, { params }: Params) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const source = await prisma.tileset.findUnique({
    where: { id: Number(id) },
    include: { categories: { orderBy: { order: "asc" } } },
  });

  if (!source) {
    return NextResponse.json({ error: "Tileset não encontrado." }, { status: 404 });
  }

  const name = await uniqueCopyName(source.name);

  const tileset = await prisma.tileset.create({
    data: {
      name,
      description: source.description,
      order: source.order,
      active: source.active,
      icon: source.icon,
      categories: {
        create: source.categories.map((category) => ({
          name: category.name,
          kind: category.kind,
          type: category.type,
          order: category.order,
          description: category.description,
        })),
      },
    },
    include: { _count: { select: { categories: true } } },
  });

  await logAudit({
    accountId: Number(session.user.id),
    action: "duplicate",
    entity: "tileset",
    entityId: tileset.id,
    metadata: { sourceId: source.id, name: tileset.name },
  });

  return NextResponse.json({ tileset: { ...tilesetToFormInput(tileset), _count: tileset._count } }, { status: 201 });
}
