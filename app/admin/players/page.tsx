"use client";

import Link from "next/link";
import useSWR from "swr";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil } from "lucide-react";

import { fetcher } from "@/lib/fetcher";
import type { PaginatedResult } from "@/lib/pagination";
import { useServerTable } from "@/hooks/use-server-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";

type PlayerRow = {
  id: number;
  name: string;
  level: number;
  vocation: number;
  groupId: number;
  online: number;
  deleted: number;
  accountId: number;
};

export default function AdminPlayersPage() {
  const table = useServerTable();

  const { data, isLoading, isValidating } = useSWR<PaginatedResult<PlayerRow>>(
    `/api/admin/players?${table.buildQueryParams().toString()}`,
    fetcher
  );

  const columns: ColumnDef<PlayerRow>[] = [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "name", header: "Nome" },
    { accessorKey: "level", header: "Level" },
    { accessorKey: "vocation", header: "Vocação" },
    { accessorKey: "groupId", header: "Grupo" },
    {
      accessorKey: "online",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.online ? "default" : "secondary"}>
          {row.original.online ? "Online" : "Offline"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href={`/admin/players/${row.original.id}`} />}
        >
          <Pencil className="size-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Jogadores</h1>
        <p className="text-muted-foreground">
          Edite os dados dos personagens. Criação/remoção acontece pelo cliente de jogo.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        isFiltering={!isLoading && isValidating}
        searchPlaceholder="Buscar por nome..."
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
