"use client";

import { useFieldArray, type Control, type FieldPath } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

import { emptyGroundFriend, type GroundFormInput } from "@/lib/validations/admin/ground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";

type GroundFriendListFieldProps = {
  control: Control<GroundFormInput>;
};

export function GroundFriendListField({ control }: GroundFriendListFieldProps) {
  const { fields, append, remove } = useFieldArray({ control, name: "friends" });

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Friends (ground que compartilha borda)</span>
      {fields.map((field, index) => (
        <div key={field.id} className="flex items-end gap-2">
          <FormField
            control={control}
            name={`friends.${index}.name` as FieldPath<GroundFormInput>}
            render={({ field: textField }) => (
              <FormItem>
                <FormLabel>Nome do ground</FormLabel>
                <FormControl>
                  <Input
                    className="w-64"
                    value={String(textField.value ?? "")}
                    onChange={textField.onChange}
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
        onClick={() => append(emptyGroundFriend)}
      >
        <Plus className="size-4" />
        Adicionar friend
      </Button>
    </div>
  );
}
