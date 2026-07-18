"use client";

import useSWR from "swr";

import { fetcher } from "@/lib/fetcher";
import type { PaginatedResult } from "@/lib/pagination";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

type SearchOption = { value: number; label: string };

/** Combobox genérico de busca por id — busca uma lista paginada de um endpoint admin
 * (`/api/admin/spells`, `/api/admin/items`, ...) e deixa selecionar um registro pelo id,
 * devolvendo a linha original via `onSelect`. Generalização de
 * `components/admin/monsters/monster-spell-combobox.tsx` para qualquer entidade. */
export function EntitySearchCombobox<Row extends { id: number }>({
  endpoint,
  value,
  onSelect,
  formatOption,
  placeholder = "Buscar...",
  pageSize = 200,
}: {
  endpoint: string;
  value: number | null;
  onSelect: (row: Row | null) => void;
  formatOption: (row: Row) => string;
  placeholder?: string;
  pageSize?: number;
}) {
  const separator = endpoint.includes("?") ? "&" : "?";
  const { data } = useSWR<PaginatedResult<Row>>(
    `${endpoint}${separator}pageSize=${pageSize}`,
    fetcher,
  );

  const options: SearchOption[] = (data?.data ?? []).map((row) => ({
    value: row.id,
    label: formatOption(row),
  }));
  const selected = options.find((option) => option.value === value) ?? null;

  return (
    <Combobox
      items={options}
      value={selected}
      onValueChange={(item) => {
        const option = item as SearchOption | null;
        if (!option) {
          onSelect(null);
          return;
        }
        const row = data?.data.find((entry) => entry.id === option.value);
        onSelect(row ?? null);
      }}
      isItemEqualToValue={(a: SearchOption, b: SearchOption) =>
        a.value === b.value
      }
      itemToStringLabel={(item: SearchOption) => item.label}
    >
      <ComboboxInput placeholder={placeholder} showClear className="w-full" />
      <ComboboxContent>
        <ComboboxEmpty>Nenhum resultado encontrado.</ComboboxEmpty>
        <ComboboxList>
          {(item: SearchOption) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
