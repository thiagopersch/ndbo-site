import { PNG } from "pngjs";

import { getObdSpriteIndex, type ObdThingData } from "@/lib/obd/obd-parser";

const SPRITE_SIZE = 32;

/** Direções na ordem usada pelo `.dat`/protocolo do Tibia (mesma da constante de direção de
 * movimento): 0=North, 1=East, 2=South, 3=West. Só relevante pra `category === "outfit"`. */
const SOUTH_DIRECTION_INDEX = 2;

/** Um sprite ARGB (4 bytes/pixel: A,R,G,B — formato do `BitmapData.getPixels/setPixels` do
 * Flash usado pelo Object Builder) vira RGBA (ordem que `pngjs` espera). */
function argbToRgba(argb: Buffer): Buffer {
  const rgba = Buffer.alloc(argb.length);
  for (let i = 0; i < argb.length; i += 4) {
    rgba[i] = argb[i + 1]; // R
    rgba[i + 1] = argb[i + 2]; // G
    rgba[i + 2] = argb[i + 3]; // B
    rgba[i + 3] = argb[i]; // A
  }
  return rgba;
}

/** Monta um frame completo (todos os tiles de `width`x`height`) em um único buffer RGBA.
 * Convenção do Tibia pra objetos multi-tile: o tile (w=0,h=0) é o canto inferior-direito da
 * imagem final — os demais se estendem pra cima e pra esquerda a partir dele. */
function composeFrame(
  thing: ObdThingData,
  selection: { layer: number; patternX: number; patternY: number; patternZ: number; frame: number }
): Buffer {
  const canvasWidth = thing.width * SPRITE_SIZE;
  const canvasHeight = thing.height * SPRITE_SIZE;
  const canvas = Buffer.alloc(canvasWidth * canvasHeight * 4);

  for (let h = 0; h < thing.height; h++) {
    for (let w = 0; w < thing.width; w++) {
      const index = getObdSpriteIndex(thing, { ...selection, width: w, height: h });
      const sprite = thing.sprites[index];
      if (!sprite) continue;

      const rgba = argbToRgba(sprite);
      const destX = (thing.width - 1 - w) * SPRITE_SIZE;
      const destY = (thing.height - 1 - h) * SPRITE_SIZE;

      for (let y = 0; y < SPRITE_SIZE; y++) {
        const srcRowStart = y * SPRITE_SIZE * 4;
        const destRowStart = ((destY + y) * canvasWidth + destX) * 4;
        rgba.copy(canvas, destRowStart, srcRowStart, srcRowStart + SPRITE_SIZE * 4);
      }
    }
  }

  return canvas;
}

export type RenderedLooktypeFrame = { png: Buffer; durationMs: number };

const DEFAULT_FRAME_DURATION_MS = 100;

/**
 * Renderiza as frames de animação de um `ThingData` já decodificado (ver `obd-parser.ts`):
 * - `outfit`: direção Sul parada (layer 0, sem addon/mount), iterando `frames` (animação de
 *   andar) — pedido do usuário ("quando for outfit deve ser animado andando para o sul").
 * - `item`/`effect`/`missile`: pattern (0,0,0), layer 0, iterando `frames`; duração de cada
 *   frame vem do OBD quando presente (`frameDurations`), senão cai pra 100ms (pedido do
 *   usuário para os tipos sem duração explícita no formato).
 */
export function renderLooktypeFrames(thing: ObdThingData): RenderedLooktypeFrame[] {
  const patternX = thing.category === "outfit" && thing.patternX > SOUTH_DIRECTION_INDEX ? SOUTH_DIRECTION_INDEX : 0;

  const frames: RenderedLooktypeFrame[] = [];
  for (let frame = 0; frame < thing.frames; frame++) {
    const rgba = composeFrame(thing, { layer: 0, patternX, patternY: 0, patternZ: 0, frame });

    const png = new PNG({ width: thing.width * SPRITE_SIZE, height: thing.height * SPRITE_SIZE });
    rgba.copy(png.data);

    const duration = thing.frameDurations[frame];
    const durationMs = duration ? Math.max(duration.minimum, 1) : DEFAULT_FRAME_DURATION_MS;

    frames.push({ png: PNG.sync.write(png), durationMs });
  }

  return frames;
}
