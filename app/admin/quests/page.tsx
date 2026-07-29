"use client";

import useSWR from "swr";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { fetcher } from "@/lib/fetcher";
import type { Category, Quest } from "@/lib/generated/prisma/client";
import type { PaginatedResult } from "@/lib/pagination";
import { defaultQuestValues, type QuestInput, type QuestRewardItem } from "@/lib/validations/admin/quest";
import { useServerTable } from "@/hooks/use-server-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { QuestImageUpload } from "@/components/admin/quests/quest-image-upload";
import { QuestFormDialog } from "@/components/admin/quests/quest-form-dialog";

type QuestRow = Quest & { categoryRef: Category | null };

export default function AdminQuestsPage() {
  const table = useServerTable();

  const { data, isLoading, isValidating, mutate } = useSWR<PaginatedResult<QuestRow>>(
    `/api/admin/quests?${table.buildQueryParams().toString()}`,
    fetcher,
  );

  async function handleDelete(id: number) {
    const response = await fetch(`/api/admin/quests/${id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Não foi possível remover.");
      return;
    }
    toast.success("Removida.");
    mutate();
  }

  async function createOrUpdate(values: QuestInput, id?: number) {
    const response = await fetch(id ? `/api/admin/quests/${id}` : "/api/admin/quests", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (response.ok) mutate();
    return response.ok;
  }

  function rowToFormInput(row: QuestRow): QuestInput {
    return {
      name: row.name,
      description: row.description,
      categoryId: row.categoryId ?? 0,
      levelRequired: row.levelRequired,
      rewardExp: row.rewardExp,
      rewardMoney: row.rewardMoney,
      rewardItems: (row.rewardItems as QuestRewardItem[] | null) ?? [],
      published: row.published,
    };
  }

  const columns: ColumnDef<QuestRow>[] = [
    {
      id: "image",
      header: "Imagem",
      cell: ({ row }) => (
        <QuestImageUpload
          questId={row.original.id}
          imageUrl={row.original.imageUrl}
          onChange={mutate}
        />
      ),
    },
    { accessorKey: "name", header: "Nome" },
    {
      id: "category",
      header: "Categoria",
      cell: ({ row }) =>
        row.original.categoryRef ? (
          <Badge
            style={{
              backgroundColor: row.original.categoryRef.color,
              color: "#fff",
              borderColor: row.original.categoryRef.color,
            }}
          >
            {row.original.categoryRef.name}
          </Badge>
        ) : (
          <span className="text-muted-foreground">{row.original.category}</span>
        ),
    },
    { accessorKey: "levelRequired", header: "Level mínimo" },
    {
      accessorKey: "published",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.published ? "default" : "secondary"}>
          {row.original.published ? "Publicada" : "Rascunho"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <QuestFormDialog
            title="Editar quest"
            defaultValues={rowToFormInput(row.original)}
            successMessage="Atualizada com sucesso."
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
            title="Remover quest"
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
          <h1 className="text-2xl font-semibold">Quests</h1>
          <p className="text-muted-foreground">
            Catálogo de quests (tabela `quests`). A lógica de conclusão de cada quest continua
            sendo escrita em scripts do servidor (via `QuestLib.completeQuest`) — este cadastro
            define nome, descrição, requisitos e recompensas.
          </p>
        </div>
        <QuestFormDialog
          title="Nova quest"
          defaultValues={defaultQuestValues}
          successMessage="Criada com sucesso."
          onSubmit={(values) => createOrUpdate(values)}
          trigger={
            <Button>
              <Plus className="size-4" />
              Nova
            </Button>
          }
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        isFiltering={!isLoading && isValidating}
        searchPlaceholder="Buscar quest..."
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
