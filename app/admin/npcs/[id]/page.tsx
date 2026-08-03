import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { NpcForm } from "@/components/admin/npcs/npc-form";
import {
  normalizeCustomMessages,
  normalizeDefaultMessages,
  normalizeShopItems,
  type NpcInput,
} from "@/lib/validations/admin/npc";
import { BackToListButton } from "@/components/shared/back-to-list-button";

export const metadata: Metadata = {
  title: "Editar NPC",
};

export default async function EditNpcPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const npc = await prisma.npc.findUnique({ where: { id: Number(id) } });

  if (!npc) {
    notFound();
  }

  const initialValues: NpcInput = {
    name: npc.name,
    lookTypeId: npc.lookTypeId,
    type: npc.type as NpcInput["type"],
    town: npc.town,
    posX: npc.posX,
    posY: npc.posY,
    posZ: npc.posZ,
    direction: npc.direction,
    shopItems: normalizeShopItems(npc.shopItems),
    scriptId: npc.scriptId,
    customMessages: normalizeCustomMessages(npc.customMessages),
    defaultMessages: normalizeDefaultMessages(npc.defaultMessages),
    published: npc.published,
  };

  return (
    <div className="flex flex-col gap-6">
      <BackToListButton href="/admin/npcs" />
      <div>
        <h1 className="text-2xl font-semibold">
          Editar NPC: {npc.name} (#{npc.id})
        </h1>
        <p className="text-muted-foreground">
          Ao salvar, regrava data/npc/{npc.name}.xml no servidor automaticamente.
        </p>
      </div>
      <NpcForm npcId={npc.id} initialValues={initialValues} />
    </div>
  );
}
