"use client";

import Link from "next/link";
import useSWR from "swr";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, Info, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { fetcher } from "@/lib/fetcher";
import type { PaginatedResult } from "@/lib/pagination";
import {
  ITEM_TYPES,
  SLOT_TYPES,
  WEAPON_TYPES,
} from "@/lib/validations/admin/item";
import { useServerTable } from "@/hooks/use-server-table";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DuplicateButton } from "@/components/shared/duplicate-button";
import { CopyXmlButton } from "@/components/shared/copy-xml-button";
import { XmlImportDialog } from "@/components/shared/xml-import-dialog";
import { XmlBundlePanel } from "@/components/shared/xml-bundle-panel";
import { EntityThumb } from "@/components/shared/entity-thumb";
import { EntityImageUploadDialog } from "@/components/shared/entity-image-upload-dialog";
import { useEntityImages } from "@/components/shared/use-entity-images";
import { PublishedToggle } from "@/components/shared/published-toggle";
import type { FilterFieldConfig } from "@/components/shared/advanced-filter-panel";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ITEM_SKILL_KEYS } from "@/lib/validations/admin/item";

const ITEM_SKILL_LABELS: Record<(typeof ITEM_SKILL_KEYS)[number], string> = {
  sword: "Espada (Sword)",
  axe: "Machado (Axe)",
  club: "Maça (Club)",
  distance: "Distância (Distance)",
  shielding: "Escudo (Shielding)",
  fishing: "Pesca (Fishing)",
  fist: "Punho (Fist)",
};

/** Rótulos dos campos escalares de regen/stat-granting — mesmo grupo mostrado na aba
 * "Luz & Regen" do form de Item. */
const SCALAR_ATTRIBUTE_LABELS = {
  speed: "Speed",
  healthGain: "Health gain",
  healthTicks: "Health ticks",
  manaGain: "Mana gain",
  manaTicks: "Mana ticks",
  soulPoints: "Soul points",
  soulPointsPercent: "Soul points %",
  maxHitPoints: "Max hit points",
  maxHitPointsPercent: "Max hit points %",
  maxManaPoints: "Max mana points",
  maxManaPointsPercent: "Max mana points %",
  magicLevelPoints: "Magic level points",
  magicLevelPointsPercent: "Magic level points %",
  increaseMagicValue: "Increase magic value",
  increaseMagicPercent: "Increase magic %",
  increaseHealingValue: "Increase healing value",
  increaseHealingPercent: "Increase healing %",
} as const;

type ScalarAttributeKey = keyof typeof SCALAR_ATTRIBUTE_LABELS;

type ItemRow = {
  id: number;
  name: string;
  article: string;
  description: string;
  type: string;
  weaponType: string;
  slotType: string;
  weight: number;
  attack: number;
  defense: number;
  armor: number;
  worth: number;
  skills: Partial<Record<(typeof ITEM_SKILL_KEYS)[number], number>>;
  published: boolean;
  absorbPercent: Record<string, number>;
  reflectPercent: Record<string, number>;
  fieldAbsorbPercent: Record<string, number>;
  elements: Record<string, number>;
  extraAttributes: { key: string; value: string }[];
} & Record<ScalarAttributeKey, number>;

/** Junta todos os grupos de atributo (skills, absorb/reflect/field absorb %, elementos,
 * os escalares de regen/stat-granting e os atributos extras livres) numa única lista
 * "label: valor", ignorando o que estiver zerado/vazio — usado pela coluna "Atributos". */
function getItemAttributeEntries(row: ItemRow): { label: string; value: string }[] {
  const entries: { label: string; value: string }[] = [];

  for (const [key, value] of Object.entries(row.skills ?? {})) {
    if (!value) continue;
    entries.push({ label: ITEM_SKILL_LABELS[key as (typeof ITEM_SKILL_KEYS)[number]] ?? key, value: String(value) });
  }

  const groups: [Record<string, number> | undefined, string][] = [
    [row.elements, "Elemento"],
    [row.absorbPercent, "Absorb %"],
    [row.reflectPercent, "Reflect %"],
    [row.fieldAbsorbPercent, "Field absorb %"],
  ];
  for (const [group, groupLabel] of groups) {
    for (const [key, value] of Object.entries(group ?? {})) {
      if (!value) continue;
      entries.push({ label: `${groupLabel}: ${key}`, value: String(value) });
    }
  }

  for (const key of Object.keys(SCALAR_ATTRIBUTE_LABELS) as ScalarAttributeKey[]) {
    const value = row[key];
    if (!value) continue;
    entries.push({ label: SCALAR_ATTRIBUTE_LABELS[key], value: String(value) });
  }

  for (const attribute of row.extraAttributes ?? []) {
    if (!attribute.key) continue;
    entries.push({ label: attribute.key, value: attribute.value });
  }

  return entries;
}

// eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page route
const exportXmlLink = <a href="/api/admin/items/export" />;

