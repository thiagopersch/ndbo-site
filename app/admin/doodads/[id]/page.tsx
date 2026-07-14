import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { doodadBrushToFormInput } from "@/lib/doodad-mapper";
import { DoodadForm } from "@/components/admin/doodads/doodad-form";

export const metadata: Metadata = {
  title: "Editar doodad",
};

export default async function EditDoodadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const brush = await prisma.doodadBrush.findUnique({ where: { id: Number(id) } });

  if (!brush) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar doodad: {brush.name}</h1>
        <p className="text-muted-foreground">Preencha os dados e acompanhe o XML gerado ao lado.</p>
      </div>
      <DoodadForm brushId={brush.id} initialValues={doodadBrushToFormInput(brush)} />
    </div>
  );
}
