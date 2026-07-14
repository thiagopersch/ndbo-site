"use client";

import { useFieldArray, type Control, type FieldPath } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

import {
  GROUND_BORDER_ALIGNS,
  emptyGroundBorderRef,
  type GroundFormInput,
} from "@/lib/validations/admin/ground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GroundBorderCombobox, type BorderOption } from "@/components/admin/grounds/ground-border-combobox";

type GroundBorderListFieldProps = {
  control: Control<GroundFormInput>;
  borderOptions: BorderOption[];
};

export function GroundBorderListField({ control, borderOptions }: GroundBorderListFieldProps) {
  const { fields, append, remove } = useFieldArray({ control, name: "borders" });

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Borders (align/id do border)</span>
      {fields.map((field, index) => (
        <div key={field.id} className="flex flex-wrap items-end gap-2 rounded-md border p-2">
          <FormField
            control={control}
            name={`borders.${index}.align` as FieldPath<GroundFormInput>}
            render={({ field: selectField }) => (
              <FormItem>
                <FormLabel>Align</FormLabel>
                <Select
                  value={String(selectField.value)}
                  onValueChange={(value) => selectField.onChange(value)}
                >
                  <FormControl>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {GROUND_BORDER_ALIGNS.map((align) => (
                      <SelectItem key={align} value={align}>
                        {align}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <GroundBorderCombobox
            control={control}
            name={`borders.${index}.borderId` as FieldPath<GroundFormInput>}
            options={borderOptions}
          />

          <FormField
            control={control}
            name={`borders.${index}.to` as FieldPath<GroundFormInput>}
            render={({ field: toField }) => (
              <FormItem>
                <FormLabel>To (opcional: nome, &quot;none&quot;, &quot;all&quot;)</FormLabel>
                <FormControl>
                  <Input
                    className="w-56"
                    value={String(toField.value ?? "")}
                    onChange={(event) => toField.onChange(event.target.value === "" ? null : event.target.value)}
                  />
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
        onClick={() => append(emptyGroundBorderRef)}
      >
        <Plus className="size-4" />
        Adicionar border
      </Button>
    </div>
  );
}
