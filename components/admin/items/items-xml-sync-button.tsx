"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type ItemsXmlSyncButtonProps = {
  onSynced: () => void;
};

/** Leva o banco (fonte que o CRUD edita) pro `items.xml` com diff — ver
 * `syncItemsXmlFromDatabase`/`/api/admin/items/sync-xml`. Ação de um clique só, sem upload nem
 * dialog (ao contrário de `OtbSyncDialog`), então não reaproveita esse componente. */
export function ItemsXmlSyncButton({ onSynced }: ItemsXmlSyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  async function handleSync() {
    setIsSyncing(true);

    const response = await fetch("/api/admin/items/sync-xml", { method: "POST" });
    const data = await response.json().catch(() => null);

    setIsSyncing(false);

    if (!response.ok) {
      toast.error(data?.error ?? "Não foi possível sincronizar o items.xml.");
      return;
    }

    toast.success(
      `${data.updated} atualizado(s), ${data.added} adicionado(s), ${data.unchanged} sem alteração.`
    );
    onSynced();
  }

  return (
    <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
      <RefreshCw className="size-4" />
      {isSyncing ? "Sincronizando..." : "Sincronizar items.xml"}
    </Button>
  );
}
