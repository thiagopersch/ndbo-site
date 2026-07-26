import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { wallBrushToFormInput } from "@/lib/wall-mapper";
import { WallForm } from "@/components/admin/walls/wall-form";
import { DuplicateButton } from "@/components/shared/duplicate-button";

export const metadata: Metadata = {
  title: "Editar wall",
};

export default async function EditWallPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const brush = await prisma.wallBrush.findUnique({ where: { id: Number(id) } });

  if (!brush) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Editar wall: {brush.name}</h1>
          <p className="text-muted-foreground">Preencha os dados e acompanhe o XML gerado ao lado.</p>
        </div>
        <DuplicateButton
          endpoint={`/api/admin/walls/${brush.id}/duplicate`}
          editPathBase="/admin/walls"
          variant="header"
        />
      </div>
      <WallForm brushId={brush.id} initialValues={wallBrushToFormInput(brush)} />
    </div>
  );
}
