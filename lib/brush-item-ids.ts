import type { Border, Ground, WallBrush, DoodadBrush } from "@/lib/generated/prisma/client";
import type {
  AlternateInput,
  CarpetEntryInput,
  CompositeInput,
  ItemRefInput,
  TableSegmentInput,
} from "@/lib/validations/admin/doodad";
import type { WallSegmentInput } from "@/lib/validations/admin/wall";
import type { BorderEdgeItemInput } from "@/lib/validations/admin/border";

/**
 * Extrai, de cada tipo de brush, a lista "achatada" de item ids que ele realmente usa
 * (grama/tocos de um ground, item/porta de cada segmento de parede, etc.) — usada para
 * também listá-los como `<item id>` soltos na categoria de tileset a que o brush está
 * vinculado (além do `<brush name>`), sem exigir curadoria manual: a lista é sempre
 * recalculada a partir do que está configurado no CRUD do brush.
 */

function idsFromItems(items: ItemRefInput[] | undefined): number[] {
  return (items ?? []).map((item) => item.id);
}

function idsFromComposites(composites: CompositeInput[] | undefined): number[] {
  const ids: number[] = [];
  for (const composite of composites ?? []) {
    for (const tile of composite.tiles) {
      ids.push(...idsFromItems(tile.items));
    }
  }
  return ids;
}

function idsFromAlternates(alternates: AlternateInput[] | undefined): number[] {
  const ids: number[] = [];
  for (const alternate of alternates ?? []) {
    ids.push(...idsFromItems(alternate.items));
    ids.push(...idsFromComposites(alternate.composites));
  }
  return ids;
}

function idsFromWallSegments(walls: WallSegmentInput[] | undefined): number[] {
  const ids: number[] = [];
  for (const wall of walls ?? []) {
    ids.push(...idsFromItems(wall.items));
    for (const door of wall.doors ?? []) {
      ids.push(door.id);
    }
  }
  return ids;
}

function idsFromTables(tables: TableSegmentInput[] | undefined): number[] {
  const ids: number[] = [];
  for (const table of tables ?? []) ids.push(...idsFromItems(table.items));
  return ids;
}

function idsFromCarpets(carpets: CarpetEntryInput[] | undefined): number[] {
  return (carpets ?? []).map((carpet) => carpet.id);
}

/** Remove ids inválidos (0/negativos — slots vazios em campos de tamanho fixo, como
 * carpet) e duplicados, preservando a primeira ordem de aparição. */
function cleanIds(ids: number[]): number[] {
  return Array.from(new Set(ids.filter((id) => id > 0)));
}

export function groundItemIds(ground: Pick<Ground, "items">): number[] {
  return cleanIds(idsFromItems(ground.items as ItemRefInput[] | undefined));
}

export function wallItemIds(wall: Pick<WallBrush, "content">): number[] {
  const content = (wall.content ?? {}) as Record<string, unknown>;
  return cleanIds([
    ...idsFromWallSegments(content.walls as WallSegmentInput[] | undefined),
    ...idsFromItems(content.items as ItemRefInput[] | undefined),
    ...idsFromComposites(content.composites as CompositeInput[] | undefined),
    ...idsFromAlternates(content.alternates as AlternateInput[] | undefined),
  ]);
}

export function doodadItemIds(doodad: Pick<DoodadBrush, "content">): number[] {
  const content = (doodad.content ?? {}) as Record<string, unknown>;
  return cleanIds([
    ...idsFromItems(content.items as ItemRefInput[] | undefined),
    ...idsFromComposites(content.composites as CompositeInput[] | undefined),
    ...idsFromAlternates(content.alternates as AlternateInput[] | undefined),
    ...idsFromCarpets(content.carpets as CarpetEntryInput[] | undefined),
    ...idsFromWallSegments(content.walls as WallSegmentInput[] | undefined),
    ...idsFromTables(content.tables as TableSegmentInput[] | undefined),
  ]);
}

/** Ids de item usados pelos `<borderitem>` (um por `edge`) de um Border. */
export function borderItemIds(border: Pick<Border, "edges">): number[] {
  const edges = (border.edges as BorderEdgeItemInput[] | null) ?? [];
  return cleanIds(edges.map((edge) => edge.itemId));
}

/** Filtra `rows` (um scan completo da tabela, já que não dá pra buscar dentro de um JSON
 * aninhado direto no Prisma/MySQL) pelas que usam `searchId` em algum lugar do conteúdo —
 * usado pela busca por "id de item" nas listagens de Ground/Wall/Doodad/Border. */
export function idsWithItem<T extends { id: number }>(
  rows: T[],
  extractItemIds: (row: T) => number[],
  searchId: number
): number[] {
  return rows.filter((row) => extractItemIds(row).includes(searchId)).map((row) => row.id);
}
