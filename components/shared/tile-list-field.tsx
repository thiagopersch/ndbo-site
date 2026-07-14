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
import { ItemsListField } from "@/components/shared/items-list-field";

type TileListFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: string;
};

export function TileListField<T extends FieldValues>({ control, name }: TileListFieldProps<T>) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: name as FieldArrayPath<T>,
  });

  return (
    <div className="flex flex-col gap-2 pl-4">
      {fields.map((field, index) => (
        <Card key={field.id} className="bg-muted/30">
          <CardContent className="flex flex-col gap-3 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Tile #{index + 1}
              </span>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(index)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <NumberField control={control} name={`${name}.${index}.x` as FieldPath<T>} label="x" />
              <NumberField control={control} name={`${name}.${index}.y` as FieldPath<T>} label="y" />
              <NumberField control={control} name={`${name}.${index}.z` as FieldPath<T>} label="z (opcional)" />
            </div>
            <ItemsListField control={control} name={`${name}.${index}.items`} />
          </CardContent>
        </Card>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => append({ x: 0, y: 0, z: null, items: [] } as never)}
      >
        <Plus className="size-4" />
        Adicionar tile
      </Button>
    </div>
  );
}
