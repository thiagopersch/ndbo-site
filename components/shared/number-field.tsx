"use client";

import type { Control, FieldPath, FieldValues } from "react-hook-form";

import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type NumberFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  step?: string;
  disabled?: boolean;
};

export function NumberField<T extends FieldValues>({
  control,
  name,
  label,
  step = "1",
  disabled,
}: NumberFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Input
              type="number"
              step={step}
              disabled={disabled}
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={(field.value as number | string) ?? ""}
              onChange={(event) =>
                field.onChange(event.target.value === "" ? 0 : Number(event.target.value))
              }
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
