"use client";

import Link from "next/link";
import useSWR from "swr";
import { ExternalLink } from "lucide-react";

import { fetcher } from "@/lib/fetcher";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { CategoryRow } from "@/components/admin/tilesets/category-item";
import { CategoryItemEntriesEditor } from "@/components/admin/tilesets/category-item-entries-editor";

type BrushRef = { id: number; name: string };

type CategoryDetailResponse = {
  category: {
    grounds: BrushRef[];
    walls: BrushRef[];
    doodads: BrushRef[];
  };
};

type CategoryDetailDialogProps = {
  category: CategoryRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
};

function BrushLinkList({ title, items, href }: { title: string; items: BrushRef[]; href: (id: number) => string }) {
  if (items.length === 0) return null;

  return (
    <div>
      <p className="mb-1 text-sm font-medium text-muted-foreground">
        {title} ({items.length})
      </p>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={href(item.id)}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {item.name}
              <ExternalLink className="size-3" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CategoryDetailDialog({ category, open, onOpenChange, onChanged }: CategoryDetailDialogProps) {
  const { data } = useSWR<CategoryDetailResponse>(
    category.type === "BRUSH" && open ? `/api/admin/tilesets/categories/${category.id}` : null,
    fetcher
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {category.name}
            <Badge variant={category.type === "BRUSH" ? "default" : "secondary"}>{category.type}</Badge>
          </DialogTitle>
          <DialogDescription>
            {category.type === "BRUSH"
              ? "Brushes vinculados a esta categoria — edite-os nos CRUDs de Ground/Wall/Doodad; a categoria é sincronizada automaticamente."
              : "Entradas de item (ID único ou intervalo) desta categoria."}
          </DialogDescription>
        </DialogHeader>

        {category.type === "BRUSH" ? (
          <div className="flex flex-col gap-4">
            <BrushLinkList title="Grounds" items={data?.category.grounds ?? []} href={(id) => `/admin/grounds/${id}`} />
            <BrushLinkList title="Walls" items={data?.category.walls ?? []} href={(id) => `/admin/walls/${id}`} />
            <BrushLinkList title="Doodads" items={data?.category.doodads ?? []} href={(id) => `/admin/doodads/${id}`} />
            {data &&
              data.category.grounds.length === 0 &&
              data.category.walls.length === 0 &&
              data.category.doodads.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum brush vinculado ainda. Associe pelo campo &quot;Categoria do Tileset&quot; no form de
                  Ground/Wall/Doodad.
                </p>
              )}
          </div>
        ) : (
          <CategoryItemEntriesEditor categoryId={category.id} onChanged={onChanged} />
        )}
      </DialogContent>
    </Dialog>
  );
}
