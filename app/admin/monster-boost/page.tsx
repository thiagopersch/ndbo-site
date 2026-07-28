"use client";

import useSWR from "swr";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";

import { fetcher } from "@/lib/fetcher";
import type { MonsterBoost } from "@/lib/generated/prisma/client";
import type { PaginatedResult } from "@/lib/pagination";
import type { MonsterBoostInput } from "@/lib/validations/admin/monster-boost";
import { useServerTable } from "@/hooks/use-server-table";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EntityThumb } from "@/components/shared/entity-thumb";
import { MonsterBoostFormDialog } from "@/components/admin/monster-boost/monster-boost-form-dialog";

type MonsterOption = { id: number; name: string };

export default function AdminMonsterBoostPage() {
  const table = useServerTable();

  const { data, isLoading, isValidating, mutate } = useSWR<
    PaginatedResult<MonsterBoost>
  >(`/api/admin/monster-boost?${table.buildQueryParams().toString()}`, fetcher);

  // Resolve os nomes de monstro da página atual contra o catálogo real (para a thumbnail —
  // `monster` é salvo como string livre, sem FK, ver lib/validations/admin/monster-boost.ts).
  const { data: monstersData } = useSWR<{ data: MonsterOption[] }>(
    "/api/admin/monsters?all=true",
    fetcher,
  );
  const monsterIdByName = new Map(
    (monstersData?.data ?? []).map((m) => [m.name, m.id]),
  );

  async function handleDelete(id: number) {
    const response = await fetch(`/api/admin/monster-boost/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      toast.error("Não foi possível remover.");
      return;
    }

    toast.success("Monstro impulsionado removido.");
    mutate();
  }

  async function createOrUpdate(values: MonsterBoostInput, id?: number) {
    const response = await fetch(
      id ? `/api/admin/monster-boost/${id}` : "/api/admin/monster-boost",
      {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      },
    );

    if (response.ok) mutate();
    return response.ok;
  }

  const columns: ColumnDef<MonsterBoost>[] = [
    {
      id: "image",
      header: "Imagem",
      cell: ({ row }) => {
        const monsterId = monsterIdByName.get(row.original.monster);
        if (monsterId == null) return "—";
        return (
          <EntityThumb
            entityType="monster"
            id={monsterId}
            name={row.original.monster}
          />
        );
      },
    },
    { accessorKey: "monster", header: "Monstro (Monster)" },
    { accessorKey: "loot", header: "Loot" },
    { accessorKey: "exp", header: "Experiência (Exp)" },
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
          <MonsterBoostFormDialog
            title="Editar monstro impulsionado"
            defaultValues={{
              monster: row.original.monster,
              loot: row.original.loot,
              exp: row.original.exp,
            }}
            initialMonsterId={monsterIdByName.get(row.original.monster) ?? null}
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
          <h1 className="text-2xl font-semibold">Monstros impulsionados</h1>
          <p className="text-muted-foreground">
            Configure a tabela `monster_boost`.
          </p>
        </div>
        <MonsterBoostFormDialog
          title="Novo monstro impulsionado"
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
