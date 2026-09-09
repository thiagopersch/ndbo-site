import { prisma } from "@/lib/prisma";

/** Mesmas 5 relações checadas por `GET /api/admin/looktypes/[id]/usage` — reaproveitado pelo
 * import de cliente (`lib/tibia-client/import-runner.ts`, pra decidir se um looktype existente
 * pode ser apagado/substituído ou precisa ser atualizado no lugar) e pela exclusão em massa
 * (`app/api/admin/looktypes/bulk-delete/route.ts`, pra nunca apagar algo que ainda está em uso). */
export async function isLooktypeLinked(looktypeId: number): Promise<boolean> {
  const linked = await findLinkedLooktypeIds([looktypeId]);
  return linked.has(looktypeId);
}

const CHUNK_SIZE = 2000;

/** Variante em lote de `isLooktypeLinked` — 5 queries por chunk de até `CHUNK_SIZE` ids (não 5
 * por id), essencial pra checar vínculo de milhares de looktypes de uma vez (reimport idempotente,
 * exclusão em massa) sem abrir uma query por id. */
export async function findLinkedLooktypeIds(looktypeIds: number[]): Promise<Set<number>> {
  const linked = new Set<number>();
  if (looktypeIds.length === 0) return linked;

  for (let i = 0; i < looktypeIds.length; i += CHUNK_SIZE) {
    const chunk = looktypeIds.slice(i, i + CHUNK_SIZE);
    const [npcs, vocations, monsters, items, spells] = await Promise.all([
      prisma.npc.findMany({ where: { lookTypeId: { in: chunk } }, select: { lookTypeId: true } }),
      prisma.vocation.findMany({ where: { lookTypeId: { in: chunk } }, select: { lookTypeId: true } }),
      prisma.monster.findMany({ where: { lookTypeId: { in: chunk } }, select: { lookTypeId: true } }),
      prisma.item.findMany({ where: { lookTypeId: { in: chunk } }, select: { lookTypeId: true } }),
      prisma.spell.findMany({ where: { lookTypeId: { in: chunk } }, select: { lookTypeId: true } }),
    ]);
    for (const rows of [npcs, vocations, monsters, items, spells]) {
      for (const row of rows) if (row.lookTypeId !== null) linked.add(row.lookTypeId);
    }
  }

  return linked;
}
