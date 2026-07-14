"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { fetcher } from "@/lib/fetcher";
import type { TilesetItemEntryFormInput } from "@/lib/validations/admin/tileset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type EntryRow = TilesetItemEntryFormInput & { id: number };

export function CategoryItemEntriesEditor({ categoryId, onChanged }: { categoryId: number; onChanged: () => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const { data, mutate } = useSWR<{ entries: EntryRow[] }>(
    `/api/admin/tilesets/categories/${categoryId}/entries`,
    fetcher
  );
  const entries = data?.entries ?? [];

  const [kind, setKind] = useState<"ITEM_ID" | "ITEM_RANGE">("ITEM_ID");
  const [itemId, setItemId] = useState("");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAdd() {
    const payload: Partial<TilesetItemEntryFormInput> = {
      order: entries.length,
      kind,
      itemId: kind === "ITEM_ID" ? Number(itemId) : null,
      fromId: kind === "ITEM_RANGE" ? Number(fromId) : null,
      toId: kind === "ITEM_RANGE" ? Number(toId) : null,
    };

    setIsSubmitting(true);
    const response = await fetch(`/api/admin/tilesets/categories/${categoryId}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setIsSubmitting(false);
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      toast.error(body?.error ?? "Não foi possível adicionar a entrada.");
      return;
    }

    setItemId("");
    setFromId("");
    setToId("");
    mutate();
    onChanged();
  }

  async function handleDelete(entryId: number) {
    const response = await fetch(`/api/admin/tilesets/categories/${categoryId}/entries/${entryId}`, {
      method: "DELETE",
    });
    if (!response.ok) toast.error("Não foi possível remover a entrada.");
    mutate();
    onChanged();
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = entries.findIndex((e) => e.id === active.id);
    const newIndex = entries.findIndex((e) => e.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(entries, oldIndex, newIndex);
    mutate({ entries: reordered }, false);

    const response = await fetch("/api/admin/tilesets/entries/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: reordered.map((e, index) => ({ id: e.id, order: index })) }),
    });

    if (!response.ok) toast.error("Não foi possível salvar a nova ordem.");
    mutate();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma entrada ainda.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={entries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {entries.map((entry) => (
                  <EntryRowItem key={entry.id} entry={entry} onDelete={() => handleDelete(entry.id)} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-md border p-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Tipo</span>
          <Select value={kind} onValueChange={(v) => v && setKind(v as "ITEM_ID" | "ITEM_RANGE")}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ITEM_ID">ID único</SelectItem>
              <SelectItem value="ITEM_RANGE">Intervalo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {kind === "ITEM_ID" ? (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Item ID</span>
            <Input type="number" value={itemId} onChange={(e) => setItemId(e.target.value)} className="w-28" />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">De</span>
              <Input type="number" value={fromId} onChange={(e) => setFromId(e.target.value)} className="w-24" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Até</span>
              <Input type="number" value={toId} onChange={(e) => setToId(e.target.value)} className="w-24" />
            </div>
          </>
        )}

        <Button type="button" onClick={handleAdd} disabled={isSubmitting}>
          <Plus className="size-4" />
          Adicionar
        </Button>
      </div>
    </div>
  );
}

function EntryRowItem({ entry, onDelete }: { entry: EntryRow; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded-md border p-2 text-sm">
      <button type="button" className="cursor-grab touch-none text-muted-foreground" {...attributes} {...listeners}>
        <GripVertical className="size-4" />
      </button>
      <span className="flex-1">
        {entry.kind === "ITEM_ID" ? (
          <>
            ID único — <code>{entry.itemId}</code>
          </>
        ) : (
          <>
            Intervalo — <code>{entry.fromId}</code> a <code>{entry.toId}</code>
          </>
        )}
      </span>
      <Button variant="ghost" size="icon-sm" onClick={onDelete} title="Remover entrada">
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
