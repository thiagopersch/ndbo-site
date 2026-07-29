import type { Metadata } from "next";

import { NpcForm } from "@/components/admin/npcs/npc-form";

export const metadata: Metadata = {
  title: "Novo NPC",
};

export default function NewNpcPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Novo NPC</h1>
        <p className="text-muted-foreground">
          Ao salvar, gera data/npc/{"{nome}"}.xml no servidor automaticamente.
        </p>
      </div>
      <NpcForm />
    </div>
  );
}
