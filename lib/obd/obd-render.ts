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

/** Teto absoluto de duração por quadro na pré-visualização/preview salvo (requisito do admin:
 * nenhum formato — .obd, .png único ou .gif animado — pode exibir um quadro por mais de 1s). */
export const MAX_FRAME_DURATION_MS = 1000;

/** Aplica o teto de `MAX_FRAME_DURATION_MS`, com fallback pro default quando a duração de origem
 * for inválida (0, negativa ou ausente). */
export function clampFrameDurationMs(durationMs: number | undefined | null): number {
  if (!durationMs || durationMs <= 0) return DEFAULT_FRAME_DURATION_MS;
  return Math.min(durationMs, MAX_FRAME_DURATION_MS);
}

function toPngBuffer(thing: ObdThingData, rgba: Buffer): Buffer {
  const png = new PNG({ width: thing.width * SPRITE_SIZE, height: thing.height * SPRITE_SIZE });
  rgba.copy(png.data);
  return PNG.sync.write(png);
}

/**
 * Renderiza as frames de animação de um `ThingData` já decodificado (ver `obd-parser.ts`):
 * - `outfit`: direção Sul parada (layer 0, sem addon/mount — layers > 0 em outfit são
 *   addon/mount, não fazem parte da animação), iterando `frames` (animação de andar) — pedido
 *   do usuário ("quando for outfit deve ser animado andando para o sul"); duração sempre fixada
 *   em 100ms por quadro (ver `DEFAULT_FRAME_DURATION_MS` abaixo) — ignora a duração declarada no
 *   OBD de propósito: alguns arquivos importados (ex.: moedas com patterns) declaram durações
 *   bem menores, o que fazia a pré-visualização/animação passar rápido demais.
 * - `item`/`effect`/`missile`: empilha todas as `layers` (quando `layers > 1` a layer 0 costuma
 *   ser a base/moldura estática e as seguintes o conteúdo que anima de fato — ex.: o
 *   preenchimento de uma barra) e percorre TODAS as combinações de `frames`×`patternX`×
 *   `patternY`×`patternZ` como quadros da animação — muitos itens (ex.: pilhas de moeda) usam
 *   patterns em vez de frames de verdade pra ter variações visuais, e o pedido do usuário é que
 *   isso também apareça animado, sempre a 100ms por quadro independente do arquivo ter frames
 *   de animação "de verdade" ou só patterns.
 */
export function renderLooktypeFrames(thing: ObdThingData): RenderedLooktypeFrame[] {
  const frames: RenderedLooktypeFrame[] = [];

  if (thing.category === "outfit") {
    const patternX = thing.patternX > SOUTH_DIRECTION_INDEX ? SOUTH_DIRECTION_INDEX : 0;
    for (let frame = 0; frame < thing.frames; frame++) {
      const rgba = composeFrame(thing, { patternX, patternY: 0, patternZ: 0, frame }, 1);
      frames.push({ png: toPngBuffer(thing, rgba), durationMs: clampFrameDurationMs(DEFAULT_FRAME_DURATION_MS) });
    }
    return frames;
  }

  for (let frame = 0; frame < thing.frames; frame++) {
    for (let patternZ = 0; patternZ < thing.patternZ; patternZ++) {
      for (let patternY = 0; patternY < thing.patternY; patternY++) {
        for (let patternX = 0; patternX < thing.patternX; patternX++) {
          const rgba = composeFrame(thing, { patternX, patternY, patternZ, frame }, thing.layers);
          frames.push({ png: toPngBuffer(thing, rgba), durationMs: clampFrameDurationMs(DEFAULT_FRAME_DURATION_MS) });
        }
      }
    }
  }

  return frames;
}
