import "server-only";
import { financialIdempotencyKeySchema } from "@/shared/contracts/financial";

/** Prefer body key; fall back to standard Idempotency-Key header. */
export function resolveFinancialIdempotencyKey(
  bodyKey: string | null | undefined,
  request: Request,
): string | undefined {
  const fromBody = bodyKey?.trim();
  if (fromBody) {
    return financialIdempotencyKeySchema.parse(fromBody);
  }
  const fromHeader = request.headers.get("idempotency-key")?.trim();
  if (!fromHeader) return undefined;
  return financialIdempotencyKeySchema.parse(fromHeader);
}
