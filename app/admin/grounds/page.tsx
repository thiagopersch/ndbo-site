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
import { EntityThumb } from "@/components/shared/entity-thumb";
import { useEntityImages } from "@/components/shared/use-entity-images";

type GroundRow = {
  id: number;
  name: string;
  serverLookId: number;
  zOrder: number;
  soloOptional: boolean;
};

// eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page route
const exportXmlLink = <a href="/api/admin/grounds/export" />;

export default function AdminGroundsPage() {
  const table = useServerTable();

  const { data, isLoading, isValidating, mutate } = useSWR<
    PaginatedResult<GroundRow>
  >(`/api/admin/grounds?${table.buildQueryParams().toString()}`, fetcher);

  const images = useEntityImages(
    "item",
    (data?.data ?? []).map((g) => g.serverLookId),
  );

  async function handleDelete(id: number) {
    const response = await fetch(`/api/admin/grounds/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      toast.error("Não foi possível remover o ground.");
      return;
    }

    toast.success("Ground removido.");
    mutate();
  }

  const columns: ColumnDef<GroundRow>[] = [
    { accessorKey: "id", header: "ID" },
    {
      id: "image",
      header: "Imagem",
      cell: ({ row }) => (
        <EntityThumb
          entityType="item"
          id={row.original.serverLookId}
          name={row.original.name}
          image={images.get(row.original.serverLookId) ?? null}
        />
      ),
    },
    { accessorKey: "name", header: "Nome" },
    { accessorKey: "serverLookId", header: "server_lookid" },
    { accessorKey: "zOrder", header: "z-order" },
    {
      accessorKey: "soloOptional",
      header: "Solo optional",
      cell: ({ row }) => (
        <Badge variant={row.original.soloOptional ? "default" : "secondary"}>
          {row.original.soloOptional ? "Sim" : "Não"}
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
            render={<Link href={`/admin/grounds/${row.original.id}`} />}
          >
            <Pencil className="size-4" />
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon-sm">
                <Trash2 className="size-4" />
              </Button>
            }
            title="Remover ground"
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
        <h1 className="text-2xl font-semibold">Grounds</h1>
        <p className="text-muted-foreground">
          CRUD de brushes exportável para o <code>grounds.xml</code> (RME).
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
              endpoint="/api/admin/grounds/import"
              title="Importar grounds.xml"
              description={
                <>
                  Envie um arquivo no formato do <code>grounds.xml</code> do
                  RME. Brushes com dados inválidos são ignorados e reportados ao
                  final.
                </>
              }
              replaceLabel="Substituir todos os grounds existentes antes de importar"
              itemLabel="ground(s)"
              onImported={() => mutate()}
            />
            <Button
              variant="outline"
              nativeButton={false}
              render={exportXmlLink}
            >
              <Download className="size-4" />
              Exportar XML
            </Button>
            <Button
              nativeButton={false}
              render={<Link href="/admin/grounds/new" />}
            >
              <Plus className="size-4" />
              Novo ground
            </Button>
          </>
        }
      />
    </div>
  );
}