export default function AdminItemsPage() {
  const table = useServerTable();

  const { data, isLoading, isValidating, mutate } = useSWR<
    PaginatedResult<ItemRow>
  >(`/api/admin/items?${table.buildQueryParams().toString()}`, fetcher);

  const images = useEntityImages(
    "item",
    (data?.data ?? []).map((i) => i.id),
  );

  async function handleDelete(id: number) {
    const response = await fetch(`/api/admin/items/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      toast.error("Não foi possível remover o item.");
      return;
    }

    toast.success("Item removido.");
    mutate();
  }

  const filterFields: FilterFieldConfig[] = [
    {
      key: "type",
      label: "Tipo",
      type: "select",
      options: ITEM_TYPES.filter(Boolean).map((type) => ({
        value: type,
        label: type,
      })),
    },
    {
      key: "weaponType",
      label: "Weapon type",
      type: "select",
      options: WEAPON_TYPES.filter(Boolean).map((type) => ({
        value: type,
        label: type,
      })),
    },
    {
      key: "slotType",
      label: "Slot type",
      type: "select",
      options: SLOT_TYPES.filter(Boolean).map((slot) => ({
        value: slot,
        label: slot,
      })),
    },
    {
      key: "published",
      label: "Publicado",
      type: "select",
      options: [
        { value: "true", label: "Publicado" },
        { value: "false", label: "Não publicado" },
      ],
    },
    { key: "idMin", label: "ID mínimo", type: "number" },
    { key: "idMax", label: "ID máximo", type: "number" },
    {
      key: "hasImage",
      label: "Possui imagem",
      type: "select",
      options: [
        { value: "true", label: "Sim" },
        { value: "false", label: "Não" },
      ],
    },
  ];

  const columns: ColumnDef<ItemRow>[] = [
    { accessorKey: "id", header: "ID" },
    {
      id: "image",
      header: "Imagem",
      cell: ({ row }) => (
        <EntityThumb
          entityType="item"
          id={row.original.id}
          name={row.original.name}
          image={images.get(row.original.id) ?? null}
        />
      ),
    },
    { accessorKey: "name", header: "Nome" },
    {
      accessorKey: "description",
      header: "Descrição",
      cell: ({ row }) => {
        if (!row.original.description) return "—";

        return (
          <Tooltip>
            <TooltipTrigger className="inline-flex text-muted-foreground">
              <Info className="size-4" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{row.original.description}</p>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      accessorKey: "type",
      header: "Tipo",
      cell: ({ row }) => row.original.type || "—",
    },
    {
      accessorKey: "weaponType",
      header: "Weapon type",
      cell: ({ row }) => row.original.weaponType || "—",
    },
    { accessorKey: "weight", header: "Peso" },
    { accessorKey: "attack", header: "Attack" },
    { accessorKey: "defense", header: "Defense" },
    { accessorKey: "armor", header: "Armor" },
    { accessorKey: "worth", header: "Worth" },
    {
      accessorKey: "published",
      header: "Publicado",
      cell: ({ row }) => (
        <PublishedToggle
          endpoint={`/api/admin/items/${row.original.id}/publish`}
          published={row.original.published}
          onToggled={() => mutate()}
        />
      ),
    },
    {
      id: "attributes",
      header: "Atributos",
      cell: ({ row }) => {
        const entries = getItemAttributeEntries(row.original);

        if (entries.length === 0) return "—";

        return (
          <Tooltip>
            <TooltipTrigger className="cursor-default underline decoration-dotted underline-offset-2">
              {entries.length}
            </TooltipTrigger>
            <TooltipContent>
              <div className="flex flex-col gap-0.5">
                {entries.map((entry, index) => (
                  <div key={`${entry.label}-${index}`}>
                    {entry.label}: {entry.value}
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      },
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
            render={<Link href={`/admin/items/${row.original.id}`} />}
            title="Editar"
          >
            <Pencil className="size-4" />
          </Button>
          <EntityImageUploadDialog
            entityType="item"
            id={row.original.id}
            name={row.original.name}
            image={images.get(row.original.id) ?? null}
            onUploaded={() => mutate()}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            nativeButton={false}
            render={<a href={`/api/admin/items/${row.original.id}/export`} />}
            title="Exportar XML"
          >
            <Download className="size-4" />
          </Button>
          <DuplicateButton
            endpoint={`/api/admin/items/${row.original.id}/duplicate`}
            editPathBase="/admin/items"
            onDuplicated={() => mutate()}
          />
          <ConfirmDialog
            trigger={
              <Button variant="destructive" size="icon-sm" title="Excluir">
                <Trash2 className="size-4" />
              </Button>
            }
            title="Remover item"
            description="Esta ação não pode ser desfeita."
            confirmLabel="Remover"
            onConfirm={() => handleDelete(row.original.id)}
          />
        </div>
      ),
    },
  ];

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Items</h1>
          <p className="text-muted-foreground">
            CRUD de items exportável para o <code>items.xml</code> do servidor.
          </p>
        </div>

        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          isFiltering={!isLoading && isValidating}
          searchPlaceholder="Buscar por nome ou id..."
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
                endpoint="/api/admin/items/import"
                title="Importar items.xml"
                description={
                  <>
                    Envie um arquivo no formato do <code>items.xml</code> do
                    OTServer. Entradas com <code>fromid</code>/<code>toid</code>{" "}
                    são expandidas em um item por id. Atributos não reconhecidos
                    são preservados em &quot;Atributos extras&quot;.
                  </>
                }
                replaceLabel="Substituir todos os items existentes antes de importar"
                itemLabel="item(ns)"
                onImported={() => mutate()}
              />
              <CopyXmlButton
                getText={async () => {
                  const response = await fetch("/api/admin/items/export");
                  return response.text();
                }}
              />
              <Button
                variant="outline"
                nativeButton={false}
                render={exportXmlLink}
              >
                <Download className="size-4" />
                Exportar XML
              </Button>
              <XmlBundlePanel onImported={() => mutate()} />
              <Button
                nativeButton={false}
                render={<Link href="/admin/items/new" />}
              >
                <Plus className="size-4" />
                Novo item
              </Button>
            </>
          }
        />
      </div>
    </TooltipProvider>
  );
}
