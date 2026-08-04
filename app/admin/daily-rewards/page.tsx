"use client";

import Link from "next/link";
import useSWR from "swr";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { fetcher } from "@/lib/fetcher";
import { competenciaId } from "@/lib/daily-reward-competencia";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DuplicateButton } from "@/components/shared/duplicate-button";
import { EntityThumb } from "@/components/shared/entity-thumb";

type CompetenciaRow = {
  year: number;
  month: number;
  rewardCount: number;
  bonusCount: number;
  previewItemIds: number[];
};

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export default function AdminDailyRewardsPage() {
  const { data, isLoading, mutate } = useSWR<{ competencias: CompetenciaRow[] }>(
    "/api/admin/daily-rewards/competencias",
    fetcher,
  );

  const competencias = data?.competencias ?? [];

  async function handleDelete(id: string) {
    const response = await fetch(`/api/admin/daily-rewards/competencias/${id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Não foi possível remover.");
      return;
    }
    toast.success("Competência removida.");
    mutate();
  }

  const columns: ColumnDef<CompetenciaRow>[] = [
    {
      id: "monthYear",
      header: "Mês/Ano",
      cell: ({ row }) => `${MONTH_NAMES[row.original.month - 1]}/${row.original.year}`,
    },
    {
      id: "rewardCount",
      header: "Qtd. recompensas",
      cell: ({ row }) => row.original.rewardCount,
    },
    {
      id: "bonusCount",
      header: "Qtd. bonus",
      cell: ({ row }) => <Badge variant="outline">{row.original.bonusCount}</Badge>,
    },
    {
      id: "preview",
      header: "Itens",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {row.original.previewItemIds.map((itemId, index) => (
            <EntityThumb key={`${itemId}-${index}`} entityType="item" id={itemId} size="32" />
          ))}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => {
        const id = competenciaId(row.original.year, row.original.month);
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              title="Editar"
              nativeButton={false}
              render={<Link href={`/admin/daily-rewards/${id}`} />}
            >
              <Pencil className="size-4" />
            </Button>
            <DuplicateButton
              endpoint={`/api/admin/daily-rewards/competencias/${id}/duplicate`}
              editPathBase="/admin/daily-rewards"
              variant="icon"
              onDuplicated={() => mutate()}
            />
            <ConfirmDialog
              trigger={
                <Button variant="destructive" size="icon-sm" title="Excluir">
                  <Trash2 className="size-4" />
                </Button>
              }
              title="Remover"
              description="Esta ação não pode ser desfeita. Todas as recompensas diárias e bonus dessa competência serão removidas."
              confirmLabel="Remover"
              onConfirm={() => handleDelete(id)}
            />
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Recompensas diárias</h1>
          <p className="text-muted-foreground">
            Competências de recompensas diárias e bonus (tabelas `daily_rewards_monthly` e
            `daily_rewards_bonus_monthly`), agrupadas por mês/ano.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/admin/daily-rewards/new" />}>
          <Plus className="size-4" />
          Nova competência
        </Button>
      </div>

      <DataTable columns={columns} data={competencias} isLoading={isLoading} />
    </div>
  );
}
