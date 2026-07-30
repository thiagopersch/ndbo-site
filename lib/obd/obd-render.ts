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

/** Compõe (alpha-blend, "over") o pixel de origem sobre o destino — usado pra empilhar layers
 * (ex.: em items com `layers > 1`, a layer 0 costuma ser a base/moldura estática e as layers
 * seguintes o conteúdo que realmente anima, como o preenchimento de uma barra). */
function blendOver(dest: Buffer, destOffset: number, src: Buffer, srcOffset: number): void {
  const srcAlphaByte = src[srcOffset + 3];
  if (srcAlphaByte === 0) return;

  if (srcAlphaByte === 255) {
    dest[destOffset] = src[srcOffset];
    dest[destOffset + 1] = src[srcOffset + 1];
    dest[destOffset + 2] = src[srcOffset + 2];
    dest[destOffset + 3] = 255;
    return;
  }

  const srcAlpha = srcAlphaByte / 255;
  const destAlpha = dest[destOffset + 3] / 255;
  const outAlpha = srcAlpha + destAlpha * (1 - srcAlpha);

  for (let channel = 0; channel < 3; channel++) {
    const blended = src[srcOffset + channel] * srcAlpha + dest[destOffset + channel] * destAlpha * (1 - srcAlpha);
    dest[destOffset + channel] = outAlpha > 0 ? Math.round(blended / outAlpha) : 0;
  }
  dest[destOffset + 3] = Math.round(outAlpha * 255);
}

/** Monta um frame completo (todos os tiles de `width`x`height`, com todas as `layerCount`
 * layers empilhadas) em um único buffer RGBA. Convenção do Tibia pra objetos multi-tile: o
 * tile (w=0,h=0) é o canto inferior-direito da imagem final — os demais se estendem pra cima
 * e pra esquerda a partir dele. */
function composeFrame(
  thing: ObdThingData,
  selection: { patternX: number; patternY: number; patternZ: number; frame: number },
  layerCount: number
): Buffer {
  const canvasWidth = thing.width * SPRITE_SIZE;
  const canvasHeight = thing.height * SPRITE_SIZE;
  const canvas = Buffer.alloc(canvasWidth * canvasHeight * 4);

  for (let layer = 0; layer < layerCount; layer++) {
    for (let h = 0; h < thing.height; h++) {
      for (let w = 0; w < thing.width; w++) {
        const index = getObdSpriteIndex(thing, { ...selection, layer, width: w, height: h });
        const sprite = thing.sprites[index];
        if (!sprite) continue;

        const rgba = argbToRgba(sprite);
        const destX = (thing.width - 1 - w) * SPRITE_SIZE;
        const destY = (thing.height - 1 - h) * SPRITE_SIZE;

        for (let y = 0; y < SPRITE_SIZE; y++) {
          for (let x = 0; x < SPRITE_SIZE; x++) {
            const srcOffset = (y * SPRITE_SIZE + x) * 4;
            const destOffset = ((destY + y) * canvasWidth + (destX + x)) * 4;
            blendOver(canvas, destOffset, rgba, srcOffset);
          }
        }
      }
    }
  }

  return canvas;
}

export type RenderedLooktypeFrame = { png: Buffer; durationMs: number };

const DEFAULT_FRAME_DURATION_MS = 100;

/**
 * Renderiza as frames de animação de um `ThingData` já decodificado (ver `obd-parser.ts`):
 * - `outfit`: direção Sul parada (layer 0, sem addon/mount — layers > 0 em outfit são
 *   addon/mount, não fazem parte da animação), iterando `frames` (animação de andar) — pedido
 *   do usuário ("quando for outfit deve ser animado andando para o sul").
 * - `item`/`effect`/`missile`: pattern (0,0,0), empilhando todas as `layers` (quando `layers >
 *   1` a layer 0 costuma ser a base/moldura estática e as seguintes o conteúdo que anima de
 *   fato — ex.: o preenchimento de uma barra), iterando `frames`; duração de cada frame vem do
 *   OBD quando presente (`frameDurations`), senão cai pra 100ms (pedido do usuário para os
 *   tipos sem duração explícita no formato).
 */
export function renderLooktypeFrames(thing: ObdThingData): RenderedLooktypeFrame[] {
  const patternX = thing.category === "outfit" && thing.patternX > SOUTH_DIRECTION_INDEX ? SOUTH_DIRECTION_INDEX : 0;
  const layerCount = thing.category === "outfit" ? 1 : thing.layers;

  const frames: RenderedLooktypeFrame[] = [];
  for (let frame = 0; frame < thing.frames; frame++) {
    const rgba = composeFrame(thing, { patternX, patternY: 0, patternZ: 0, frame }, layerCount);

    const png = new PNG({ width: thing.width * SPRITE_SIZE, height: thing.height * SPRITE_SIZE });
    rgba.copy(png.data);

    const duration = thing.frameDurations[frame];
    const durationMs = duration ? Math.max(duration.minimum, 1) : DEFAULT_FRAME_DURATION_MS;

    frames.push({ png: PNG.sync.write(png), durationMs });
  }

  return frames;
}
