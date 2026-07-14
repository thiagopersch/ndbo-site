"use client";

import Link from "next/link";
import useSWR from "swr";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";

import { fetcher } from "@/lib/fetcher";
import type { PaginatedResult } from "@/lib/pagination";
import { useServerTable } from "@/hooks/use-server-table";
import { DataTable } from "@/components/shared/data-table";

type RankingPlayer = {
  id: number;
  name: string;
  level: number;
  vocation: number;
  experience: string;
  online: number;
};

const columns: ColumnDef<RankingPlayer>[] = [
  {
    accessorKey: "name",
    header: "Nome",
    cell: ({ row }) => (
      <Link href={`/community/characters?name=${encodeURIComponent(row.original.name)}`} className="hover:underline">
        {row.original.name}
      </Link>
    ),
  },
  { accessorKey: "level", header: "Level" },
  { accessorKey: "vocation", header: "Vocação" },
  { accessorKey: "experience", header: "Experiência" },
  {
    accessorKey: "online",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.online ? "default" : "secondary"}>
        {row.original.online ? "Online" : "Offline"}
      </Badge>
    ),
  },
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
