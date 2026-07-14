import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { TilesetDetail } from "@/components/admin/tilesets/tileset-detail";

export const metadata: Metadata = {
  title: "Editar tileset",
};

export default async function EditTilesetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tileset = await prisma.tileset.findUnique({ where: { id: Number(id) }, select: { id: true, name: true } });

  if (!tileset) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{tileset.name}</h1>
        <p className="text-muted-foreground">
          Gerencie as categorias deste tileset e os brushes/itens vinculados a cada uma.
        </p>
      </div>
      <TilesetDetail tilesetId={tileset.id} />
    </div>
  );
}
