import "server-only";
import type { AuthPrincipal } from "@/server/auth/types";

export interface AuditContext {
  actorId: string;
  firmId: string;
  ipAddress: string;
  requestId: string;
  occurredAt: Date;
}

export function buildAuditContext(
  request: Request,
  requestId: string,
  principal: AuthPrincipal,
  occurredAt = new Date(),
): AuditContext {
  return {
    actorId: principal.user.id,
    firmId: principal.firmId,
    ipAddress: getClientIp(request.headers),
    requestId,
    occurredAt,
  };
}

export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-real-ip")?.trim() ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
