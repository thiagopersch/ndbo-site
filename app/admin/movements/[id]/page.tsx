import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { movementRowToFormInput } from "@/lib/movement-mapper";
import { MovementForm } from "@/components/admin/movements/movement-form";

export const metadata: Metadata = {
  title: "Editar movement",
};

export default async function EditMovementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const movement = await prisma.movement.findUnique({
    where: { id: Number(id) },
    include: { vocations: { select: { vocationId: true } } },
  });

  if (!movement) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Editar movement #{movement.id} ({movement.eventType})
        </h1>
        <p className="text-muted-foreground">Preencha os dados e acompanhe o XML gerado ao lado.</p>
      </div>
      <MovementForm movementId={movement.id} initialValues={movementRowToFormInput(movement)} />
    </div>
  );
}
