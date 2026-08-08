import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

const MAX_ENTRIES = 200;

type SkipEntry = {
  fileName: string;
  name: string;
  looktypeNumber: number | null;
  category: string;
  reason: string;
};

function isSkipEntry(value: unknown): value is SkipEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.fileName === "string" &&
    typeof entry.name === "string" &&
    typeof entry.category === "string" &&
    typeof entry.reason === "string" &&
    (entry.looktypeNumber === null || typeof entry.looktypeNumber === "number")
  );
}

/**
 * Registra em auditoria as duplicatas detectadas pelo próprio navegador (mesmo nome/número
 * repetido dentro do lote sendo enviado, ver `LooktypeCreateDialog`) — arquivos que nunca
 * chegam a virar uma requisição de criação, então não passam pela checagem/log em
 * `POST /api/admin/looktypes`.
 */
export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const batchId = typeof body?.batchId === "string" && body.batchId ? body.batchId : null;
  const entries = Array.isArray(body?.entries) ? body.entries.filter(isSkipEntry).slice(0, MAX_ENTRIES) : [];

  if (entries.length === 0) {
    return NextResponse.json({ error: "Nenhuma entrada válida." }, { status: 422 });
  }

  await Promise.all(
    entries.map((entry: SkipEntry) =>
      logAudit({
        accountId: Number(session.user.id),
        action: "import_skip",
        entity: "looktype",
        metadata: { ...entry, batchId },
      }),
    ),
  );

  return NextResponse.json({ logged: entries.length });
}
