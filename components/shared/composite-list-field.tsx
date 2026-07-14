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
import { Card, CardContent } from "@/components/ui/card";
import { NumberField } from "@/components/shared/number-field";
import { TileListField } from "@/components/shared/tile-list-field";

type CompositeListFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: string;
  label?: string;
};

export function CompositeListField<T extends FieldValues>({
  control,
  name,
  label = "Composites (objeto multi-tile)",
}: CompositeListFieldProps<T>) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: name as FieldArrayPath<T>,
  });

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      {fields.map((field, index) => (
        <Card key={field.id}>
          <CardContent className="flex flex-col gap-3 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Composite #{index + 1}
              </span>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(index)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
            <NumberField
              control={control}
              name={`${name}.${index}.chance` as FieldPath<T>}
              label="Chance"
            />
            <TileListField control={control} name={`${name}.${index}.tiles`} />
          </CardContent>
        </Card>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => append({ chance: 0, tiles: [] } as never)}
      >
        <Plus className="size-4" />
        Adicionar composite
      </Button>
    </div>
  );
}
