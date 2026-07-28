"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ExternalLink, GripVertical } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type BrushType = "ground" | "wall" | "doodad";
type BrushRef = { id: number; name: string; tilesetOrder: number };
type CombinedBrush = { type: BrushType; id: number; name: string };

const TYPE_LABELS: Record<BrushType, string> = {
  ground: "Ground",
  wall: "Wall",
  doodad: "Doodad",
};

const TYPE_HREF: Record<BrushType, (id: number) => string> = {
  ground: (id) => `/admin/grounds/${id}`,
  wall: (id) => `/admin/walls/${id}`,
  doodad: (id) => `/admin/doodads/${id}`,
};

/** Junta os 3 tipos de brush numa única lista ordenada por `tilesetOrder` — com o
 * mesmo desempate (ground, wall, doodad) usado em `tilesetCategoryToXmlCategory` ao
 * concatenar os arrays, para o que aparece aqui bater com o que sai no XML. */
function mergeBrushes(grounds: BrushRef[], walls: BrushRef[], doodads: BrushRef[]): CombinedBrush[] {
  const tagged = [
    ...grounds.map((b) => ({ type: "ground" as const, ...b, typeRank: 0 })),
    ...walls.map((b) => ({ type: "wall" as const, ...b, typeRank: 1 })),
    ...doodads.map((b) => ({ type: "doodad" as const, ...b, typeRank: 2 })),
  ];

  return tagged
    .sort((a, b) => a.tilesetOrder - b.tilesetOrder || a.typeRank - b.typeRank)
    .map(({ type, id, name }) => ({ type, id, name }));
}

function sameOrder(a: CombinedBrush[], b: CombinedBrush[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((brush, index) => brush.type === b[index].type && brush.id === b[index].id);
}

/** Tile compacto (não uma linha inteira) — a lista inteira flui horizontalmente, tantos
 * tiles quanto couberem por linha, indo para a linha de baixo quando não couber mais
 * (como uma grade numerada 1..N), em vez de uma coluna vertical única. */
function SortableBrushTile({ brush, index }: { brush: CombinedBrush; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${brush.type}-${brush.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex w-40 shrink-0 flex-col gap-1 rounded-md border bg-card p-2"
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </button>
        <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
        <Badge variant="outline" className="ml-auto shrink-0 text-[10px]">
          {TYPE_LABELS[brush.type]}
        </Badge>
      </div>
      <Link
        href={TYPE_HREF[brush.type](brush.id)}
        className="flex min-w-0 items-center gap-1 truncate text-xs text-primary hover:underline"
      >
        <span className="truncate">{brush.name}</span>
        <ExternalLink className="size-3 shrink-0" />
      </Link>
    </li>
  );
}

type CategoryBrushOrderListProps = {
  categoryId: number;
  grounds: BrushRef[];
  walls: BrushRef[];
  doodads: BrushRef[];
  /** Chamado depois que a nova ordem é salva com sucesso — para revalidar os dados. */
  onSaved: () => void;
  /** Reflete se há uma reordenação arrastada ainda não salva — o dialog usa isso para
   * bloquear o fechamento ao clicar fora enquanto houver alteração pendente. */
  onDirtyChange?: (dirty: boolean) => void;
};

/** Lista arrastável dos brushes vinculados a uma categoria. A ordem só é persistida
 * (em `tilesetOrder` de cada Ground/WallBrush/DoodadBrush) quando o admin clica em
 * "Salvar ordem" — arrastar só reordena localmente, evitando um PATCH a cada solta.
 * Essa ordem salva é a que sai tanto ao exportar quanto ao copiar o XML do tileset.
 *
 * O componente é montado com `key={categoryId}` pelo chamador — trocar de categoria
 * remonta e descarta qualquer reordenação local não salva, em vez de sincronizar via
 * efeito. */
export function CategoryBrushOrderList({
  categoryId,
  grounds,
  walls,
  doodads,
  onSaved,
  onDirtyChange,
}: CategoryBrushOrderListProps) {
  const serverItems = mergeBrushes(grounds, walls, doodads);
  const [localItems, setLocalItems] = useState<CombinedBrush[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const items = localItems ?? serverItems;
  // Uma vez salvo, `localItems` continua igual ao que acabou de ser persistido — então
  // volta a "não sujo" assim que `serverItems` alcançar essa mesma ordem (após o
  // refetch disparado por `onSaved`), sem precisar de um efeito para zerar o estado.
  const isDirty = localItems !== null && !sameOrder(localItems, serverItems);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((brush) => `${brush.type}-${brush.id}` === active.id);
    const newIndex = items.findIndex((brush) => `${brush.type}-${brush.id}` === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    setLocalItems(arrayMove(items, oldIndex, newIndex));
  }

  function handleDiscard() {
    setLocalItems(null);
  }

  async function handleSave() {
    setIsSaving(true);

    const response = await fetch(`/api/admin/tilesets/categories/${categoryId}/reorder-brushes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((brush, index) => ({ type: brush.type, id: brush.id, order: index })),
      }),
    });

    setIsSaving(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Não foi possível salvar a nova ordem dos brushes.");
      return;
    }

    toast.success("Ordem dos brushes salva.");
    onSaved();
  }

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((brush) => `${brush.type}-${brush.id}`)} strategy={rectSortingStrategy}>
          <ul className="flex flex-wrap gap-2">
            {items.map((brush, index) => (
              <SortableBrushTile key={`${brush.type}-${brush.id}`} brush={brush} index={index} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {isDirty && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <span>Ordem alterada — salve para valer na exportação/cópia do XML.</span>
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={handleDiscard} disabled={isSaving}>
              Descartar
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar ordem"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
