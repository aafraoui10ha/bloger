import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { sanitizeAuditDetails } from "./audit-sanitize";

export async function audit(
  userId: string | null,
  action: string,
  entityType: string,
  entityId?: string | null,
  details?: Record<string, unknown>,
): Promise<void> {
  await db.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId: entityId ?? null,
      details: details ? (sanitizeAuditDetails(details) as Prisma.InputJsonValue) : undefined,
    },
  });
}
