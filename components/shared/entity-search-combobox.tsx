"use client";

import { useEffect, useRef, useState } from "react";
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

const SEARCH_DEBOUNCE_MS = 300;

/** Combobox genérico de busca por id — busca uma lista paginada de um endpoint admin
 * (`/api/admin/spells`, `/api/admin/items`, ...) e deixa selecionar um registro pelo id,
 * devolvendo a linha original via `onSelect`. Generalização de
 * `components/admin/monsters/monster-spell-combobox.tsx` para qualquer entidade.
 *
 * Encaminha o texto digitado como `?search=` (debounced) pro endpoint em vez de só filtrar
 * os `pageSize` primeiros registros no cliente — necessário para catálogos grandes (ex.:
 * `/api/admin/items`, +50 mil linhas), onde os primeiros N resultados quase nunca incluem o
 * item procurado. O endpoint de items já resolve `search` numérico como id (`search=2160`
 * encontra o item #2160 mesmo que o nome não contenha "2160"). */
export function EntitySearchCombobox<Row extends { id: number }>({
  endpoint,
  value,
  onSelect,
  formatOption,
  renderOption,
  placeholder = "Buscar...",
  pageSize = 30,
}: {
  endpoint: string;
  value: number | null;
  onSelect: (row: Row | null) => void;
  formatOption: (row: Row) => string;
  /** Sobrepõe o conteúdo de cada item da lista (ex.: sprite 32x32 + nome) — o texto de
   * `formatOption` continua usado para o filtro/label acessível do combobox. */
  renderOption?: (row: Row) => React.ReactNode;
  placeholder?: string;
  pageSize?: number;
}) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleInputValueChange(nextValue: string) {
    setSearchInput(nextValue);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(nextValue), SEARCH_DEBOUNCE_MS);
  }

  const separator = endpoint.includes("?") ? "&" : "?";
  // `skipCount=1`: o combobox nunca usa `total`/`pageCount`, só `data` — pula o `COUNT(*)` nas
  // rotas que suportam o flag (catálogos grandes tipo items/monstros, onde o count com `LIKE`
  // custa uma varredura completa da tabela a cada tecla digitada).
  const { data } = useSWR<PaginatedResult<Row>>(
    `${endpoint}${separator}pageSize=${pageSize}&search=${encodeURIComponent(search)}&skipCount=1`,
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
      inputValue={searchInput}
      onInputValueChange={handleInputValueChange}
      filter={null}
      isItemEqualToValue={(a: SearchOption, b: SearchOption) =>
        a.value === b.value
      }
      itemToStringLabel={(item: SearchOption) => item.label}
    >
      <ComboboxInput placeholder={placeholder} showClear className="w-full" />
      <ComboboxContent>
        <ComboboxEmpty>Nenhum resultado encontrado.</ComboboxEmpty>
        <ComboboxList>
          {(item: SearchOption) => {
            const row = data?.data.find((entry) => entry.id === item.value);
            return (
              <ComboboxItem key={item.value} value={item}>
                {renderOption && row ? renderOption(row) : item.label}
              </ComboboxItem>
            );
          }}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
