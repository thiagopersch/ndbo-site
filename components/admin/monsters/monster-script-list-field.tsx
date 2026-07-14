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

export function MonsterScriptListField<T extends FieldValues>({
  control,
  name,
}: {
  control: Control<T>;
  name: string;
}) {
  const { fields, append, remove } = useFieldArray({ control, name: name as FieldArrayPath<T> });

  return (
    <div className="flex flex-col gap-2">
      {fields.map((field, index) => (
        <div key={field.id} className="flex items-center gap-2">
          <FormField
            control={control}
            name={`${name}.${index}` as FieldPath<T>}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input {...field} value={String(field.value ?? "")} placeholder="nome do evento (Lua)" />
                </FormControl>
              </FormItem>
            )}
          />
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
        onClick={() => append("" as never)}
      >
        <Plus className="size-4" />
        Adicionar evento de script
      </Button>
    </div>
  );
}
