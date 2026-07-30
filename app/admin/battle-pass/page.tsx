"use client";

import useSWR from "swr";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { fetcher } from "@/lib/fetcher";
import type { BattlePassSeason } from "@/lib/generated/prisma/client";
import {
  defaultBattlePassSeasonValues,
  type BattlePassSeasonInput,
} from "@/lib/validations/admin/battle-pass";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DuplicateButton } from "@/components/shared/duplicate-button";
import { BattlePassSeasonFormDialog } from "@/components/admin/battle-pass/battle-pass-season-form-dialog";

type SeasonRow = BattlePassSeason & { _count: { missions: number; rewards: number } };

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

export default function AdminBattlePassPage() {
  const { data, isLoading, mutate } = useSWR<{ seasons: SeasonRow[] }>(
    "/api/admin/battle-pass/seasons",
    fetcher,
  );

  const seasons = data?.seasons ?? [];

  async function handleDelete(id: number) {
    const response = await fetch(`/api/admin/battle-pass/seasons/${id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Não foi possível remover.");
      return;
    }
    toast.success("Temporada removida.");
    mutate();
  }

  async function createOrUpdate(values: BattlePassSeasonInput, id?: number) {
    const response = await fetch(
      id ? `/api/admin/battle-pass/seasons/${id}` : "/api/admin/battle-pass/seasons",
      {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      },
    );

    if (response.ok) {
      mutate();
      return true;
    }

    const body = await response.json().catch(() => null);
    toast.error(body?.error ?? "Não foi possível salvar.");
    return false;
  }

  const columns: ColumnDef<SeasonRow>[] = [
    {
      id: "monthYear",
      header: "Mês/Ano",
      cell: ({ row }) => (
        <span className="flex items-center gap-2">
          {MONTH_NAMES[row.original.month - 1]}/{row.original.year}
          {row.original.isActive && <Badge variant="default">Vigente</Badge>}
        </span>
      ),
    },
    {
      id: "missionCount",
      header: "Qtd. missões",
      cell: ({ row }) => row.original._count.missions,
    },
    {
      id: "rewardCount",
      header: "Qtd. recompensas",
      cell: ({ row }) => row.original._count.rewards,
    },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <BattlePassSeasonFormDialog
            title={`Editar temporada ${MONTH_NAMES[row.original.month - 1]}/${row.original.year}`}
            seasonId={row.original.id}
            defaultValues={{
              month: row.original.month,
              year: row.original.year,
              maxLevel: row.original.maxLevel,
              xpPerLevel: row.original.xpPerLevel,
              goldPassItemId: row.original.goldPassItemId,
              goldPassCost: row.original.goldPassCost,
              missions: [],
              rewards: [],
            }}
            successMessage="Atualizado com sucesso."
            onSubmit={(values) => createOrUpdate(values, row.original.id)}
            trigger={
              <Button variant="ghost" size="icon-sm" title="Editar">
                <Pencil className="size-4" />
              </Button>
            }
          />
          <DuplicateButton
            endpoint={`/api/admin/battle-pass/seasons/${row.original.id}/duplicate`}
            editPathBase="/admin/battle-pass"
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
            description="Esta ação não pode ser desfeita. Missões e recompensas dessa temporada também serão removidas."
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
          <h1 className="text-2xl font-semibold">Battle Pass</h1>
          <p className="text-muted-foreground">
            Temporadas do battle pass. Apenas a temporada cujo mês/ano bate com a data atual fica
            vigente para os jogadores — as demais servem de histórico ou planejamento futuro.
          </p>
        </div>
        <BattlePassSeasonFormDialog
          title="Nova temporada"
          defaultValues={defaultBattlePassSeasonValues}
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

      <DataTable columns={columns} data={seasons} isLoading={isLoading} />
    </div>
  );
}
