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

type AccountRow = {
  id: number;
  name: string;
  email: string;
  groupId: number;
  blocked: boolean;
  premdays: number;
  warnings: number;
  _count: { players: number };
};

export default function AdminAccountsPage() {
  const table = useServerTable();

  const { data, isLoading, isValidating } = useSWR<PaginatedResult<AccountRow>>(
    `/api/admin/accounts?${table.buildQueryParams().toString()}`,
    fetcher
  );

  const columns: ColumnDef<AccountRow>[] = [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "name", header: "Conta" },
    { accessorKey: "email", header: "E-mail" },
    { accessorKey: "groupId", header: "Grupo" },
    {
      accessorKey: "blocked",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.blocked ? "destructive" : "default"}>
          {row.original.blocked ? "Bloqueada" : "Ativa"}
        </Badge>
      ),
    },
    { accessorFn: (row) => row._count.players, id: "players", header: "Personagens" },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href={`/admin/accounts/${row.original.id}`} />}
        >
          <Pencil className="size-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Contas</h1>
        <p className="text-muted-foreground">
          Gerencie nível de acesso, bloqueio e dias premium. Cadastro de novas contas acontece pelo
          formulário público.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        isFiltering={!isLoading && isValidating}
        searchPlaceholder="Buscar por conta..."
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
