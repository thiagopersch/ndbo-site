"use client";

import useSWR from "swr";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";

import { fetcher } from "@/lib/fetcher";
import type { MonsterBoost } from "@/lib/generated/prisma/client";
import type { PaginatedResult } from "@/lib/pagination";
import { monsterBoostSchema, type MonsterBoostInput } from "@/lib/validations/admin/monster-boost";
import { useServerTable } from "@/hooks/use-server-table";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SimpleFormDialog, type SimpleField } from "@/components/shared/simple-form-dialog";

const fields: SimpleField<MonsterBoostInput>[] = [
  { name: "monster", label: "Monstro" },
  { name: "loot", label: "Multiplicador de loot", type: "number" },
  { name: "exp", label: "Multiplicador de experiência", type: "number" },
];

export default function AdminMonsterBoostPage() {
  const table = useServerTable();

  const { data, isLoading, isValidating, mutate } = useSWR<PaginatedResult<MonsterBoost>>(
    `/api/admin/monster-boost?${table.buildQueryParams().toString()}`,
    fetcher
  );

  async function handleDelete(id: number) {
    const response = await fetch(`/api/admin/monster-boost/${id}`, { method: "DELETE" });

    if (!response.ok) {
      toast.error("Não foi possível remover.");
      return;
    }

    toast.success("Monstro impulsionado removido.");
    mutate();
  }

  async function createOrUpdate(values: MonsterBoostInput, id?: number) {
    const response = await fetch(id ? `/api/admin/monster-boost/${id}` : "/api/admin/monster-boost", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (response.ok) mutate();
    return response.ok;
  }

  const columns: ColumnDef<MonsterBoost>[] = [
    { accessorKey: "monster", header: "Monstro" },
    { accessorKey: "loot", header: "Loot" },
    { accessorKey: "exp", header: "Experiência" },
    {
      accessorKey: "date",
      header: "Atualizado em",
      cell: ({ row }) => dayjs(row.original.date).format("DD/MM/YYYY HH:mm"),
    },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <SimpleFormDialog
            title="Editar monstro impulsionado"
            schema={monsterBoostSchema}
            fields={fields}
            defaultValues={{
              monster: row.original.monster,
              loot: row.original.loot,
              exp: row.original.exp,
            }}
            successMessage="Atualizado com sucesso."
            onSubmit={(values) => createOrUpdate(values, row.original.id)}
            trigger={
              <Button variant="ghost" size="icon-sm">
                <Pencil className="size-4" />
              </Button>
            }
          />
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon-sm">
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
          <h1 className="text-2xl font-semibold">Monstros impulsionados</h1>
          <p className="text-muted-foreground">Configure a tabela `monster_boost`.</p>
        </div>
        <SimpleFormDialog
          title="Novo monstro impulsionado"
          schema={monsterBoostSchema}
          fields={fields}
          defaultValues={{ monster: "", loot: 0, exp: 0 }}
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
