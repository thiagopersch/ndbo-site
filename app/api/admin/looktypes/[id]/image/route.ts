import { promises as fs } from "node:fs";

import { NextResponse } from "next/server";
import sharp from "sharp";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { MAX_IMAGE_BYTES, detectImageExtension } from "@/lib/entity-image";
import { looktypeFrameDirPath, looktypeFrameStoragePath } from "@/lib/looktype-storage";
import { ObdParseError, parseObd } from "@/lib/obd/obd-parser";
import { clampFrameDurationMs, renderLooktypeFrames, type RenderedLooktypeFrame } from "@/lib/obd/obd-render";

/** GIFs animados viram 1 PNG estático por página (`sharp` decodifica cada página/quadro do
 * GIF), cada um com a duração declarada no próprio GIF — sempre limitada a
 * `MAX_FRAME_DURATION_MS` (mesma regra do .obd, ver `obd-render.ts`) pra nenhum formato passar
 * quadros rápido demais na pré-visualização. PNG/JPG estáticos caem no branch de 1 página só. */
async function renderRasterFrames(buffer: Buffer): Promise<RenderedLooktypeFrame[]> {
  const metadata = await sharp(buffer, { animated: true }).metadata();
  const pageCount = metadata.pages ?? 1;

  if (pageCount <= 1) {
    const png = await sharp(buffer).png().toBuffer();
    return [{ png, durationMs: clampFrameDurationMs(100) }];
  }

  const delays = metadata.delay ?? [];
  const frames: RenderedLooktypeFrame[] = [];
  for (let page = 0; page < pageCount; page++) {
    const png = await sharp(buffer, { page, pages: 1 }).png().toBuffer();
    frames.push({ png, durationMs: clampFrameDurationMs(delays[page]) });
  }
  return frames;
}

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
  const frameSpeedMsRaw = formData.get("frameSpeedMs");
  const frameSpeedMs = frameSpeedMsRaw === null || frameSpeedMsRaw === "" ? null : Number(frameSpeedMsRaw);

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
    try {
      frames = await renderRasterFrames(buffer);
    } catch {
      return NextResponse.json({ error: "Não foi possível interpretar a imagem." }, { status: 422 });
    }
  } else {
    if (buffer.length > MAX_OBD_BYTES) {
      return NextResponse.json({ error: "Arquivo OBD maior que 8MB." }, { status: 413 });
    }
    try {
      const thing = await parseObd(buffer);
      width = thing.width;
      height = thing.height;
      frames = renderLooktypeFrames(thing, frameSpeedMs);
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
