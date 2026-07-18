"use client";

import useSWR from "swr";
import type { ColumnDef } from "@tanstack/react-table";

import { fetcher } from "@/lib/fetcher";
import type { PaginatedResult } from "@/lib/pagination";
import type { EntityImageInfo } from "@/components/shared/use-entity-images";
import { useServerTable } from "@/hooks/use-server-table";
import { DataTable } from "@/components/shared/data-table";
import { EntityThumb } from "@/components/shared/entity-thumb";

type PublicMonster = {
  id: number;
  name: string;
  healthMax: string;
  experience: number;
  race: string;
  image: EntityImageInfo | null;
};

const columns: ColumnDef<PublicMonster>[] = [
  {
    accessorKey: "image",
    header: "",
    cell: ({ row }) => (
      <EntityThumb entityType="monster" id={row.original.id} name={row.original.name} image={row.original.image} />
    ),
  },
  { accessorKey: "name", header: "Nome" },
  { accessorKey: "healthMax", header: "HP" },
  { accessorKey: "experience", header: "Experiência" },
  { accessorKey: "race", header: "Raça" },
];

export default function PublicMonstersPage() {
  const table = useServerTable();

  const { data, isLoading, isValidating } = useSWR<PaginatedResult<PublicMonster>>(
    `/api/public/monsters?${table.buildQueryParams().toString()}`,
    fetcher
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold">Monstros</h1>
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        isFiltering={!isLoading && isValidating}
        searchPlaceholder="Buscar monstro..."
        searchValue={table.searchInput}
        onSearchChange={table.handleSearchChange}
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
