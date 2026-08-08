"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type AuditLogDetailsDialogProps = {
  action: string;
  entity: string;
  metadata: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

/**
 * Import de looktype ignorada por nome/número duplicado (`POST /api/admin/looktypes` e
 * `.../import-log`, ver `LooktypeCreateDialog`) — os campos são fixos, então mostramos um
 * layout dedicado em vez do JSON cru.
 */
function ImportSkipDetails({ metadata }: { metadata: Record<string, unknown> }) {
  const rows: [string, unknown][] = [
    ["Arquivo", metadata.fileName],
    ["Nome", metadata.name],
    ["Número", metadata.looktypeNumber],
    ["Categoria", metadata.category],
    ["Sessão de import", metadata.batchId],
  ];

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive">
        {formatValue(metadata.reason)}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="break-all">{formatValue(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function AuditLogDetailsDialog({ action, entity, metadata }: AuditLogDetailsDialogProps) {
  const hasDetails = isRecord(metadata) && Object.keys(metadata).length > 0;

  if (!hasDetails) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm">
            Detalhes
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {action} · {entity}
          </DialogTitle>
        </DialogHeader>
        {action === "import_skip" ? (
          <ImportSkipDetails metadata={metadata} />
        ) : (
          <pre className="max-h-96 overflow-auto rounded-md border border-border bg-muted p-3 text-xs whitespace-pre-wrap">
            {JSON.stringify(metadata, null, 2)}
          </pre>
        )}
      </DialogContent>
    </Dialog>
  );
}
