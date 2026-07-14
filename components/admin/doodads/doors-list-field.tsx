"use client";

import { useFieldArray, type Control, type FieldArrayPath, type FieldPath } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

import { DOOR_TYPES, emptyWallDoor, type DoodadFormInput } from "@/lib/validations/admin/doodad";
import { Button } from "@/components/ui/button";
import { NumberField } from "@/components/shared/number-field";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DoorsListFieldProps = {
  control: Control<DoodadFormInput>;
  name: string;
};

export function DoorsListField({ control, name }: DoorsListFieldProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: name as FieldArrayPath<DoodadFormInput>,
  });

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground">Portas/janelas (opcional)</span>
      {fields.map((field, index) => (
        <div key={field.id} className="flex flex-wrap items-end gap-2 rounded-md border p-2">
          <NumberField
            control={control}
            name={`${name}.${index}.id` as FieldPath<DoodadFormInput>}
            label="Item ID"
          />

          <FormField
            control={control}
            name={`${name}.${index}.type` as FieldPath<DoodadFormInput>}
            render={({ field: selectField }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select
                  value={String(selectField.value)}
                  onValueChange={(value) => selectField.onChange(value)}
                >
                  <FormControl>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DOOR_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`${name}.${index}.open` as FieldPath<DoodadFormInput>}
            render={({ field: checkboxField }) => (
              <FormItem className="flex flex-row items-center gap-1.5">
                <FormControl>
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={Boolean(checkboxField.value)}
                    onChange={(event) => checkboxField.onChange(event.target.checked)}
                  />
                </FormControl>
                <FormLabel className="!mt-0">Aberta</FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`${name}.${index}.hate` as FieldPath<DoodadFormInput>}
            render={({ field: checkboxField }) => (
              <FormItem className="flex flex-row items-center gap-1.5">
                <FormControl>
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={Boolean(checkboxField.value)}
                    onChange={(event) => checkboxField.onChange(event.target.checked)}
                  />
                </FormControl>
                <FormLabel className="!mt-0">Hate door</FormLabel>
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
        onClick={() => append(emptyWallDoor as never)}
      >
        <Plus className="size-4" />
        Adicionar porta/janela
      </Button>
    </div>
  );
}
