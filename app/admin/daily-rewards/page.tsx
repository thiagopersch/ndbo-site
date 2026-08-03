"use client";

import useSWR from "swr";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { fetcher } from "@/lib/fetcher";
import type { DailyRewardsMonthly } from "@/lib/generated/prisma/client";
import type { PaginatedResult } from "@/lib/pagination";
import type { DailyRewardMonthlyInput } from "@/lib/validations/admin/daily-reward";
import { useServerTable } from "@/hooks/use-server-table";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EntityThumb } from "@/components/shared/entity-thumb";
import type { FilterFieldConfig } from "@/components/shared/advanced-filter-panel";
import { DailyRewardFormDialog } from "@/components/admin/daily-rewards/daily-reward-form-dialog";

export default function AdminDailyRewardsPage() {
  const table = useServerTable();

  const { data, isLoading, isValidating, mutate } = useSWR<PaginatedResult<DailyRewardsMonthly>>(
    `/api/admin/daily-rewards?${table.buildQueryParams().toString()}`,
    fetcher
  );

  async function handleDelete(reward: DailyRewardsMonthly) {
    const response = await fetch("/api/admin/daily-rewards", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: reward.month, year: reward.year, day: reward.day }),
    });

    if (!response.ok) {
      toast.error("Não foi possível remover.");
      return;
    }

    toast.success("Removido.");
    mutate();
  }

  async function save(values: DailyRewardMonthlyInput) {
    const response = await fetch("/api/admin/daily-rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (response.ok) mutate();
    return response.ok;
  }

  const filterFields: FilterFieldConfig[] = [
    { key: "year", label: "Ano", type: "number", placeholder: "Ex.: 2026" },
    { key: "month", label: "Mês", type: "number", placeholder: "1-12" },
    { key: "day", label: "Dia", type: "number", placeholder: "1-31" },
  ];

  const columns: ColumnDef<DailyRewardsMonthly>[] = [
    {
      id: "image",
      header: "Imagem",
      cell: ({ row }) => <EntityThumb entityType="item" id={row.original.itemId} />,
    },
    { accessorKey: "year", header: "Ano" },
    { accessorKey: "month", header: "Mês" },
    { accessorKey: "day", header: "Dia" },
    { accessorKey: "itemId", header: "Item" },
    { accessorKey: "count", header: "Quantidade" },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <DailyRewardFormDialog
            title="Editar recompensa"
            defaultValues={{
              month: row.original.month,
              year: row.original.year,
              day: row.original.day,
              itemId: row.original.itemId,
              count: row.original.count,
              clientId: row.original.clientId,
            }}
            successMessage="Atualizado com sucesso."
            onSubmit={save}
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
            title="Remover recompensa"
            description="Esta ação não pode ser desfeita."
            confirmLabel="Remover"
            onConfirm={() => handleDelete(row.original)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Recompensas diárias</h1>
          <p className="text-muted-foreground">Tabela `daily_rewards_monthly` (por mês/ano/dia).</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        isFiltering={!isLoading && isValidating}
        searchPlaceholder="Buscar por ID do item..."
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
          <DailyRewardFormDialog
            title="Nova recompensa"
            defaultValues={{ month: 1, year: new Date().getFullYear(), day: 1, itemId: 0, count: 1, clientId: 0 }}
            successMessage="Criado com sucesso."
            onSubmit={save}
            trigger={
              <Button>
                <Plus className="size-4" />
                Nova recompensa
              </Button>
            }
          />
        }
      />
    </div>
  );
}
