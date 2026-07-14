"use client";

import Link from "next/link";
import useSWR from "swr";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { fetcher } from "@/lib/fetcher";
import type { PaginatedResult } from "@/lib/pagination";
import { useServerTable } from "@/hooks/use-server-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { XmlImportDialog } from "@/components/shared/xml-import-dialog";

type WallRow = {
  id: number;
  name: string;
  type: string;
  serverLookId: number;
  draggable: boolean;
  onBlocking: boolean;
  thickness: string;
};

// eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page route
const exportXmlLink = <a href="/api/admin/walls/export" />;

export default function AdminWallsPage() {
  const table = useServerTable();

  const { data, isLoading, isValidating, mutate } = useSWR<PaginatedResult<WallRow>>(
    `/api/admin/walls?${table.buildQueryParams().toString()}`,
    fetcher
  );

  async function handleDelete(id: number) {
    const response = await fetch(`/api/admin/walls/${id}`, { method: "DELETE" });

    if (!response.ok) {
      toast.error("Não foi possível remover a wall.");
      return;
    }

    toast.success("Wall removida.");
    mutate();
  }

  const columns: ColumnDef<WallRow>[] = [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "name", header: "Nome" },
    {
      accessorKey: "type",
      header: "Tipo",
      cell: ({ row }) => <Badge variant="secondary">{row.original.type}</Badge>,
    },
    { accessorKey: "serverLookId", header: "server_lookid" },
    {
      accessorKey: "thickness",
      header: "Thickness",
      cell: ({ row }) => row.original.thickness || "—",
    },
    {
      accessorKey: "draggable",
      header: "Draggable",
      cell: ({ row }) => (
        <Badge variant={row.original.draggable ? "default" : "secondary"}>
          {row.original.draggable ? "Sim" : "Não"}
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
            render={<Link href={`/admin/walls/${row.original.id}`} />}
          >
            <Pencil className="size-4" />
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon-sm">
                <Trash2 className="size-4" />
              </Button>
            }
            title="Remover wall"
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
      <div>
        <h1 className="text-2xl font-semibold">Walls</h1>
        <p className="text-muted-foreground">
          CRUD de brushes exportável para o <code>walls.xml</code> (RME).
        </p>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        isFiltering={!isLoading && isValidating}
        searchPlaceholder="Buscar por nome..."
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
            <XmlImportDialog
              endpoint="/api/admin/walls/import"
              title="Importar walls.xml"
              description={
                <>
                  Envie um arquivo no formato do <code>walls.xml</code> do RME. Brushes com dados
                  inválidos são ignorados e reportados ao final.
                </>
              }
              replaceLabel="Substituir todas as walls existentes antes de importar"
              itemLabel="wall(s)"
              onImported={() => mutate()}
            />
            <Button variant="outline" nativeButton={false} render={exportXmlLink}>
              <Download className="size-4" />
              Exportar XML
            </Button>
            <Button nativeButton={false} render={<Link href="/admin/walls/new" />}>
              <Plus className="size-4" />
              Nova wall
            </Button>
          </>
        }
      />
    </div>
  );
}
