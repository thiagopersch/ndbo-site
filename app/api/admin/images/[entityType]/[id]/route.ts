import { promises as fs } from "node:fs";
import path from "node:path";

import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import {
  MAX_IMAGE_BYTES,
  detectImageExtension,
  entityImageStoragePath,
  isEntityImageType,
  type EntityImageType,
} from "@/lib/entity-image";

type Params = { params: Promise<{ entityType: string; id: string }> };

async function entityExists(entityType: EntityImageType, id: number): Promise<boolean> {
  switch (entityType) {
    case "item":
      return (await prisma.item.findUnique({ where: { id }, select: { id: true } })) != null;
    case "monster":
      return (await prisma.monster.findUnique({ where: { id }, select: { id: true } })) != null;
    case "spell":
      return (await prisma.spell.findUnique({ where: { id }, select: { id: true } })) != null;
    case "vocation":
      return (await prisma.vocation.findUnique({ where: { id }, select: { id: true } })) != null;
  }
}

async function unlinkIfExists(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export async function POST(request: Request, { params }: Params) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const { entityType: rawEntityType, id: rawId } = await params;
  if (!isEntityImageType(rawEntityType)) {
    return NextResponse.json({ error: "Tipo de entidade inválido." }, { status: 400 });
  }
  const entityType = rawEntityType;
  const entityId = Number(rawId);
  if (!Number.isInteger(entityId)) {
    return NextResponse.json({ error: "Id inválido." }, { status: 400 });
  }

  if (!(await entityExists(entityType, entityId))) {
    return NextResponse.json({ error: "Entidade não encontrada." }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 422 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) {
    return NextResponse.json({ error: "Arquivo vazio." }, { status: 422 });
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Imagem maior que 2MB." }, { status: 413 });
  }

  const extension = detectImageExtension(buffer);
  if (!extension) {
    return NextResponse.json({ error: "Formato inválido — envie um PNG ou GIF." }, { status: 422 });
  }

  const existing = await prisma.entityImage.findUnique({
    where: { entityType_entityId: { entityType, entityId } },
  });
  if (existing && existing.extension !== extension) {
    await unlinkIfExists(entityImageStoragePath(entityType, entityId, existing.extension));
  }

  const storagePath = entityImageStoragePath(entityType, entityId, extension);
  await fs.mkdir(path.dirname(storagePath), { recursive: true });
  await fs.writeFile(storagePath, buffer);

  const image = await prisma.entityImage.upsert({
    where: { entityType_entityId: { entityType, entityId } },
    update: { extension },
    create: { entityType, entityId, extension },
  });

  await logAudit({
    accountId: Number(session.user.id),
    action: "update",
    entity: "entity_image",
    entityId,
    metadata: { entityType, extension },
  });

  return NextResponse.json({
    image: { entityType, entityId, extension: image.extension, updatedAt: image.updatedAt },
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const { entityType: rawEntityType, id: rawId } = await params;
  if (!isEntityImageType(rawEntityType)) {
    return NextResponse.json({ error: "Tipo de entidade inválido." }, { status: 400 });
  }
  const entityType = rawEntityType;
  const entityId = Number(rawId);
  if (!Number.isInteger(entityId)) {
    return NextResponse.json({ error: "Id inválido." }, { status: 400 });
  }

  const existing = await prisma.entityImage.findUnique({
    where: { entityType_entityId: { entityType, entityId } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Esta entidade não tem imagem." }, { status: 404 });
  }

  await unlinkIfExists(entityImageStoragePath(entityType, entityId, existing.extension));
  await prisma.entityImage.delete({ where: { entityType_entityId: { entityType, entityId } } });

  await logAudit({
    accountId: Number(session.user.id),
    action: "delete",
    entity: "entity_image",
    entityId,
    metadata: { entityType },
  });

  return NextResponse.json({ success: true });
}
