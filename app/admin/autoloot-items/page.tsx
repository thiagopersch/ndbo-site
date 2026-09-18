"use client";

import Link from "next/link";
import useSWR from "swr";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { fetcher } from "@/lib/fetcher";
import type { AutolootItem } from "@/lib/generated/prisma/client";
import type { PaginatedResult } from "@/lib/pagination";
import { useServerTable } from "@/hooks/use-server-table";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { RowActionsMenu, DeleteRowMenuItem } from "@/components/shared/row-actions-menu";
import { EntityThumb } from "@/components/shared/entity-thumb";
import type { FilterFieldConfig } from "@/components/shared/advanced-filter-panel";

const filterFields: FilterFieldConfig[] = [
  {
    key: "hasImage",
    label: "Possui imagem",
    type: "select",
    options: [
      { value: "true", label: "Sim" },
      { value: "false", label: "Não" },
    ],
  },
  {
    key: "published",
    label: "Publicado",
    type: "select",
    options: [
      { value: "true", label: "Sim" },
      { value: "false", label: "Não" },
    ],
  },
];

export default function AdminAutolootItemsPage() {
  const table = useServerTable();

  const { data, isLoading, isValidating, mutate } = useSWR<PaginatedResult<AutolootItem>>(
    `/api/admin/autoloot-items?${table.buildQueryParams().toString()}`,
    fetcher,
  );

  async function handleDelete(id: number) {
    const response = await fetch(`/api/admin/autoloot-items/${id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Não foi possível remover.");
      return;
    }
    toast.success("Item removido do autoloot.");
    mutate();
  }

  const columns: ColumnDef<AutolootItem>[] = [
    {
      id: "image",
      header: "Imagem",
      cell: ({ row }) => <EntityThumb entityType="item" id={row.original.itemId} />,
    },
    { accessorKey: "name", header: "Nome" },
    { accessorKey: "itemId", header: "Item ID" },
    {
      accessorKey: "published",
      header: "Publicado",
      cell: ({ row }) => (row.original.published ? "Sim" : "Não"),
    },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <RowActionsMenu>
          <DeleteRowMenuItem
            title="Remover"
            description="Remove o item da lista de autoloot disponível."
            confirmLabel="Remover"
            onConfirm={() => handleDelete(row.original.id)}
          />
        </RowActionsMenu>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Itens do Autoloot</h1>
        <p className="text-muted-foreground">
          Catálogo de itens que podem ser coletados automaticamente — nem todo item do jogo
          entra aqui, só os publicados aparecem no module do OTC.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        isFiltering={!isLoading && isValidating}
        searchPlaceholder="Buscar por nome ou ID..."
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
        toolbar={
          <Button nativeButton={false} render={<Link href="/admin/autoloot-items/new" />}>
            <Plus className="size-4" />
            Novo
          </Button>
        }
      />
    </div>
  );
}
