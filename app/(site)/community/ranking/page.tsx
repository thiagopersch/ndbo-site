"use client";

import Link from "next/link";
import useSWR from "swr";
import type { ColumnDef } from "@tanstack/react-table";

import { fetcher } from "@/lib/fetcher";
import type { PaginatedResult } from "@/lib/pagination";
import { useServerTable } from "@/hooks/use-server-table";
import { DataTable } from "@/components/shared/data-table";
import type { FilterFieldConfig } from "@/components/shared/advanced-filter-panel";

type RankingPlayer = {
  id: number;
  name: string;
  vocationName: string;
  experience: string;
  online: number;
  rankValue: number;
};

const SKILL_OPTIONS = [
  { value: "level", label: "Level" },
  { value: "maglevel", label: "Magic level" },
  { value: "resets", label: "Resets" },
  { value: "fist", label: "Fist" },
  { value: "club", label: "Club" },
  { value: "sword", label: "Sword" },
  { value: "axe", label: "Axe (Glove)" },
  { value: "distance", label: "Distance" },
  { value: "shielding", label: "Shielding" },
  { value: "fishing", label: "Fishing" },
];

const filterFields: FilterFieldConfig[] = [
  { key: "skill", label: "Ranquear por", type: "select", options: SKILL_OPTIONS },
];

const columns: ColumnDef<RankingPlayer>[] = [
  {
    accessorKey: "name",
    header: "Nome",
    cell: ({ row }) => (
      <Link
        href={`/community/characters?name=${encodeURIComponent(row.original.name)}`}
        className={
          row.original.online
            ? "font-medium text-green-600 hover:underline dark:text-green-400"
            : "font-medium text-red-600 hover:underline dark:text-red-400"
        }
      >
        {row.original.name}
      </Link>
    ),
  },
  { accessorKey: "rankValue", header: "Level" },
  { accessorKey: "vocationName", header: "Vocação" },
  { accessorKey: "experience", header: "Experiência" },
];

export default function RankingPage() {
  const table = useServerTable();

  const { data, isLoading, isValidating } = useSWR<PaginatedResult<RankingPlayer>>(
    `/api/public/ranking?${table.buildQueryParams().toString()}`,
    fetcher
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold">Ranking</h1>
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        isFiltering={!isLoading && isValidating}
        searchPlaceholder="Buscar jogador..."
        searchValue={table.searchInput}
        onSearchChange={table.handleSearchChange}
        filters={filterFields}
        filterValues={table.draftFilters}
        onFilterValuesChange={table.setDraftFilters}
        onApplyFilters={table.applyFilters}
        onClearFilters={table.clearFilters}
        manualPagination
        pageIndex={table.pageIndex}
        pageSize={table.pageSize}
        pageCount={data?.pageCount ?? 1}
        totalCount={data?.total}
        onPageChange={table.setPageIndex}
        onPageSizeChange={table.setPageSize}
      />
    </div>
  );
}
