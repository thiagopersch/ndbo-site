"use client";

import Link from "next/link";
import useSWR from "swr";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { fetcher } from "@/lib/fetcher";
import type { VocationXmlData } from "@/lib/vocation-xml";
import type { PaginatedResult } from "@/lib/pagination";
import { useServerTable } from "@/hooks/use-server-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { XmlImportDialog } from "@/components/shared/xml-import-dialog";
import { EntityThumb } from "@/components/shared/entity-thumb";
import { useEntityImages } from "@/components/shared/use-entity-images";
import { PublishedToggle } from "@/components/shared/published-toggle";
import type { FilterFieldConfig } from "@/components/shared/advanced-filter-panel";

type VocationRow = VocationXmlData;
type ClassOption = { id: number; name: string };
type UniverseOption = { id: number; name: string };

// eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page route
const exportXmlLink = <a href="/api/admin/vocations/export" />;

export default function AdminVocationsPage() {
  const table = useServerTable();

  const { data: classesData } = useSWR<PaginatedResult<ClassOption>>(
    "/api/admin/vocation-classes?pageSize=100",
    fetcher,
  );
  const { data: universesData } = useSWR<PaginatedResult<UniverseOption>>(
    "/api/admin/vocation-universes?pageSize=100",
    fetcher,
  );

  const { data, isLoading, isValidating, mutate } = useSWR<
    PaginatedResult<VocationRow>
  >(`/api/admin/vocations?${table.buildQueryParams().toString()}`, fetcher);

  const images = useEntityImages(
    "vocation",
    (data?.data ?? []).map((v) => v.id),
  );

  async function handleDelete(id: number) {
    const response = await fetch(`/api/admin/vocations/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      toast.error("Não foi possível remover a vocação.");
      return;
    }

    toast.success("Vocação removida.");
    mutate();
  }

  const filterFields: FilterFieldConfig[] = [
    {
      key: "typeClassId",
      label: "Classe",
      type: "select",
      options: (classesData?.data ?? []).map((c) => ({
        value: String(c.id),
        label: c.name,
      })),
    },
    {
      key: "typeUniverseId",
      label: "Universo",
      type: "select",
      options: (universesData?.data ?? []).map((u) => ({
        value: String(u.id),
        label: u.name,
      })),
    },
    {
      key: "needpremium",
      label: "Premium",
      type: "select",
      options: [
        { value: "true", label: "Sim" },
        { value: "false", label: "Não" },
      ],
    },
    {
      key: "published",
      label: "Publicada",
      type: "select",
      options: [
        { value: "true", label: "Sim" },
        { value: "false", label: "Não" },
      ],
    },
  ];

  const columns: ColumnDef<VocationRow>[] = [
    { accessorKey: "id", header: "ID" },
    {
      id: "image",
      header: "Imagem",
      cell: ({ row }) => (
        <EntityThumb
          entityType="vocation"
          id={row.original.id}
          name={row.original.name}
          image={images.get(row.original.id) ?? null}
        />
      ),
    },
    { accessorKey: "name", header: "Nome" },
    { accessorKey: "description", header: "Descrição" },
    {
      accessorKey: "typeClassName",
      header: "Classe",
      cell: ({ row }) => row.original.typeClassName || "—",
    },
    {
      accessorKey: "typeUniverseName",
      header: "Universo",
      cell: ({ row }) => row.original.typeUniverseName || "—",
    },
    {
      accessorKey: "needpremium",
      header: "Premium",
      cell: ({ row }) => (
        <Badge variant={row.original.needpremium ? "default" : "secondary"}>
          {row.original.needpremium ? "Sim" : "Não"}
        </Badge>
      ),
    },
    {
      accessorKey: "published",
      header: "Publicada",
      cell: ({ row }) => (
        <PublishedToggle
          endpoint={`/api/admin/vocations/${row.original.id}/publish`}
          published={row.original.published}
          onToggled={() => mutate()}
        />
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
            render={<Link href={`/admin/vocations/${row.original.id}`} />}
          >
            <Pencil className="size-4" />
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon-sm">
                <Trash2 className="size-4" />
              </Button>
            }
            title="Remover vocação"
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
        <h1 className="text-2xl font-semibold">Vocações</h1>
        <p className="text-muted-foreground">
          CRUD de vocações exportável para o <code>vocations.xml</code> do
          servidor.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        isFiltering={!isLoading && isValidating}
        searchPlaceholder="Buscar por nome ou descrição..."
        searchValue={table.searchInput}
        onSearchChange={table.handleSearchChange}
        filters={filterFields}
        filterValues={table.draftFilters}
        onFilterValuesChange={table.setDraftFilters}
        onApplyFilters={table.applyFilters}
        onClearFilters={table.clearFilters}
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
              endpoint="/api/admin/vocations/import"
              title="Importar vocations.xml"
              description={
                <>
                  Envie um arquivo no formato do <code>vocations.xml</code> do
                  OTServer. As classes (<code>type_class</code>) e universos (
                  <code>type_universe</code>) são resolvidos pelo nome, criando
                  novos registros automaticamente quando necessário. Vocações
                  com dados inválidos são ignoradas e reportadas ao final.
                </>
              }
              replaceLabel="Substituir todas as vocações existentes antes de importar"
              itemLabel="vocação(ões)"
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
              render={<Link href="/admin/vocations/new" />}
            >
              <Plus className="size-4" />
              Nova vocação
            </Button>
          </>
        }
      />
    </div>
  );
}
