"use client";

import useSWR from "swr";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { fetcher } from "@/lib/fetcher";
import type { AutolootItem } from "@/lib/generated/prisma/client";
import type { PaginatedResult } from "@/lib/pagination";
import type { AutolootItemInput } from "@/lib/validations/admin/autoloot-item";
import { useServerTable } from "@/hooks/use-server-table";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EntityThumb } from "@/components/shared/entity-thumb";
import { AutolootItemFormDialog } from "@/components/admin/autoloot-items/autoloot-item-form-dialog";

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

  async function createOrUpdate(values: AutolootItemInput, id?: number) {
    const response = await fetch(
      id ? `/api/admin/autoloot-items/${id}` : "/api/admin/autoloot-items",
      {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      },
    );

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body.error ?? "Não foi possível salvar.");
      return false;
    }
    mutate();
    return true;
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
        <ConfirmDialog
          trigger={
            <Button variant="destructive" size="icon-sm" title="Excluir">
              <Trash2 className="size-4" />
            </Button>
          }
          title="Remover"
          description="Remove o item da lista de autoloot disponível."
          confirmLabel="Remover"
          onConfirm={() => handleDelete(row.original.id)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Itens do Autoloot</h1>
          <p className="text-muted-foreground">
            Catálogo de itens que podem ser coletados automaticamente — nem todo item do jogo
            entra aqui, só os publicados aparecem no module do OTC.
          </p>
        </div>
        <AutolootItemFormDialog
          title="Novo item"
          defaultValues={{ itemId: 0, name: "", published: true }}
          successMessage="Item adicionado."
          onSubmit={(values) => createOrUpdate(values)}
          trigger={
            <Button>
              <Plus className="size-4" />
              Novo
            </Button>
          }
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        isFiltering={!isLoading && isValidating}
        searchPlaceholder="Buscar por nome ou ID..."
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
