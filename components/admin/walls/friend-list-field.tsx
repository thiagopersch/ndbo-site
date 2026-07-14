"use client";

import { useFieldArray, type Control, type FieldArrayPath, type FieldPath } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

import { emptyFriend, type WallFormInput } from "@/lib/validations/admin/wall";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";

type FriendListFieldProps = {
  control: Control<WallFormInput>;
  name: string;
};

export function FriendListField({ control, name }: FriendListFieldProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: name as FieldArrayPath<WallFormInput>,
  });

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">
        Friends (redireciona/mescla borda com outro brush)
      </span>
      {fields.map((field, index) => (
        <div key={field.id} className="flex flex-wrap items-end gap-2 rounded-md border p-2">
          <FormField
            control={control}
            name={`${name}.${index}.name` as FieldPath<WallFormInput>}
            render={({ field: textField }) => (
              <FormItem>
                <FormLabel>Nome do brush</FormLabel>
                <FormControl>
                  <Input
                    className="w-56"
                    value={String(textField.value ?? "")}
                    onChange={textField.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`${name}.${index}.redirect` as FieldPath<WallFormInput>}
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
                <FormLabel className="!mt-0">Redirect</FormLabel>
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
        onClick={() => append(emptyFriend as never)}
      >
        <Plus className="size-4" />
        Adicionar friend
      </Button>
    </div>
  );
}
