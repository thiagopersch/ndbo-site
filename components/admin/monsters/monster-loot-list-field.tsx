"use client";

import { useEffect } from "react";
import {
  useController,
  useFieldArray,
  type Control,
  type FieldArrayPath,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function MonsterLootListField<T extends FieldValues>({
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

  return (
    <div className="flex flex-col gap-2 border-l pl-3">
      {fields.map((field, index) => (
        <LootItemRow
          key={field.id}
          control={control}
          basePath={`${name}.${index}`}
          onRemove={() => remove(index)}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => append(emptyMonsterLootItem as never)}
      >
        <Plus className="size-4" />
        Adicionar item de loot
      </Button>
    </div>
  );
}

function LootItemRow<T extends FieldValues>({
  control,
  basePath,
  onRemove,
}: {
  control: Control<T>;
  basePath: string;
  onRemove: () => void;
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
    <div className="flex flex-col gap-2 rounded-md border p-2">
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
        />
        <NumberField
          control={control}
          name={`${basePath}.actionId` as FieldPath<T>}
          label="Action ID"
        />
        <NumberField
          control={control}
          name={`${basePath}.uniqueId` as FieldPath<T>}
          label="Unique ID"
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

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-end text-destructive"
        onClick={onRemove}
      >
        <Trash2 className="size-4" />
        Remover item
      </Button>
    </div>
  );
}
