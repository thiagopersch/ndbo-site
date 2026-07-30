"use client";

import useSWR from "swr";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { fetcher } from "@/lib/fetcher";
import type { ChestReward } from "@/lib/generated/prisma/client";
import type { PaginatedResult } from "@/lib/pagination";
import type { ChestRewardInput } from "@/lib/validations/admin/chest-reward";
import { useServerTable } from "@/hooks/use-server-table";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EntityThumb } from "@/components/shared/entity-thumb";
import { ChestRewardFormDialog } from "@/components/admin/chest-rewards/chest-reward-form-dialog";

export default function AdminChestRewardsPage() {
  const table = useServerTable();

  const { data, isLoading, isValidating, mutate } = useSWR<PaginatedResult<ChestReward>>(
    `/api/admin/chest-rewards?${table.buildQueryParams().toString()}`,
    fetcher,
  );

  async function handleDelete(id: number) {
    const response = await fetch(`/api/admin/chest-rewards/${id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Não foi possível remover.");
      return;
    }
    toast.success("Recompensa removida.");
    mutate();
  }

  async function createOrUpdate(values: ChestRewardInput, id?: number) {
    const response = await fetch(
      id ? `/api/admin/chest-rewards/${id}` : "/api/admin/chest-rewards",
      {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      },
    );

    if (response.ok) mutate();
    return response.ok;
  }

  const columns: ColumnDef<ChestReward>[] = [
    {
      id: "image",
      header: "Imagem",
      cell: ({ row }) => <EntityThumb entityType="item" id={row.original.itemId} />,
    },
    { accessorKey: "itemId", header: "Item ID" },
    { accessorKey: "count", header: "Quantidade" },
    { accessorKey: "weight", header: "Peso" },
    {
      accessorKey: "published",
      header: "Publicado",
      cell: ({ row }) => (row.original.published ? "Sim" : "Não"),
    },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <ChestRewardFormDialog
            title="Editar recompensa"
            defaultValues={{
              itemId: row.original.itemId,
              count: row.original.count,
              weight: row.original.weight,
              published: row.original.published,
            }}
            successMessage="Atualizado com sucesso."
            onSubmit={(values) => createOrUpdate(values, row.original.id)}
            trigger={
              <Button variant="ghost" size="icon-sm" title="Editar">
                <Pencil className="size-4" />
              </Button>
            }
          />
          <ConfirmDialog
            trigger={
              <Button variant="destructive" size="icon-sm" title="Excluir">
                <Trash2 className="size-4" />
              </Button>
            }
            title="Remover"
            description="Esta ação não pode ser desfeita."
            confirmLabel="Remover"
            onConfirm={() => handleDelete(row.original.id)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Recompensas do Baú</h1>
          <p className="text-muted-foreground">
            Itens sorteáveis ao consumir o item-baú configurado no servidor.
          </p>
        </div>
        <ChestRewardFormDialog
          title="Nova recompensa"
          defaultValues={{ itemId: 0, count: 1, weight: 10, published: true }}
          successMessage="Criado com sucesso."
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
        searchPlaceholder="Buscar..."
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
