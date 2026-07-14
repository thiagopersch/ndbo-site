import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { tilesetItemEntryFormSchema } from "@/lib/validations/admin/tileset";
import { tilesetItemEntryToFormInput } from "@/lib/tileset-mapper";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const entries = await prisma.tilesetItemEntry.findMany({
    where: { categoryId: Number(id) },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ entries: entries.map(tilesetItemEntryToFormInput) });
}

export async function POST(request: Request, { params }: Params) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const categoryId = Number(id);
  const body = await request.json();
  const parsed = tilesetItemEntryFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  }

  const category = await prisma.tilesetCategory.findUnique({ where: { id: categoryId }, select: { id: true, type: true } });
  if (!category) {
    return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });
  }
  if (category.type !== "ITEM") {
    return NextResponse.json({ error: "Só é possível adicionar entradas de item em categorias do tipo ITEM." }, { status: 422 });
  }

  const entry = await prisma.tilesetItemEntry.create({
    data: {
      categoryId,
      order: parsed.data.order,
      kind: parsed.data.kind,
      itemId: parsed.data.itemId,
      fromId: parsed.data.fromId,
      toId: parsed.data.toId,
    },
  });

  await logAudit({
    accountId: Number(session.user.id),
    action: "create",
    entity: "tileset_item_entry",
    entityId: entry.id,
    metadata: { categoryId, kind: entry.kind },
  });

  return NextResponse.json({ entry: tilesetItemEntryToFormInput(entry) }, { status: 201 });
}
