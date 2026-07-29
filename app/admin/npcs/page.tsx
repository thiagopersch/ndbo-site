"use client";

import Link from "next/link";
import useSWR from "swr";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { fetcher } from "@/lib/fetcher";
import type { PaginatedResult } from "@/lib/pagination";
import { useServerTable } from "@/hooks/use-server-table";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

type NpcRow = {
  id: number;
  name: string;
  type: string;
  lookTypeId: number;
  town: string;
  published: boolean;
};

export default function AdminNpcsPage() {
  const table = useServerTable();

  const { data, isLoading, isValidating, mutate } = useSWR<PaginatedResult<NpcRow>>(
    `/api/admin/npcs?${table.buildQueryParams().toString()}`,
    fetcher,
  );

  async function handleDelete(id: number) {
    const response = await fetch(`/api/admin/npcs/${id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Não foi possível remover.");
      return;
    }
    toast.success("NPC removido.");
    mutate();
  }

  const columns: ColumnDef<NpcRow>[] = [
    { accessorKey: "name", header: "Nome" },
    { accessorKey: "type", header: "Tipo" },
    { accessorKey: "lookTypeId", header: "Looktype" },
    { accessorKey: "town", header: "Cidade" },
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
          <Link href={`/admin/npcs/${row.original.id}`}>
            <Button variant="ghost" size="icon-sm" title="Editar">
              <Pencil className="size-4" />
            </Button>
          </Link>
          <ConfirmDialog
            trigger={
              <Button variant="destructive" size="icon-sm" title="Excluir">
                <Trash2 className="size-4" />
              </Button>
            }
            title="Remover"
            description="Remove o NPC do banco e os arquivos gerados (data/npc/{nome}.xml)."
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
          <h1 className="text-2xl font-semibold">NPCs</h1>
          <p className="text-muted-foreground">
            Gera data/npc/{"{nome}"}.xml (+ script quando aplicável) no servidor.
          </p>
        </div>
        <Link href="/admin/npcs/new">
          <Button>
            <Plus className="size-4" />
            Novo
          </Button>
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        isFiltering={!isLoading && isValidating}
        searchPlaceholder="Buscar NPC..."
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
