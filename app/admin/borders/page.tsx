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

type BorderRow = {
  id: number;
  name: string;
  group: number | null;
  optional: boolean;
};

// eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page route
const exportXmlLink = <a href="/api/admin/borders/export" />;

export default function AdminBordersPage() {
  const table = useServerTable();

  const { data, isLoading, isValidating, mutate } = useSWR<PaginatedResult<BorderRow>>(
    `/api/admin/borders?${table.buildQueryParams().toString()}`,
    fetcher
  );

  async function handleDelete(id: number) {
    const response = await fetch(`/api/admin/borders/${id}`, { method: "DELETE" });

    if (!response.ok) {
      toast.error("Não foi possível remover o border.");
      return;
    }

    toast.success("Border removido.");
    mutate();
  }

  const columns: ColumnDef<BorderRow>[] = [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "name", header: "Nome" },
    {
      accessorKey: "group",
      header: "Group",
      cell: ({ row }) => row.original.group ?? "—",
    },
    {
      accessorKey: "optional",
      header: "Opcional",
      cell: ({ row }) => (
        <Badge variant={row.original.optional ? "default" : "secondary"}>
          {row.original.optional ? "Sim" : "Não"}
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
            render={<Link href={`/admin/borders/${row.original.id}`} />}
          >
            <Pencil className="size-4" />
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon-sm">
                <Trash2 className="size-4" />
              </Button>
            }
            title="Remover border"
            description="Esta ação não pode ser desfeita. Grounds que referenciam esse border ficarão com um id inválido."
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
        <h1 className="text-2xl font-semibold">Borders</h1>
        <p className="text-muted-foreground">
          CRUD de bordas exportável para o <code>borders.xml</code> (RME).
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
              endpoint="/api/admin/borders/import"
              title="Importar borders.xml"
              description={
                <>
                  Envie um arquivo no formato do <code>borders.xml</code> do RME. Borders com
                  dados inválidos ou id duplicado são ignorados e reportados ao final.
                </>
              }
              replaceLabel="Substituir todos os borders existentes antes de importar"
              itemLabel="border(s)"
              onImported={() => mutate()}
            />
            <Button variant="outline" nativeButton={false} render={exportXmlLink}>
              <Download className="size-4" />
              Exportar XML
            </Button>
            <Button nativeButton={false} render={<Link href="/admin/borders/new" />}>
              <Plus className="size-4" />
              Novo border
            </Button>
          </>
        }
      />
    </div>
  );
}
