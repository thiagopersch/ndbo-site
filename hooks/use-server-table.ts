import { useEffect, useRef, useState } from "react";

import type { FilterValues } from "@/components/shared/advanced-filter-panel";

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Estado padrão para listas paginadas no backend: página/tamanho de página, busca
 * (debounced) e filtros avançados (draft vs aplicado, só valem depois de "Filtrar").
 * Use `buildQueryParams` para montar a query string da rota paginada (`lib/pagination.ts`
 * no backend) e passe os campos retornados direto para os props `manualPagination`/
 * `onSearchChange`/`onApplyFilters` etc. do `DataTable`.
 */
export function useServerTable(options?: { initialPageSize?: number }) {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSizeState] = useState(options?.initialPageSize ?? 10);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [draftFilters, setDraftFilters] = useState<FilterValues>({});
  const [appliedFilters, setAppliedFilters] = useState<FilterValues>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value);
      setPageIndex(0);
    }, SEARCH_DEBOUNCE_MS);
  }

  function setPageSize(size: number) {
    setPageSizeState(size);
    setPageIndex(0);
  }

  function applyFilters() {
    setAppliedFilters(draftFilters);
    setPageIndex(0);
  }

  function clearFilters() {
    setDraftFilters({});
    setAppliedFilters({});
    setPageIndex(0);
  }

  function buildQueryParams(extra?: Record<string, string | undefined>) {
    const params = new URLSearchParams({
      page: String(pageIndex + 1),
      pageSize: String(pageSize),
      search,
    });

    for (const [key, value] of Object.entries({ ...appliedFilters, ...extra })) {
      if (value) params.set(key, value);
    }

    return params;
  }

  return {
    pageIndex,
    setPageIndex,
    pageSize,
    setPageSize,
    searchInput,
    handleSearchChange,
    draftFilters,
    setDraftFilters,
    appliedFilters,
    applyFilters,
    clearFilters,
    buildQueryParams,
  };
}
