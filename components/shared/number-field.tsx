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
import { FieldTooltip } from "@/components/shared/field-tooltip";

type NumberFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  step?: string;
  disabled?: boolean;
  tooltip?: string;
};

export function NumberField<T extends FieldValues>({
  control,
  name,
  label,
  step = "1",
  disabled,
  tooltip,
}: NumberFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && (
            <FormLabel className="flex items-center gap-1.5">
              {label}
              {tooltip && <FieldTooltip text={tooltip} />}
            </FormLabel>
          )}
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
