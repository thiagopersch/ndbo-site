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
import { FormControl, FormField, FormItem } from "@/components/ui/form";
import { NumberField } from "@/components/shared/number-field";
import { emptyMonsterSummon } from "@/lib/validations/admin/monster";

export function MonsterSummonListField<T extends FieldValues>({
  control,
  name,
}: {
  control: Control<T>;
  name: string;
}) {
  const { fields, append, remove } = useFieldArray({ control, name: name as FieldArrayPath<T> });

  return (
    <div className="flex flex-col gap-2">
      {fields.length > 0 && (
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 text-xs text-muted-foreground">
          <span>Nome do monstro</span>
          <span>Interval</span>
          <span>Chance</span>
          <span>Amount</span>
          <span />
        </div>
      )}
      {fields.map((field, index) => (
        <div key={field.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-center gap-2">
          <FormField
            control={control}
            name={`${name}.${index}.name` as FieldPath<T>}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input {...field} value={String(field.value ?? "")} />
                </FormControl>
              </FormItem>
            )}
          />
          <NumberField control={control} name={`${name}.${index}.interval` as FieldPath<T>} />
          <NumberField control={control} name={`${name}.${index}.chance` as FieldPath<T>} />
          <NumberField control={control} name={`${name}.${index}.amount` as FieldPath<T>} />
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(index)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => append(emptyMonsterSummon as never)}
      >
        <Plus className="size-4" />
        Adicionar summon
      </Button>
    </div>
  );
}
