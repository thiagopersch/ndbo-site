"use client";

import { useEffect, useState } from "react";
import {
  useController,
  useFieldArray,
  useWatch,
  type Control,
  type FieldArrayPath,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";

import type { MonsterLootItemInput } from "@/lib/validations/admin/monster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { NumberField } from "@/components/shared/number-field";
import { EntitySearchCombobox } from "@/components/shared/entity-search-combobox";
import { EntityThumb } from "@/components/shared/entity-thumb";
import { useItemName } from "@/components/shared/use-item-name";
import { emptyMonsterLootItem } from "@/lib/validations/admin/monster";

/** Achata a árvore de loot (containers dentro de containers) numa lista plana de item ids —
 * usado na box de preview do form (mostra todas as sprites que o monstro pode dropar, sem
 * distinguir profundidade do container). */
export function flattenLootItemIds(items: MonsterLootItemInput[]): number[] {
  return items.flatMap((item) => [item.id, ...flattenLootItemIds(item.children)]).filter((id) => id > 0);
}

export function MonsterLootListField<T extends FieldValues>({
  control,
  name,
}: {
  control: Control<T>;
  name: string;
}) {
  const { fields, append, insert, remove } = useFieldArray({
    control,
    name: name as FieldArrayPath<T>,
  });
  const [editing, setEditing] = useState<{ index: number; isNew: boolean } | null>(null);

  function handleAdd() {
    const index = fields.length;
    append(emptyMonsterLootItem as never);
    setEditing({ index, isNew: true });
  }

  function handleCancelNew() {
    if (editing) remove(editing.index);
    setEditing(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <Button type="button" variant="outline" size="sm" className="self-start" onClick={handleAdd}>
        <Plus className="size-4" />
        Adicionar item
      </Button>

      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum item de loot ainda.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {fields.map((field, index) => (
            <LootItemCard
              key={field.id}
              control={control}
              basePath={`${name}.${index}`}
              onEdit={() => setEditing({ index, isNew: false })}
              onDuplicate={(value) => insert(index + 1, structuredClone(value) as never)}
              onRemove={() => remove(index)}
            />
          ))}
        </div>
      )}

      {editing && (
        <Dialog open onOpenChange={(next) => !next && setEditing(null)}>
          <DialogContent className="flex max-h-[90vh] flex-col overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing.isNew ? "Adicionar item de loot" : "Editar item de loot"}</DialogTitle>
            </DialogHeader>
            <LootItemFields control={control} basePath={`${name}.${editing.index}`} />
            <DialogFooter className="sm:justify-between">
              {editing.isNew ? (
                <Button type="button" variant="outline" onClick={handleCancelNew}>
                  Cancelar
                </Button>
              ) : (
                <span />
              )}
              <Button type="button" onClick={() => setEditing(null)}>
                Concluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function LootItemCard<T extends FieldValues>({
  control,
  basePath,
  onEdit,
  onDuplicate,
  onRemove,
}: {
  control: Control<T>;
  basePath: string;
  onEdit: () => void;
  onDuplicate: (value: MonsterLootItemInput) => void;
  onRemove: () => void;
}) {
  const value = useWatch({ control, name: basePath as FieldPath<T> }) as MonsterLootItemInput;

  return (
    <div className="group relative flex flex-col items-center gap-1.5 rounded-md border p-2 text-center">
      <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Button type="button" variant="ghost" size="icon-sm" title="Editar" onClick={onEdit}>
          <Pencil className="size-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" title="Duplicar" onClick={() => onDuplicate(value)}>
          <Copy className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="Remover"
          className="text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <button type="button" onClick={onEdit} className="flex flex-col items-center gap-1.5">
        <EntityThumb entityType="item" id={value.id} name={value.comment} size="lg" zoomOnHover={false} />
        <p className="line-clamp-1 text-xs font-medium">{value.comment || (value.id > 0 ? `Item #${value.id}` : "Sem item")}</p>
        <p className="text-[11px] text-muted-foreground">
          ×{value.count} · {value.chance}%
        </p>
      </button>

      {value.children.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1 border-t pt-1.5">
          {value.children.map((child, index) => (
            <EntityThumb key={index} entityType="item" id={child.id} name={child.comment} size="32" />
          ))}
        </div>
      )}
    </div>
  );
}

function LootItemFields<T extends FieldValues>({
  control,
  basePath,
}: {
  control: Control<T>;
  basePath: string;
}) {
  const idController = useController({
    control,
    name: `${basePath}.id` as FieldPath<T>,
  });
  const commentController = useController({
    control,
    name: `${basePath}.comment` as FieldPath<T>,
  });
  const itemId = idController.field.value as number | null | undefined;
  const itemName = useItemName(itemId);

  useEffect(() => {
    if (itemName) commentController.field.onChange(itemName);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage à mudança do item, não do comentário
  }, [itemName]);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <FormItem>
          <FormLabel>Item</FormLabel>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <EntitySearchCombobox<{ id: number; name: string }>
                endpoint="/api/admin/items"
                value={itemId || null}
                placeholder="Buscar item por nome ou id..."
                formatOption={(item) => `${item.name} (#${item.id})`}
                renderOption={(item) => (
                  <span className="flex items-center gap-2">
                    <EntityThumb entityType="item" id={item.id} name={item.name} size="32" />
                    {item.name} (#{item.id})
                  </span>
                )}
                onSelect={(item) => idController.field.onChange(item?.id ?? 0)}
              />
            </div>
            {Boolean(itemId) && <EntityThumb entityType="item" id={itemId as number} size="32" />}
          </div>
        </FormItem>
        <NumberField
          control={control}
          name={`${basePath}.count` as FieldPath<T>}
          label="Quantidade máxima (Count max)"
        />
        <NumberField
          control={control}
          name={`${basePath}.chance` as FieldPath<T>}
          label="Chance (%)"
          step="0.001"
        />
        <FormField
          control={control}
          name={`${basePath}.comment` as FieldPath<T>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comentário</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={String(field.value ?? "")}
                  placeholder="nome do item"
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <NumberField
          control={control}
          name={`${basePath}.subtype` as FieldPath<T>}
          label="Subtipo (Subtype)"
          nullable
        />
        <NumberField
          control={control}
          name={`${basePath}.actionId` as FieldPath<T>}
          label="Action ID"
          nullable
        />
        <NumberField
          control={control}
          name={`${basePath}.uniqueId` as FieldPath<T>}
          label="Unique ID"
          nullable
        />
        <FormField
          control={control}
          name={`${basePath}.text` as FieldPath<T>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Texto (Text)</FormLabel>
              <FormControl>
                <Input {...field} value={String(field.value ?? "")} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      <div>
        <p className="mb-1 text-xs text-muted-foreground">
          Conteúdo (se for um container)
        </p>
        <MonsterLootListField control={control} name={`${basePath}.children`} />
      </div>
    </div>
  );
}
