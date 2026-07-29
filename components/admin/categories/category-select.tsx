"use client";

import type { Control, FieldPath, FieldValues } from "react-hook-form";
import useSWR from "swr";

import { fetcher } from "@/lib/fetcher";
import type { Category } from "@/lib/generated/prisma/client";
import type { PaginatedResult } from "@/lib/pagination";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Select de categoria (compartilhado por Quests/Tasks, ver `/admin/categories`) — busca a
 * lista inteira de uma vez (poucas categorias esperadas, sem paginação/busca incremental). */
export function CategorySelect<T extends FieldValues>({
  control,
  name,
}: {
  control: Control<T>;
  name: FieldPath<T>;
}) {
  const { data } = useSWR<PaginatedResult<Category>>("/api/admin/categories?pageSize=200", fetcher);
  const categories = data?.data ?? [];

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Categoria</FormLabel>
          <Select
            value={field.value != null ? String(field.value) : null}
            onValueChange={(value) => field.onChange(value ? Number(value) : null)}
          >
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a categoria">
                  {(value: string | null) =>
                    value ? (categories.find((c) => String(c.id) === value)?.name ?? value) : "Selecione a categoria"
                  }
                </SelectValue>
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={String(category.id)}>
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    {category.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
