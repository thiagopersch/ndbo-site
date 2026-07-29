import { promises as fs } from "node:fs";

import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { MAX_IMAGE_BYTES, detectImageExtension } from "@/lib/entity-image";
import { looktypeFrameDirPath, looktypeFrameStoragePath } from "@/lib/looktype-storage";
import { ObdParseError, parseObd } from "@/lib/obd/obd-parser";
import { renderLooktypeFrames } from "@/lib/obd/obd-render";

type Params = { params: Promise<{ id: string }> };

const MAX_OBD_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request, { params }: Params) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const { id: rawId } = await params;
  const looktypeId = Number(rawId);
  if (!Number.isInteger(looktypeId)) {
    return NextResponse.json({ error: "Id inválido." }, { status: 400 });
  }

  const looktype = await prisma.looktype.findUnique({ where: { id: looktypeId } });
  if (!looktype) {
    return NextResponse.json({ error: "Looktype não encontrada." }, { status: 404 });
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

  const frameDir = looktypeFrameDirPath(looktypeId);
  await fs.rm(frameDir, { recursive: true, force: true });
  await fs.mkdir(frameDir, { recursive: true });

  await Promise.all(
    frames.map((frame, index) => fs.writeFile(looktypeFrameStoragePath(looktypeId, index), frame.png))
  );

  const updated = await prisma.looktype.update({
    where: { id: looktypeId },
    data: {
      width,
      height,
      frameCount: frames.length,
      frameDurationsMs: frames.map((frame) => frame.durationMs),
    },
  });

  await logAudit({
    accountId: Number(session.user.id),
    action: "update",
    entity: "looktype",
    entityId: looktypeId,
    metadata: { image: true, frameCount: frames.length },
  });

  return NextResponse.json({ looktype: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const { id: rawId } = await params;
  const looktypeId = Number(rawId);
  if (!Number.isInteger(looktypeId)) {
    return NextResponse.json({ error: "Id inválido." }, { status: 400 });
  }

  await fs.rm(looktypeFrameDirPath(looktypeId), { recursive: true, force: true });

  const updated = await prisma.looktype.update({
    where: { id: looktypeId },
    data: { width: 1, height: 1, frameCount: 0, frameDurationsMs: [] },
  });

  await logAudit({
    accountId: Number(session.user.id),
    action: "delete",
    entity: "looktype",
    entityId: looktypeId,
    metadata: { image: true },
  });

  return NextResponse.json({ looktype: updated });
}
