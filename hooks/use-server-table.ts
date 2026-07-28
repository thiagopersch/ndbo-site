"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import type { FilterValues } from "@/components/shared/advanced-filter-panel";

const SEARCH_DEBOUNCE_MS = 350;

type PersistedTableState = {
  pageIndex: number;
  pageSize: number;
  searchInput: string;
  search: string;
  draftFilters: FilterValues;
  appliedFilters: FilterValues;
};

function storageKey(pathname: string): string {
  return `admin-table-filters:${pathname}`;
}

/** Lê o estado salvo em `sessionStorage` (sai/volta pra mesma listagem sem perder busca,
 * filtros e página). Nunca lança — `sessionStorage` pode não existir (SSR) ou estar cheio. */
function readPersisted(pathname: string): Partial<PersistedTableState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(storageKey(pathname));
    return raw ? (JSON.parse(raw) as Partial<PersistedTableState>) : {};
  } catch {
    return {};
  }
}

function writePersisted(pathname: string, state: PersistedTableState) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(storageKey(pathname), JSON.stringify(state));
  } catch {
    // ignora erro de quota/serialização — a persistência é conveniência, não crítica
  }
}

function clearPersisted(pathname: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(storageKey(pathname));
  } catch {
    // ignora
  }
}

/**
 * Estado padrão para listas paginadas no backend: página/tamanho de página, busca
 * (debounced) e filtros avançados (draft vs aplicado, só valem depois de "Filtrar").
 * Use `buildQueryParams` para montar a query string da rota paginada (`lib/pagination.ts`
 * no backend) e passe os campos retornados direto para os props `manualPagination`/
 * `onSearchChange`/`onApplyFilters` etc. do `DataTable`.
 *
 * Persistido em `sessionStorage`, por pathname: ir editar/criar um registro e voltar para
 * a mesma listagem mantém busca/filtros/página aplicados. Só reseta ao clicar "Limpar
 * filtros" (`clearFilters`) ou ao navegar para um pathname diferente (chave de storage
 * muda, então a próxima vez que essa listagem for aberta começa do zero de novo).
 */
export function useServerTable(options?: { initialPageSize?: number }) {
  const pathname = usePathname();
  const [initial] = useState(() => readPersisted(pathname));

  const [pageIndex, setPageIndex] = useState(initial.pageIndex ?? 0);
  const [pageSize, setPageSizeState] = useState(initial.pageSize ?? options?.initialPageSize ?? 10);
  const [searchInput, setSearchInput] = useState(initial.searchInput ?? "");
  const [search, setSearch] = useState(initial.search ?? "");
  const [draftFilters, setDraftFilters] = useState<FilterValues>(initial.draftFilters ?? {});
  const [appliedFilters, setAppliedFilters] = useState<FilterValues>(initial.appliedFilters ?? {});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    writePersisted(pathname, { pageIndex, pageSize, searchInput, search, draftFilters, appliedFilters });
  }, [pathname, pageIndex, pageSize, searchInput, search, draftFilters, appliedFilters]);

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
    clearPersisted(pathname);
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
