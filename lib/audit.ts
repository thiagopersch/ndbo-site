import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

type LogAuditParams = {
  accountId?: number | null;
  action: string;
  entity: string;
  entityId?: string | number | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
};

export async function logAudit({
  accountId = null,
  action,
  entity,
  entityId = null,
  metadata,
  ipAddress = null,
}: LogAuditParams) {
  await prisma.auditLog.create({
    data: {
      accountId,
      action,
      entity,
      entityId: entityId != null ? String(entityId) : null,
      metadata,
      ipAddress,
    },
  });
}
