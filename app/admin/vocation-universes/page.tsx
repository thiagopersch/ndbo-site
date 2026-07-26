"use client";

import useSWR from "swr";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { fetcher } from "@/lib/fetcher";
import type { VocationTypeUniverse } from "@/lib/generated/prisma/client";
import type { PaginatedResult } from "@/lib/pagination";
import { vocationTypeSchema, type VocationTypeInput } from "@/lib/validations/admin/vocation";
import { useServerTable } from "@/hooks/use-server-table";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DuplicateButton } from "@/components/shared/duplicate-button";
import { SimpleFormDialog, type SimpleField } from "@/components/shared/simple-form-dialog";

const fields: SimpleField<VocationTypeInput>[] = [{ name: "name", label: "Nome (ex.: Dragon Ball, Naruto)" }];

export default function AdminVocationUniversesPage() {
  const table = useServerTable();

  const { data, isLoading, isValidating, mutate } = useSWR<PaginatedResult<VocationTypeUniverse>>(
    `/api/admin/vocation-universes?${table.buildQueryParams().toString()}`,
    fetcher
  );

  async function handleDelete(id: number) {
    const response = await fetch(`/api/admin/vocation-universes/${id}`, { method: "DELETE" });

    if (!response.ok) {
      toast.error("Não foi possível remover. Verifique se nenhuma vocação a utiliza.");
      return;
    }

    toast.success("Removido.");
    mutate();
  }

  async function createOrUpdate(values: VocationTypeInput, id?: number) {
    const response = await fetch(
      id ? `/api/admin/vocation-universes/${id}` : "/api/admin/vocation-universes",
      {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      }
    );

    if (response.ok) mutate();
    return response.ok;
  }

  const columns: ColumnDef<VocationTypeUniverse>[] = [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "name", header: "Nome" },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <SimpleFormDialog
            title="Editar universo"
            schema={vocationTypeSchema}
            fields={fields}
            defaultValues={{ name: row.original.name }}
            successMessage="Atualizado com sucesso."
            onSubmit={(values) => createOrUpdate(values, row.original.id)}
            trigger={
              <Button variant="ghost" size="icon-sm">
                <Pencil className="size-4" />
              </Button>
            }
          />
          <DuplicateButton
            endpoint={`/api/admin/vocation-universes/${row.original.id}/duplicate`}
            editPathBase="/admin/vocation-universes"
            onDuplicated={() => mutate()}
          />
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon-sm">
                <Trash2 className="size-4" />
              </Button>
            }
            title="Remover universo"
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Universos de vocação</h1>
          <p className="text-muted-foreground">
            Opções de <code>type_universe</code> disponíveis no formulário de vocação.
          </p>
        </div>
        <SimpleFormDialog
          title="Novo universo"
          schema={vocationTypeSchema}
          fields={fields}
          defaultValues={{ name: "" }}
          successMessage="Criado com sucesso."
          onSubmit={(values) => createOrUpdate(values)}
          trigger={
            <Button>
              <Plus className="size-4" />
              Novo universo
            </Button>
          }
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        isFiltering={!isLoading && isValidating}
        searchPlaceholder="Buscar universo..."
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
