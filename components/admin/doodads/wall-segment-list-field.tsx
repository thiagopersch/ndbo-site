"use client";

import { useFieldArray, type Control, type FieldArrayPath, type FieldPath } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

import {
  WALL_SEGMENT_TYPES,
  emptyWallSegment,
  type DoodadFormInput,
} from "@/lib/validations/admin/doodad";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ItemsListField } from "@/components/shared/items-list-field";
import { DoorsListField } from "@/components/admin/doodads/doors-list-field";

type WallSegmentListFieldProps = {
  control: Control<DoodadFormInput>;
  name: string;
};

export function WallSegmentListField({ control, name }: WallSegmentListFieldProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: name as FieldArrayPath<DoodadFormInput>,
  });

  return (
    <div className="flex flex-col gap-2">
      {fields.map((field, index) => (
        <Card key={field.id}>
          <CardContent className="flex flex-col gap-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <FormField
                control={control}
                name={`${name}.${index}.type` as FieldPath<DoodadFormInput>}
                render={({ field: selectField }) => (
                  <FormItem>
                    <FormLabel>Tipo de segmento</FormLabel>
                    <Select
                      value={String(selectField.value)}
                      onValueChange={(value) => selectField.onChange(value)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-56">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {WALL_SEGMENT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(index)}>
                <Trash2 className="size-4" />
              </Button>
            </div>

            <ItemsListField control={control} name={`${name}.${index}.items`} />
            <DoorsListField control={control} name={`${name}.${index}.doors`} />
          </CardContent>
        </Card>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => append(emptyWallSegment as never)}
      >
        <Plus className="size-4" />
        Adicionar segmento de parede
      </Button>
    </div>
  );
}
