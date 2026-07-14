import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { borderToFormInput } from "@/lib/border-mapper";
import { BorderForm } from "@/components/admin/borders/border-form";

export const metadata: Metadata = {
  title: "Editar border",
};

export default async function EditBorderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const border = await prisma.border.findUnique({ where: { id: Number(id) } });

  if (!border) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar border: {border.name}</h1>
        <p className="text-muted-foreground">Preencha os dados e acompanhe o XML gerado ao lado.</p>
      </div>
      <BorderForm isEditing initialValues={borderToFormInput(border)} />
    </div>
  );
}
