"use client";

import Link from "next/link";
import useSWR from "swr";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";

import { fetcher } from "@/lib/fetcher";
import type { Looktype } from "@/lib/generated/prisma/client";
import type { PaginatedResult } from "@/lib/pagination";
import { LOOKTYPE_CATEGORY_LABELS, spriteTermFor, type LooktypeCategory } from "@/lib/validations/admin/looktype";
import { useServerTable } from "@/hooks/use-server-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { LooktypeAnimatedImage } from "@/components/shared/looktype-animated-image";
import { LooktypeCreateDialog } from "@/components/admin/looktypes/looktype-create-dialog";

export default function AdminLooktypesPage() {
  const table = useServerTable();

  const { data, isLoading, isValidating, mutate } = useSWR<PaginatedResult<Looktype>>(
    `/api/admin/looktypes?${table.buildQueryParams().toString()}`,
    fetcher
  );

  async function handleDelete(id: number) {
    const response = await fetch(`/api/admin/looktypes/${id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Não foi possível remover.");
      return;
    }
    toast.success("Removido.");
    mutate();
  }

  const columns: ColumnDef<Looktype>[] = [
    { accessorKey: "id", header: "ID" },
    {
      id: "preview",
      header: "Preview",
      cell: ({ row }) => (
        <LooktypeAnimatedImage
          looktypeId={row.original.id}
          frameCount={row.original.frameCount}
          frameDurationsMs={row.original.frameDurationsMs as number[]}
          updatedAt={row.original.updatedAt}
          size="sm"
        />
      ),
    },
    { accessorKey: "name", header: "Nome" },
    {
      accessorKey: "category",
      header: "Tipo",
      cell: ({ row }) => {
        const category = row.original.category as LooktypeCategory;
        return (
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary">{LOOKTYPE_CATEGORY_LABELS[category] ?? category}</Badge>
            <span className="text-xs text-muted-foreground">({spriteTermFor(category)})</span>
          </div>
        );
      },
    },
    {
      accessorKey: "looktypeNumber",
      header: "Número",
      cell: ({ row }) => row.original.looktypeNumber ?? <span className="text-muted-foreground">—</span>,
    },
    { accessorKey: "frameCount", header: "Frames" },
    {
      id: "size",
      header: "Tamanho (px)",
      cell: ({ row }) => `${row.original.width * 32}x${row.original.height * 32}`,
    },
    {
      id: "frameSpeedMs",
      header: "Velocidade (ms)",
      cell: ({ row }) => {
        const durations = row.original.frameDurationsMs as number[];
        return durations.length > 0 ? durations[0] : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "updatedAt",
      header: "Atualizado em",
      cell: ({ row }) => dayjs(row.original.updatedAt).format("DD/MM/YYYY HH:mm"),
    },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            title="Editar"
            nativeButton={false}
            render={<Link href={`/admin/looktypes/${row.original.id}`} />}
          >
            <Pencil className="size-4" />
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="destructive" size="icon-sm" title="Excluir">
                <Trash2 className="size-4" />
              </Button>
            }
            title="Remover"
            description="Esta ação não pode ser desfeita e remove os frames em disco."
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
          <h1 className="text-2xl font-semibold">Sprites</h1>
          <p className="text-muted-foreground">
            Registro centralizado de aparências (item/outfit/monstro/npc/vocação/efeito/missile) — importe um
            `.obd` do Object Builder para gerar a animação automaticamente, ou uma imagem PNG/GIF estática.
            &quot;Looktype&quot; é o termo usado só para outfits; os demais tipos são chamados de &quot;Sprite&quot;.
          </p>
        </div>
        <LooktypeCreateDialog onCreated={() => mutate()} trigger={<Button>Nova sprite / looktype</Button>} />
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        isFiltering={!isLoading && isValidating}
        searchPlaceholder="Buscar por nome, id ou número..."
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
