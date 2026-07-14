import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { vocationToInput } from "@/lib/vocation-mapper";
import { VocationForm } from "@/components/admin/vocations/vocation-form";

export const metadata: Metadata = {
  title: "Editar vocação",
};

export default async function EditVocationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vocation = await prisma.vocation.findUnique({ where: { id: Number(id) } });

  if (!vocation) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar vocação: {vocation.name}</h1>
        <p className="text-muted-foreground">Preencha os dados e acompanhe o XML gerado ao lado.</p>
      </div>
      <VocationForm vocationId={vocation.id} initialValues={vocationToInput(vocation)} />
    </div>
  );
}
