"use client";

import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { Pencil, Trash2 } from "lucide-react";

import type { Ban } from "@/lib/generated/prisma/client";
import { BAN_TYPES } from "@/lib/validations/admin/ban";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { BanFormDialog } from "@/components/admin/bans/ban-form-dialog";

export function getBanColumns(refresh: () => void, onDelete: (id: number) => void): ColumnDef<Ban>[] {
  return [
    { accessorKey: "id", header: "ID" },
    {
      accessorKey: "type",
      header: "Tipo",
      cell: ({ row }) =>
        BAN_TYPES.find((type) => type.value === row.original.type)?.label ?? row.original.type,
    },
    { accessorKey: "value", header: "Alvo" },
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
      accessorKey: "expires",
      header: "Expira em",
      cell: ({ row }) =>
        row.original.expires === 0
          ? "Permanente"
          : dayjs.unix(row.original.expires).format("DD/MM/YYYY HH:mm"),
    },
    {
      accessorKey: "added",
      header: "Criado em",
      cell: ({ row }) => dayjs.unix(row.original.added).format("DD/MM/YYYY HH:mm"),
    },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <BanFormDialog
            ban={row.original}
            onSaved={refresh}
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
            title="Remover banimento"
            description="Esta ação não pode ser desfeita."
            confirmLabel="Remover"
            onConfirm={() => onDelete(row.original.id)}
          />
        </div>
      ),
    },
  ];
}
