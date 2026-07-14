"use client";

import { useState } from "react";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AdvancedFilterPanel,
  type FilterFieldConfig,
  type FilterValues,
} from "@/components/shared/advanced-filter-panel";
import { PAGE_SIZE_OPTIONS } from "@/lib/pagination";

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchPlaceholder?: string;
  isLoading?: boolean;
  toolbar?: React.ReactNode;

  /** Busca controlada externamente (paginação no backend). Se omitido, filtra localmente. */
  searchValue?: string;
  onSearchChange?: (value: string) => void;

  /** Config de filtros avançados desta página — vazio/omitido esconde o botão de filtro. */
  filters?: FilterFieldConfig[];
  filterValues?: FilterValues;
  onFilterValuesChange?: (values: FilterValues) => void;
  onApplyFilters?: () => void;
  onClearFilters?: () => void;
  isFiltering?: boolean;

  /** Paginação controlada externamente (backend). Se omitido, pagina localmente. */
  manualPagination?: boolean;
  pageIndex?: number;
  pageSize?: number;
  pageCount?: number;
  totalCount?: number;
  onPageChange?: (pageIndex: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
};

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "Buscar...",
  isLoading,
  toolbar,
  searchValue,
  onSearchChange,
  filters,
  filterValues,
  onFilterValuesChange,
  onApplyFilters,
  onClearFilters,
  isFiltering,
  manualPagination = false,
  pageIndex = 0,
  pageSize = 10,
  pageCount,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [localGlobalFilter, setLocalGlobalFilter] = useState("");
  const [localPageSize, setLocalPageSize] = useState(pageSize);
  const [showFilters, setShowFilters] = useState(false);

  const isServerSearch = onSearchChange != null;
  const searchInputValue = isServerSearch ? (searchValue ?? "") : localGlobalFilter;

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter: isServerSearch ? undefined : localGlobalFilter,
      ...(manualPagination ? { pagination: { pageIndex, pageSize } } : {}),
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: isServerSearch ? undefined : setLocalGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: isServerSearch ? undefined : getFilteredRowModel(),
    getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
    manualPagination,
    pageCount: manualPagination ? pageCount : undefined,
    onPaginationChange: manualPagination
      ? (updater) => {
          const next =
            typeof updater === "function" ? updater({ pageIndex, pageSize }) : updater;
          if (next.pageIndex !== pageIndex) onPageChange?.(next.pageIndex);
          if (next.pageSize !== pageSize) onPageSizeChange?.(next.pageSize);
        }
      : undefined,
    initialState: manualPagination ? undefined : { pagination: { pageSize: localPageSize } },
  });

  const showLoadingRows = Boolean(isLoading || isFiltering);
  const effectivePageSize = manualPagination ? pageSize : localPageSize;
  const currentPageIndex = manualPagination ? pageIndex : table.getState().pagination.pageIndex;
  const currentPageCount = manualPagination ? (pageCount ?? 1) : Math.max(table.getPageCount(), 1);
  const canPreviousPage = manualPagination ? currentPageIndex > 0 : table.getCanPreviousPage();
  const canNextPage = manualPagination
    ? currentPageIndex < currentPageCount - 1
    : table.getCanNextPage();

  function handlePreviousPage() {
    if (manualPagination) onPageChange?.(Math.max(0, currentPageIndex - 1));
    else table.previousPage();
  }

  function handleNextPage() {
    if (manualPagination) onPageChange?.(Math.min(currentPageCount - 1, currentPageIndex + 1));
    else table.nextPage();
  }

  function handlePageSizeChange(value: string | null) {
    const size = Number(value);
    if (!value || !Number.isFinite(size)) return;
    if (manualPagination) {
      onPageSizeChange?.(size);
    } else {
      setLocalPageSize(size);
      table.setPageSize(size);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder={searchPlaceholder}
          value={searchInputValue}
          onChange={(event) =>
            isServerSearch ? onSearchChange?.(event.target.value) : setLocalGlobalFilter(event.target.value)
          }
          className="max-w-xs"
        />
        {filters && filters.length > 0 && (
          <Button
            type="button"
            variant={showFilters ? "default" : "outline"}
            size="icon"
            onClick={() => setShowFilters((v) => !v)}
            title="Filtros avançados"
          >
            <Filter className="size-4" />
          </Button>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {toolbar}
          <Select value={String(effectivePageSize)} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} / página
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {showFilters && filters && filters.length > 0 && (
        <AdvancedFilterPanel
          fields={filters}
          values={filterValues ?? {}}
          onValuesChange={(values) => onFilterValuesChange?.(values)}
          onApply={() => onApplyFilters?.()}
          onClear={() => onClearFilters?.()}
          isFiltering={isFiltering}
        />
      )}

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={
                      header.column.getCanSort() ? "cursor-pointer select-none" : undefined
                    }
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: " ▲", desc: " ▼" }[header.column.getIsSorted() as string] ?? null}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {showLoadingRows ? (
              Array.from({ length: Math.min(effectivePageSize, 10) }).map((_, rowIndex) => (
                <TableRow key={`skeleton-${rowIndex}`}>
                  {columns.map((_, colIndex) => (
                    <TableCell key={`skeleton-cell-${colIndex}`}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  Nenhum resultado encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Página {currentPageIndex + 1} de {currentPageCount}
          {manualPagination && totalCount != null ? ` — ${totalCount} registro(s)` : ""}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={!canPreviousPage}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextPage} disabled={!canNextPage}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
