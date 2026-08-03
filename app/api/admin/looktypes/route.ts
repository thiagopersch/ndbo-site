import { promises as fs } from "node:fs";

import { NextResponse } from "next/server";
import type { Prisma } from "@/lib/generated/prisma/client";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { buildPaginatedResult, parsePaginationParams } from "@/lib/pagination";
import { LOOKTYPE_CATEGORIES } from "@/lib/validations/admin/looktype";
import { MAX_IMAGE_BYTES, detectImageExtension } from "@/lib/entity-image";
import { looktypeFrameDirPath, looktypeFrameStoragePath } from "@/lib/looktype-storage";
import { ObdParseError, parseObd } from "@/lib/obd/obd-parser";
import { renderLooktypeFrames } from "@/lib/obd/obd-render";

const MAX_OBD_BYTES = 8 * 1024 * 1024;

export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const url = new URL(request.url);
  const { page, pageSize, search } = parsePaginationParams(url);

  const where: Prisma.LooktypeWhereInput = search
    ? {
        OR: [
          { name: { contains: search } },
          ...(Number.isInteger(Number(search)) ? [{ id: Number(search) }, { looktypeNumber: Number(search) }] : []),
        ],
      }
    : {};

  const [looktypes, total] = await Promise.all([
    prisma.looktype.findMany({
      where,
      orderBy: [{ category: "asc" }, { looktypeNumber: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.looktype.count({ where }),
  ]);

  return NextResponse.json(buildPaginatedResult(looktypes, total, page, pageSize));
}

/**
 * Cria a looktype e já processa o arquivo (imagem/gif/obd) numa única requisição multipart —
 * id é autoincrement, então só sabemos o diretório de frames depois do create.
 */
export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const formData = await request.formData();
  const file = formData.get("file");
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const looktypeNumberRaw = formData.get("looktypeNumber");
  const looktypeNumber = looktypeNumberRaw === null || looktypeNumberRaw === "" ? null : Number(looktypeNumberRaw);

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 422 });
  }
  if (!name) {
    return NextResponse.json({ error: "Informe um nome." }, { status: 422 });
  }
  if (!(LOOKTYPE_CATEGORIES as readonly string[]).includes(category)) {
    return NextResponse.json({ error: "Selecione o tipo (item/outfit/effect/missile)." }, { status: 422 });
  }
  if (category !== "item" && (looktypeNumber === null || !Number.isInteger(looktypeNumber) || looktypeNumber < 0)) {
    return NextResponse.json({ error: "Informe o número da sprite no Object Builder." }, { status: 422 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) {
    return NextResponse.json({ error: "Arquivo vazio." }, { status: 422 });
  }

  const imageExtension = detectImageExtension(buffer);

  let frames: { png: Buffer; durationMs: number }[];
  let width = 1;
  let height = 1;

  if (imageExtension) {
    if (buffer.length > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Imagem maior que 2MB." }, { status: 413 });
    }
    frames = [{ png: buffer, durationMs: 100 }];
  } else {
    if (buffer.length > MAX_OBD_BYTES) {
      return NextResponse.json({ error: "Arquivo OBD maior que 8MB." }, { status: 413 });
    }
    try {
      const thing = await parseObd(buffer);
      width = thing.width;
      height = thing.height;
      frames = renderLooktypeFrames(thing);
    } catch (error) {
      const message = error instanceof ObdParseError ? error.message : "Não foi possível interpretar o arquivo.";
      return NextResponse.json({ error: message }, { status: 422 });
    }
  }

  const looktype = await prisma.looktype.create({
    data: {
      name,
      category,
      looktypeNumber: category === "item" ? null : looktypeNumber,
      width,
      height,
      frameCount: 0,
      frameDurationsMs: [],
    },
  });

  const frameDir = looktypeFrameDirPath(looktype.id);
  await fs.mkdir(frameDir, { recursive: true });
  await Promise.all(
    frames.map((frame, index) => fs.writeFile(looktypeFrameStoragePath(looktype.id, index), frame.png)),
  );

  const updated = await prisma.looktype.update({
    where: { id: looktype.id },
    data: { frameCount: frames.length, frameDurationsMs: frames.map((frame) => frame.durationMs) },
  });

  await logAudit({
    accountId: Number(session.user.id),
    action: "create",
    entity: "looktype",
    entityId: updated.id,
    metadata: { category, looktypeNumber, frameCount: frames.length },
  });

  return NextResponse.json({ looktype: updated }, { status: 201 });
}
