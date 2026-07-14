"use client";

import {
  useFieldArray,
  type Control,
  type FieldArrayPath,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { NumberField } from "@/components/shared/number-field";
import { emptyMonsterLootItem } from "@/lib/validations/admin/monster";

export function MonsterLootListField<T extends FieldValues>({
  control,
  name,
}: {
  control: Control<T>;
  name: string;
}) {
  const { fields, append, remove } = useFieldArray({ control, name: name as FieldArrayPath<T> });

  return (
    <div className="flex flex-col gap-2 border-l pl-3">
      {fields.map((field, index) => (
        <LootItemRow key={field.id} control={control} basePath={`${name}.${index}`} onRemove={() => remove(index)} />
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
  return (
    <div className="flex flex-col gap-2 rounded-md border p-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <NumberField control={control} name={`${basePath}.id` as FieldPath<T>} label="Item ID" />
        <NumberField control={control} name={`${basePath}.count` as FieldPath<T>} label="Count max" />
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
                <Input {...field} value={String(field.value ?? "")} placeholder="nome do item" />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <NumberField control={control} name={`${basePath}.subtype` as FieldPath<T>} label="Subtype" />
        <NumberField control={control} name={`${basePath}.actionId` as FieldPath<T>} label="Action ID" />
        <NumberField control={control} name={`${basePath}.uniqueId` as FieldPath<T>} label="Unique ID" />
        <FormField
          control={control}
          name={`${basePath}.text` as FieldPath<T>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Text</FormLabel>
              <FormControl>
                <Input {...field} value={String(field.value ?? "")} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      <div>
        <p className="mb-1 text-xs text-muted-foreground">Conteúdo (se for um container)</p>
        <MonsterLootListField control={control} name={`${basePath}.children`} />
      </div>

      <Button type="button" variant="ghost" size="sm" className="self-end text-destructive" onClick={onRemove}>
        <Trash2 className="size-4" />
        Remover item
      </Button>
    </div>
  );
}
