"use client";

import useSWR from "swr";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";

import { fetcher } from "@/lib/fetcher";
import type { Post } from "@/lib/generated/prisma/client";
import type { PaginatedResult } from "@/lib/pagination";
import { useServerTable } from "@/hooks/use-server-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PostFormDialog } from "@/components/admin/posts/post-form-dialog";

export default function AdminPostsPage() {
  const table = useServerTable();

  const { data, isLoading, isValidating, mutate } = useSWR<PaginatedResult<Post>>(
    `/api/admin/posts?${table.buildQueryParams().toString()}`,
    fetcher
  );

  async function handleDelete(id: number) {
    const response = await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });

    if (!response.ok) {
      toast.error("Não foi possível remover o post.");
      return;
    }

    toast.success("Post removido.");
    mutate();
  }

  const columns: ColumnDef<Post>[] = [
    { accessorKey: "title", header: "Título" },
    { accessorKey: "slug", header: "Slug" },
    {
      accessorKey: "published",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.published ? "default" : "secondary"}>
          {row.original.published ? "Publicado" : "Rascunho"}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Criado em",
      cell: ({ row }) => dayjs(row.original.createdAt).format("DD/MM/YYYY HH:mm"),
    },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <PostFormDialog
            post={row.original}
            onSaved={() => mutate()}
            trigger={
              <Button variant="ghost" size="icon-sm">
                <Pencil className="size-4" />
              </Button>
            }
          />
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon-sm">
                <Trash2 className="size-4" />
              </Button>
            }
            title="Remover post"
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
          <h1 className="text-2xl font-semibold">Posts</h1>
          <p className="text-muted-foreground">Notícias e posts exibidos no site.</p>
        </div>
        <PostFormDialog
          onSaved={() => mutate()}
          trigger={
            <Button>
              <Plus className="size-4" />
              Novo post
            </Button>
          }
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        isFiltering={!isLoading && isValidating}
        searchPlaceholder="Buscar por título..."
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
