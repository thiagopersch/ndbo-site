"use client";

import { useFieldArray, type Control, type FieldArrayPath, type FieldValues } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ItemsListField } from "@/components/shared/items-list-field";
import { CompositeListField } from "@/components/shared/composite-list-field";

type AlternateListFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: string;
};

export function AlternateListField<T extends FieldValues>({ control, name }: AlternateListFieldProps<T>) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: name as FieldArrayPath<T>,
  });

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Alternates (variações independentes)</span>
      {fields.map((field, index) => (
        <Card key={field.id}>
          <CardContent className="flex flex-col gap-3 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Alternate #{index + 1}
              </span>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(index)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
            <ItemsListField control={control} name={`${name}.${index}.items`} />
            <CompositeListField control={control} name={`${name}.${index}.composites`} />
          </CardContent>
        </Card>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => append({ items: [], composites: [] } as never)}
      >
        <Plus className="size-4" />
        Adicionar alternate
      </Button>
    </div>
  );
}
