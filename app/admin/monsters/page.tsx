"use client";

import Link from "next/link";
import useSWR from "swr";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { fetcher } from "@/lib/fetcher";
import type { PaginatedResult } from "@/lib/pagination";
import {
  MONSTER_BESTIARY_TYPES,
  MONSTER_RACES,
} from "@/lib/validations/admin/monster";
import { useServerTable } from "@/hooks/use-server-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DuplicateButton } from "@/components/shared/duplicate-button";
import { MonsterXmlImportDialog } from "@/components/admin/monsters/monster-xml-import-dialog";
import { EntityThumb } from "@/components/shared/entity-thumb";
import { PublishedToggle } from "@/components/shared/published-toggle";
import { useEntityImages } from "@/components/shared/use-entity-images";
import type { FilterFieldConfig } from "@/components/shared/advanced-filter-panel";

type MonsterRow = {
  id: number;
  name: string;
  bestiary: string;
  category: string;
  subcategory: string;
  race: string;
  experience: number;
  speed: number;
  healthMax: number;
  published: boolean;
};

type FacetsResponse = { categories: string[]; subcategories: string[] };

// eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page route
const exportXmlLink = <a href="/api/admin/monsters/export" />;

export default function AdminMonstersPage() {
  const table = useServerTable();

  const { data: facets } = useSWR<FacetsResponse>(
    "/api/admin/monsters/facets",
    fetcher,
  );

  const { data, isLoading, isValidating, mutate } = useSWR<
    PaginatedResult<MonsterRow>
  >(`/api/admin/monsters?${table.buildQueryParams().toString()}`, fetcher);

  const images = useEntityImages(
    "monster",
    (data?.data ?? []).map((m) => m.id),
  );

  async function handleDelete(id: number) {
    const response = await fetch(`/api/admin/monsters/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      toast.error("Não foi possível remover o monstro.");
      return;
    }

    toast.success("Monstro removido.");
    mutate();
  }

  const filterFields: FilterFieldConfig[] = [
    {
      key: "bestiary",
      label: "Tipo",
      type: "select",
      options: MONSTER_BESTIARY_TYPES.map((type) => ({
        value: type,
        label: type,
      })),
    },
    {
      key: "category",
      label: "Universo pertence",
      type: "select",
      options: (facets?.categories ?? []).map((value) => ({
        value,
        label: value,
      })),
    },
    {
      key: "subcategory",
      label: "Subcategoria",
      type: "select",
      options: (facets?.subcategories ?? []).map((value) => ({
        value,
        label: value,
      })),
    },
    {
      key: "race",
      label: "Race",
      type: "select",
      options: MONSTER_RACES.map((race) => ({ value: race, label: race })),
    },
    {
      key: "expMin",
      label: "Experience (mín.)",
      type: "number",
      placeholder: "0",
    },
    {
      key: "expMax",
      label: "Experience (máx.)",
      type: "number",
      placeholder: "999999999",
    },
    { key: "hpMin", label: "HP (mín.)", type: "number", placeholder: "0" },
    {
      key: "hpMax",
      label: "HP (máx.)",
      type: "number",
      placeholder: "999999999",
    },
    {
      key: "loot",
      label: "Loot (nome ou ID do item)",
      type: "text",
      placeholder: "ex.: 2152 ou platinum",
    },
    {
      key: "attacks",
      label: "Ataques (nome)",
      type: "text",
      placeholder: "ex.: melee, fire...",
    },
    {
      key: "lookType",
      label: "Looktype (outfit)",
      type: "number",
      placeholder: "ex.: 1777",
    },
  ];

  const columns: ColumnDef<MonsterRow>[] = [
    { accessorKey: "id", header: "ID" },
    {
      id: "image",
      header: "Imagem",
      cell: ({ row }) => (
        <EntityThumb
          entityType="monster"
          id={row.original.id}
          name={row.original.name}
          image={images.get(row.original.id) ?? null}
        />
      ),
    },
    { accessorKey: "name", header: "Nome" },
    {
      accessorKey: "bestiary",
      header: "Tipo",
      cell: ({ row }) => (
        <Badge
          variant={row.original.bestiary === "boss" ? "default" : "secondary"}
        >
          {row.original.bestiary}
        </Badge>
      ),
    },
    {
      accessorKey: "category",
      header: "Universo pertence",
      cell: ({ row }) => row.original.category || "—",
    },
    {
      accessorKey: "subcategory",
      header: "Subcategoria",
      cell: ({ row }) => row.original.subcategory || "—",
    },
    { accessorKey: "race", header: "Race" },
    { accessorKey: "experience", header: "Experience" },
    { accessorKey: "healthMax", header: "HP" },
    {
      accessorKey: "published",
      header: "Publicado",
      cell: ({ row }) => (
        <PublishedToggle
          endpoint={`/api/admin/monsters/${row.original.id}/publish`}
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
            render={
              <a href={`/api/admin/monsters/${row.original.id}/export`} />
            }
            title="Exportar XML"
          >
            <Download className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            nativeButton={false}
            render={<Link href={`/admin/monsters/${row.original.id}`} />}
          >
            <Pencil className="size-4" />
          </Button>
          <DuplicateButton
            endpoint={`/api/admin/monsters/${row.original.id}/duplicate`}
            editPathBase="/admin/monsters"
            onDuplicated={() => mutate()}
          />
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon-sm">
                <Trash2 className="size-4" />
              </Button>
            }
            title="Remover monstro"
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
        <h1 className="text-2xl font-semibold">Monstros</h1>
        <p className="text-muted-foreground">
          CRUD completo de monstros do OTServer, com exportação individual (
          <code>nome_do_monstro.xml</code>) e do <code>monsters.xml</code>.
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
            <MonsterXmlImportDialog onImported={() => mutate()} />
            <Button
              variant="outline"
              nativeButton={false}
              render={exportXmlLink}
            >
              <Download className="size-4" />
              Exportar monsters.xml
            </Button>
            <Button
              nativeButton={false}
              render={<Link href="/admin/monsters/new" />}
            >
              <Plus className="size-4" />
              Novo monstro
            </Button>
          </>
        }
      />
    </div>
  );
}
