import "server-only";
import { and, eq, lt, or, type AnyColumn } from "drizzle-orm";
import { decodeMessageCursor } from "@/shared/message-cursor";
import { AppError } from "@/shared/errors/api-error";

/** Descending immutable creation time + unique ID; never offset an evolving result set. */
export function collectionBefore(createdAt: AnyColumn, id: AnyColumn, cursor?: string) {
  if (!cursor) return undefined;
  const before = decodeMessageCursor(cursor);
  if (!before) throw new AppError("VALIDATION_FAILED", "Invalid continuation cursor", 422);
  return or(
    lt(createdAt, before.createdAt),
    and(eq(createdAt, before.createdAt), lt(id, before.id)),
  );
}
