import "server-only";

import { eq } from "drizzle-orm";
import { getClientIp } from "@/server/audit/context";
import { getDatabase } from "@/server/db/client";
import { auditLog, authUsers, users } from "@/server/db/schema";

export type AuthAuditAction =
  | "auth.login"
  | "auth.logout"
  | "auth.login_failed"
  | "auth.mfa_enrolled"
  | "auth.password_changed";

type AuthAuditInput = {
  action: AuthAuditAction;
  request: Request;
  lexnepalUserId?: string | null;
  authUserId?: string | null;
  email?: string | null;
  details?: string | null;
  requestId?: string | null;
};

export async function recordAuthAudit(input: AuthAuditInput): Promise<void> {
  const lexnepalUserId =
    input.lexnepalUserId ??
    (input.authUserId ? await findLexUserIdByAuthUserId(input.authUserId) : null) ??
    (input.email ? await findLexUserIdByEmail(input.email) : null);

  if (!lexnepalUserId) return;

  const [actor] = await getDatabase()
    .select({ firmId: users.firmId })
    .from(users)
    .where(eq(users.id, lexnepalUserId))
    .limit(1);

  if (!actor) return;

  const now = new Date();
  await getDatabase()
    .insert(auditLog)
    .values({
      firmId: actor.firmId,
      userId: lexnepalUserId,
      action: input.action,
      resource: "auth",
      resourceId: lexnepalUserId,
      details: input.details ?? null,
      ipAddress: getClientIp(input.request.headers),
      requestId: input.requestId ?? input.request.headers.get("x-request-id") ?? "auth-hook",
      createdAt: now,
      updatedAt: now,
    });
}

async function findLexUserIdByAuthUserId(authUserId: string): Promise<string | null> {
  const [row] = await getDatabase()
    .select({ lexnepalUserId: authUsers.lexnepalUserId })
    .from(authUsers)
    .where(eq(authUsers.id, authUserId))
    .limit(1);
  return row?.lexnepalUserId ?? null;
}

async function findLexUserIdByEmail(email: string): Promise<string | null> {
  const [row] = await getDatabase()
    .select({ lexnepalUserId: authUsers.lexnepalUserId })
    .from(authUsers)
    .where(eq(authUsers.email, email.toLowerCase()))
    .limit(1);
  return row?.lexnepalUserId ?? null;
}

export function readAuthUserId(user: Record<string, unknown>): string | null {
  return typeof user.id === "string" ? user.id : null;
}

export function readLexnepalUserId(user: Record<string, unknown>): string | null {
  return typeof user.lexnepalUserId === "string" ? user.lexnepalUserId : null;
}
