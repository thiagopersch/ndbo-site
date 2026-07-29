"use client";

import type { Control, FieldPath, FieldValues } from "react-hook-form";

import { formatThousands } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

type FormattedNumberFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  disabled?: boolean;
};

/** Igual a `NumberField`, mas formata com separador de milhar enquanto digita (ex.: "10000" ->
 * "10.000") — pra campos onde o valor tende a ficar grande (kills, experiência, dinheiro). O
 * valor guardado no form continua um `number` puro; só a exibição tem os pontos. */
export function FormattedNumberField<T extends FieldValues>({
  control,
  name,
  label,
  disabled,
}: FormattedNumberFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Input
              type="text"
              inputMode="numeric"
              disabled={disabled}
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={formatThousands(Number(field.value) || 0)}
              onChange={(event) => {
                const digits = event.target.value.replace(/\D/g, "");
                field.onChange(digits === "" ? 0 : Number(digits));
              }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
