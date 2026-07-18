"use client";

import { useController, type Control, type FieldPath, type FieldValues } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { EntityThumb } from "@/components/shared/entity-thumb";

type ItemIdFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  disabled?: boolean;
  /** Quando true, campo vazio vira `null` em vez de `0` (mesmo padrão de `NullableNumberField`
   * usado em spell-form.tsx para runeItemId/conjureId/conjureReagentId). */
  nullable?: boolean;
};

/** Substituto drop-in de `NumberField`/`<Input type="number">` para qualquer campo que guarda
 * um id de item — mostra uma miniatura ao lado que acompanha o valor digitado. */
export function ItemIdField<T extends FieldValues>({
  control,
  name,
  label,
  disabled,
  nullable = false,
}: ItemIdFieldProps<T>) {
  const { field } = useController({ control, name });
  const rawValue = field.value as number | null | undefined;
  const id = typeof rawValue === "number" ? rawValue : 0;

  return (
    <FormItem>
      {label && <FormLabel>{label}</FormLabel>}
      <div className="flex items-center gap-2">
        <FormControl>
          <Input
            type="number"
            disabled={disabled}
            name={field.name}
            ref={field.ref}
            onBlur={field.onBlur}
            value={(rawValue as number | string) ?? ""}
            onChange={(event) => {
              if (event.target.value === "") {
                field.onChange(nullable ? null : 0);
                return;
              }
              field.onChange(Number(event.target.value));
            }}
          />
        </FormControl>
        <EntityThumb entityType="item" id={id} />
      </div>
      <FormMessage />
    </FormItem>
  );
}
