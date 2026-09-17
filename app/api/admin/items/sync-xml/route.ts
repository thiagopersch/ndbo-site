import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";
import { syncItemsXmlFromDatabase } from "@/lib/items-xml-sync";
import { withAudit } from "@/lib/api-audit-wrapper";

/**
 * Ação manual disparada pelo botão "Sincronizar items.xml" na listagem: leva o banco (fonte que o
 * CRUD edita) pro arquivo com diff — ver `syncItemsXmlFromDatabase`. Não recebe upload nenhum.
 */
export const POST = withAudit(async function POST() {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  try {
    const result = await syncItemsXmlFromDatabase();

    await logAudit({
      accountId: Number(session.user.id),
      action: "sync-xml",
      entity: "item",
      metadata: result,
    });

    return NextResponse.json(result);
  } catch (error) {
    await logAudit({
      accountId: Number(session.user.id),
      action: "sync-xml-failed",
      entity: "item",
      metadata: { error: error instanceof Error ? error.message : String(error) },
    });
    return NextResponse.json(
      { error: "Não foi possível sincronizar o items.xml. Verifique a configuração do servidor." },
      { status: 500 },
    );
  }
});
