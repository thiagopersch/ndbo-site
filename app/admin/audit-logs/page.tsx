"use client";

import useSWR from "swr";
import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";

import { fetcher } from "@/lib/fetcher";
import type { PaginatedResult } from "@/lib/pagination";
import { useServerTable } from "@/hooks/use-server-table";
import { DataTable } from "@/components/shared/data-table";

type AuditLogRow = {
  id: number;
  accountId: number | null;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
};

export default function AdminAuditLogsPage() {
  const table = useServerTable();

  const { data, isLoading, isValidating } = useSWR<PaginatedResult<AuditLogRow>>(
    `/api/admin/audit-logs?${table.buildQueryParams().toString()}`,
    fetcher
  );

  const columns: ColumnDef<AuditLogRow>[] = [
    { accessorKey: "createdAt", header: "Data", cell: ({ row }) => dayjs(row.original.createdAt).format("DD/MM/YYYY HH:mm:ss") },
    { accessorKey: "accountId", header: "Conta (ID)" },
    { accessorKey: "action", header: "Ação" },
    { accessorKey: "entity", header: "Entidade" },
    { accessorKey: "entityId", header: "ID do registro" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Auditoria</h1>
        <p className="text-muted-foreground">Trilha das ações administrativas (somente leitura).</p>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        isFiltering={!isLoading && isValidating}
        searchPlaceholder="Buscar por ação..."
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
