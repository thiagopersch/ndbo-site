import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { isEntityImageType } from "@/lib/entity-image";

type Params = { params: Promise<{ entityType: string }> };

const MAX_IDS = 500;

export async function GET(request: Request, { params }: Params) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { entityType: rawEntityType } = await params;
  if (!isEntityImageType(rawEntityType)) {
    return NextResponse.json({ error: "Tipo de entidade inválido." }, { status: 400 });
  }
  const entityType = rawEntityType;

  const url = new URL(request.url);
  const ids = (url.searchParams.get("ids") ?? "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value))
    .slice(0, MAX_IDS);

  if (ids.length === 0) {
    return NextResponse.json({ images: [] });
  }

  const images = await prisma.entityImage.findMany({
    where: { entityType, entityId: { in: ids } },
    select: { entityId: true, extension: true, updatedAt: true },
  });

  return NextResponse.json({ images });
}
