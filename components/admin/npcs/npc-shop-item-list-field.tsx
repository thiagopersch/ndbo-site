"use client";

import { useState } from "react";
import {
  useController,
  useFieldArray,
  useWatch,
  type Control,
  type FieldArrayPath,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Pencil, Plus, Trash2 } from "lucide-react";

import type { NpcShopItemInput } from "@/lib/validations/admin/npc";
import { NPC_SHOP_DIRECTIONS } from "@/lib/validations/admin/npc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NumberField } from "@/components/shared/number-field";
import { EntitySearchCombobox } from "@/components/shared/entity-search-combobox";
import { EntityThumb } from "@/components/shared/entity-thumb";

const SHOP_DIRECTION_LABELS: Record<string, string> = {
  buy: "Compra (shop_buyable)",
  sell: "Venda (shop_sellable)",
};

const emptyShopItem: NpcShopItemInput = { direction: null, itemId: null, name: "", valueCrystal: 0 };

/** Itens que o NPC compra/vende — mesma ideia visual da tab de Loot dos monstros (grid de
 * cards + dialog de adicionar/editar, em vez de linhas sempre expandidas). */
export function NpcShopItemListField<T extends FieldValues>({
  control,
  name,
}: {
  control: Control<T>;
  name: string;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: name as FieldArrayPath<T>,
  });
  const [editing, setEditing] = useState<{ index: number; isNew: boolean } | null>(null);

  function handleAdd() {
    const index = fields.length;
    append(emptyShopItem as never);
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
        <p className="text-sm text-muted-foreground">Nenhum item de compra/venda ainda.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {fields.map((field, index) => (
            <ShopItemCard
              key={field.id}
              control={control}
              basePath={`${name}.${index}`}
              onEdit={() => setEditing({ index, isNew: false })}
              onRemove={() => remove(index)}
            />
          ))}
        </div>
      )}

      {editing && (
        <Dialog open onOpenChange={(next) => !next && setEditing(null)}>
          <DialogContent className="flex max-h-[90vh] flex-col overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing.isNew ? "Adicionar item" : "Editar item"}</DialogTitle>
            </DialogHeader>
            <ShopItemFields control={control} basePath={`${name}.${editing.index}`} />
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

function ShopItemCard<T extends FieldValues>({
  control,
  basePath,
  onEdit,
  onRemove,
}: {
  control: Control<T>;
  basePath: string;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const value = useWatch({ control, name: basePath as FieldPath<T> }) as NpcShopItemInput;

  return (
    <div className="group relative flex flex-col items-center gap-1.5 rounded-md border p-2 text-center">
      <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Button type="button" variant="ghost" size="icon-sm" title="Editar" onClick={onEdit}>
          <Pencil className="size-3.5" />
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
        <EntityThumb entityType="item" id={value.itemId ?? 0} name={value.name} size="lg" zoomOnHover={false} />
        <p className="line-clamp-1 text-xs font-medium">{value.name || (value.itemId ? `Item #${value.itemId}` : "Sem item")}</p>
        <p className="text-[11px] text-muted-foreground">
          {value.direction ? SHOP_DIRECTION_LABELS[value.direction] : "—"} · {value.valueCrystal} crystal
        </p>
      </button>
    </div>
  );
}

function ShopItemFields<T extends FieldValues>({
  control,
  basePath,
}: {
  control: Control<T>;
  basePath: string;
}) {
  const directionController = useController({ control, name: `${basePath}.direction` as FieldPath<T> });
  const idController = useController({ control, name: `${basePath}.itemId` as FieldPath<T> });
  const nameController = useController({ control, name: `${basePath}.name` as FieldPath<T> });
  const itemId = idController.field.value as number | null | undefined;

  return (
    <div className="flex flex-col gap-3">
      <FormItem>
        <FormLabel>Parâmetro</FormLabel>
        <Select
          value={(directionController.field.value as string | null) ?? ""}
          onValueChange={(value) => directionController.field.onChange(value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione compra ou venda" />
          </SelectTrigger>
          <SelectContent>
            {NPC_SHOP_DIRECTIONS.map((direction) => (
              <SelectItem key={direction} value={direction}>
                {SHOP_DIRECTION_LABELS[direction]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormItem>

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
              onSelect={(item) => {
                idController.field.onChange(item?.id ?? null);
                nameController.field.onChange(item?.name ?? "");
              }}
            />
          </div>
          {Boolean(itemId) && <EntityThumb entityType="item" id={itemId as number} size="32" />}
        </div>
      </FormItem>

      <NumberField control={control} name={`${basePath}.valueCrystal` as FieldPath<T>} label="Valor (crystal coin)" />
    </div>
  );
}
