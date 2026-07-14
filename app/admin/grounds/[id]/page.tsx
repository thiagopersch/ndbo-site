import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { groundToFormInput } from "@/lib/ground-mapper";
import { GroundForm } from "@/components/admin/grounds/ground-form";

export const metadata: Metadata = {
  title: "Editar ground",
};

export default async function EditGroundPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ground = await prisma.ground.findUnique({ where: { id: Number(id) } });

  if (!ground) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar ground: {ground.name}</h1>
        <p className="text-muted-foreground">Preencha os dados e acompanhe o XML gerado ao lado.</p>
      </div>
      <GroundForm groundId={ground.id} initialValues={groundToFormInput(ground)} />
    </div>
  );
}
