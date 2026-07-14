"use client";

import { useFieldArray, type Control, type FieldArrayPath, type FieldPath } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

import {
  COMMON_WALL_DOOR_TYPES,
  emptyWallSegment,
  type WallFormInput,
} from "@/lib/validations/admin/wall";
import { WALL_SEGMENT_TYPES } from "@/lib/validations/admin/doodad";
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
import { WallDoorListField } from "@/components/admin/walls/wall-door-list-field";

type WallSegmentListFieldProps = {
  control: Control<WallFormInput>;
  name: string;
};

export function WallSegmentListField({ control, name }: WallSegmentListFieldProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: name as FieldArrayPath<WallFormInput>,
  });

  return (
    <div className="flex flex-col gap-2">
      <datalist id="wall-door-types">
        {COMMON_WALL_DOOR_TYPES.map((type) => (
          <option key={type} value={type} />
        ))}
      </datalist>

      {fields.map((field, index) => (
        <Card key={field.id}>
          <CardContent className="flex flex-col gap-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <FormField
                control={control}
                name={`${name}.${index}.type` as FieldPath<WallFormInput>}
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
            <WallDoorListField control={control} name={`${name}.${index}.doors`} />
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
