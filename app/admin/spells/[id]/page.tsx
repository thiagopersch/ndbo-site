import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { spellToFormInput } from "@/lib/spell-mapper";
import { SpellForm } from "@/components/admin/spells/spell-form";

export const metadata: Metadata = {
  title: "Editar spell",
};

export default async function EditSpellPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const spell = await prisma.spell.findUnique({
    where: { id: Number(id) },
    include: { vocations: true },
  });

  if (!spell) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar spell: {spell.name}</h1>
        <p className="text-muted-foreground">Preencha os dados e acompanhe o XML gerado ao lado.</p>
      </div>
      <SpellForm spellId={spell.id} initialValues={spellToFormInput(spell)} />
    </div>
  );
}
