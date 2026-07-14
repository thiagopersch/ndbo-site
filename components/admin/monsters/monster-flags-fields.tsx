"use client";

import type { Control, FieldValues, Path } from "react-hook-form";

import { NumberField } from "@/components/shared/number-field";
import { Input } from "@/components/ui/input";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { MonsterFormInput } from "@/lib/validations/admin/monster";

const BOOL_FLAGS: [keyof MonsterFormInput["flags"], string][] = [
  ["summonable", "Summonable"],
  ["attackable", "Attackable"],
  ["hostile", "Hostile"],
  ["illusionable", "Illusionable"],
  ["convinceable", "Convinceable"],
  ["pushable", "Pushable"],
  ["canpushitems", "Pode empurrar itens"],
  ["canpushcreatures", "Pode empurrar criaturas"],
  ["hidename", "Esconder nome"],
  ["hidehealth", "Esconder vida"],
  ["lureable", "Lureable"],
  ["walkable", "Walkable"],
  ["canwalkonenergy", "Anda sobre energia"],
  ["canwalkonfire", "Anda sobre fogo"],
  ["canwalkonpoison", "Anda sobre veneno"],
];

const INT_FLAGS: [keyof MonsterFormInput["flags"], string][] = [
  ["lootmessage", "Loot message (0-3, -1 padrão config)"],
  ["targetdistance", "Target distance"],
  ["staticattack", "Static attack (0-100)"],
  ["lightlevel", "Light level"],
  ["lightcolor", "Light color"],
  ["runonhealth", "Run on health (HP para fugir)"],
];

const STRING_FLAGS: [keyof MonsterFormInput["flags"], string][] = [
  ["skull", "Skull"],
  ["shield", "Shield"],
  ["emblem", "Emblem"],
];

export function MonsterFlagsFields<T extends FieldValues>({ control }: { control: Control<T> }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-2 text-sm font-medium">Comportamento</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {BOOL_FLAGS.map(([name, label]) => (
            <FormField
              key={name}
              control={control}
              name={`flags.${name}` as Path<T>}
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2">
                  <FormControl>
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={Boolean(field.value)}
                      onChange={(event) => field.onChange(event.target.checked)}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0 font-normal">{label}</FormLabel>
                </FormItem>
              )}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Parâmetros</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {INT_FLAGS.map(([name, label]) => (
            <NumberField key={name} control={control} name={`flags.${name}` as Path<T>} label={label} />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Skull / shield / emblem</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {STRING_FLAGS.map(([name, label]) => (
            <FormField
              key={name}
              control={control}
              name={`flags.${name}` as Path<T>}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl>
                    <Input {...field} value={String(field.value ?? "")} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
