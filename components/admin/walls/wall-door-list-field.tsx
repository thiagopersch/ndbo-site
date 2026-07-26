"use client";

import { useFieldArray, type Control, type FieldArrayPath, type FieldPath } from "react-hook-form";
import { Plus } from "lucide-react";

import { emptyWallDoor, type WallFormInput } from "@/lib/validations/admin/wall";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberField } from "@/components/shared/number-field";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CollapsibleFieldCard } from "@/components/shared/collapsible-field-card";

type WallDoorListFieldProps = {
  control: Control<WallFormInput>;
  name: string;
};

const OPEN_OPTIONS = [
  { value: "unset", label: "Não definido (sem atributo)" },
  { value: "false", label: "Fechada (open=false)" },
  { value: "true", label: "Aberta (open=true)" },
];

export function WallDoorListField({ control, name }: WallDoorListFieldProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: name as FieldArrayPath<WallFormInput>,
  });

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground">Portas/janelas (opcional)</span>
      {fields.map((field, index) => (
        <CollapsibleFieldCard
          key={field.id}
          title={`Porta/janela #${index + 1}`}
          onRemove={() => remove(index)}
        >
          <div className="flex flex-wrap items-end gap-2">
            <NumberField
              control={control}
              name={`${name}.${index}.id` as FieldPath<WallFormInput>}
              label="Item ID"
            />

            <FormField
              control={control}
              name={`${name}.${index}.type` as FieldPath<WallFormInput>}
              render={({ field: textField }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <FormControl>
                    <Input
                      list="wall-door-types"
                      className="w-40"
                      value={String(textField.value ?? "")}
                      onChange={textField.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`${name}.${index}.open` as FieldPath<WallFormInput>}
              render={({ field: openField }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select
                    value={openField.value == null ? "unset" : String(openField.value)}
                    onValueChange={(value) =>
                      openField.onChange(value === "unset" ? null : value === "true")
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="w-52">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {OPEN_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`${name}.${index}.locked` as FieldPath<WallFormInput>}
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
                  <FormLabel className="!mt-0">Trancada (locked)</FormLabel>
                </FormItem>
              )}
            />
          </div>
        </CollapsibleFieldCard>
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
