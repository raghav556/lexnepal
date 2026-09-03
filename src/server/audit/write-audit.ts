import "server-only";
import type { AuditContext } from "@/server/audit/context";
import { getDatabase } from "@/server/db/client";
import { auditLog } from "@/server/db/schema";

/**
 * Drizzle transaction/session type accepted by the shared audit writer. Repositories
 * pass the `tx` they receive inside `database.transaction(...)` callbacks.
 */
export type AuditTransaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

/**
 * Shared audit-log insert used by every repository so audit rows stay uniformly shaped:
 * firm + actor + action/resource/resourceId + request context + occurredAt timestamps.
 */
export async function writeAuditLog(
  tx: AuditTransaction,
  audit: AuditContext,
  action: string,
  resource: string,
  resourceId: string | null,
  details: string | null,
): Promise<void> {
  await tx.insert(auditLog).values({
    firmId: audit.firmId,
    userId: audit.actorId,
    action,
    resource,
    resourceId,
    details,
    ipAddress: audit.ipAddress,
    requestId: audit.requestId,
    createdAt: audit.occurredAt,
    updatedAt: audit.occurredAt,
  });
}
