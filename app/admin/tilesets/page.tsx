"use client";

import Link from "next/link";
import useSWR from "swr";
import type { ColumnDef } from "@tanstack/react-table";
import { Copy, Download, ListTodo, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { fetcher } from "@/lib/fetcher";
import type { PaginatedResult } from "@/lib/pagination";
import { useServerTable } from "@/hooks/use-server-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TilesetImportDialog } from "@/components/admin/tilesets/tileset-import-dialog";
import { IntegrityCheckDialog } from "@/components/admin/tilesets/integrity-check-dialog";

type TilesetRow = {
  id: number;
  name: string;
  description: string | null;
  order: number;
  active: boolean;
  _count: { categories: number };
};

// eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page route
const exportAllXmlLink = <a href="/api/admin/tilesets/export" />;

export default function AdminTilesetsPage() {
  const table = useServerTable();

  const { data, isLoading, isValidating, mutate } = useSWR<PaginatedResult<TilesetRow>>(
    `/api/admin/tilesets?${table.buildQueryParams().toString()}`,
    fetcher
  );

  async function handleDelete(id: number) {
    const response = await fetch(`/api/admin/tilesets/${id}`, { method: "DELETE" });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      toast.error(body?.error ?? "Não foi possível remover o tileset. Ele ainda tem categorias — mova-as primeiro na tela de detalhe.");
      return;
    }

    toast.success("Tileset removido.");
    mutate();
  }

  async function handleDuplicate(id: number) {
    const response = await fetch(`/api/admin/tilesets/${id}/duplicate`, { method: "POST" });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      toast.error(body?.error ?? "Não foi possível duplicar o tileset.");
      return;
    }

    toast.success(`Tileset duplicado como "${body.tileset.name}".`);
    mutate();
  }

  const columns: ColumnDef<TilesetRow>[] = [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "name", header: "Nome" },
    {
      accessorKey: "order",
      header: "Ordem",
    },
    {
      id: "categories",
      header: "Categorias",
      cell: ({ row }) => row.original._count.categories,
    },
    {
      accessorKey: "active",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.active ? "default" : "secondary"}>
          {row.original.active ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            nativeButton={false}
            render={<Link href={`/admin/tilesets/${row.original.id}`} />}
            title="Editar / gerenciar categorias"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => handleDuplicate(row.original.id)}
            title="Duplicar"
          >
            <Copy className="size-4" />
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon-sm" title="Excluir">
                <Trash2 className="size-4" />
              </Button>
            }
            title="Remover tileset"
            description="Esta ação não pode ser desfeita. Se este tileset ainda tiver categorias vinculadas, a exclusão será bloqueada — mova-as primeiro na tela de detalhe."
            confirmLabel="Remover"
            onConfirm={() => handleDelete(row.original.id)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Tilesets</h1>
        <p className="text-muted-foreground">
          Gerenciamento visual do <code>tilesets.xml</code> (RME) — Tilesets, Categorias e os
          brushes/itens vinculados a cada uma.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        isFiltering={!isLoading && isValidating}
        searchPlaceholder="Buscar por nome, brush ou ID de item..."
        searchValue={table.searchInput}
        onSearchChange={table.handleSearchChange}
        manualPagination
        pageIndex={table.pageIndex}
        pageSize={table.pageSize}
        pageCount={data?.pageCount ?? 1}
        totalCount={data?.total}
        onPageChange={table.setPageIndex}
        onPageSizeChange={table.setPageSize}
        toolbar={
          <>
            <Button variant="outline" nativeButton={false} render={<Link href="/admin/tilesets/uncategorized" />}>
              <ListTodo className="size-4" />
              Brushes sem categoria
            </Button>
            <IntegrityCheckDialog />
            <TilesetImportDialog onImported={() => mutate()} />
            <Button variant="outline" nativeButton={false} render={exportAllXmlLink}>
              <Download className="size-4" />
              Exportar todos (XML)
            </Button>
            <Button nativeButton={false} render={<Link href="/admin/tilesets/new" />}>
              <Plus className="size-4" />
              Novo tileset
            </Button>
          </>
        }
      />
    </div>
  );
}
