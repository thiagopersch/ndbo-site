import path from "node:path";

/** Frames ficam em `public/storage/looktypes/{id}/{frameIndex}.png`, servidos estaticamente
 * pelo Next (mesmo esquema/limitação de volume persistente descrita em `lib/entity-image.ts`). */
export function looktypeFrameStoragePath(looktypeId: number, frameIndex: number): string {
  return path.join(process.cwd(), "public", "storage", "looktypes", String(looktypeId), `${frameIndex}.png`);
}

export function looktypeFrameDirPath(looktypeId: number): string {
  return path.join(process.cwd(), "public", "storage", "looktypes", String(looktypeId));
}

export function looktypeFrameUrl(looktypeId: number, frameIndex: number, updatedAt: Date): string {
  return `/storage/looktypes/${looktypeId}/${frameIndex}.png?v=${updatedAt.getTime()}`;
}
