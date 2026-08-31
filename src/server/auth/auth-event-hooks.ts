import "server-only";

import { createAuthMiddleware, isAPIError } from "better-auth/api";
import { readAuthUserId, readLexnepalUserId, recordAuthAudit } from "@/server/auth/auth-audit";

const verifyTotpHadSession = new WeakMap<object, boolean>();

function authUserFromSession(session: { user?: Record<string, unknown> } | null | undefined) {
  return session?.user ?? null;
}

export const authAuditBeforeHook = createAuthMiddleware(async (ctx) => {
  if (ctx.path === "/two-factor/verify-totp") {
    verifyTotpHadSession.set(ctx as object, Boolean(ctx.context.session?.session));
  }

  if (ctx.path !== "/sign-out") return;

  try {
    const token = await ctx.getSignedCookie(
      ctx.context.authCookies.sessionToken.name,
      ctx.context.secret,
    );
    if (!token) return;
    const session = await ctx.context.internalAdapter.findSession(token);
    const user = authUserFromSession(session);
    if (!user) return;
    await recordAuthAudit({
      action: "auth.logout",
      request: ctx.request ?? new Request("http://localhost/api/auth/sign-out"),
      authUserId: readAuthUserId(user),
      lexnepalUserId: readLexnepalUserId(user),
    });
  } catch {
    // Best-effort audit; never block sign-out.
  }
});

export const authAuditAfterHook = createAuthMiddleware(async (ctx) => {
  const returned = ctx.context.returned;
  const request = ctx.request ?? new Request("http://localhost/api/auth");

  if (ctx.path === "/sign-in/email") {
    const newSession = ctx.context.newSession;
    if (newSession?.user) {
      await recordAuthAudit({
        action: "auth.login",
        request,
        authUserId: readAuthUserId(newSession.user as Record<string, unknown>),
        lexnepalUserId: readLexnepalUserId(newSession.user as Record<string, unknown>),
      });
      return;
    }

    if (isAPIError(returned) && returned.status === "UNAUTHORIZED") {
      const email = typeof ctx.body?.email === "string" ? ctx.body.email : null;
      await recordAuthAudit({
        action: "auth.login_failed",
        request,
        email,
        details: email ? `email=${email}` : "invalid_credentials",
      });
    }
    return;
  }

  if (ctx.path === "/two-factor/verify-totp") {
    if (isAPIError(returned)) return;
    const hadSession = verifyTotpHadSession.get(ctx as object) ?? false;
    verifyTotpHadSession.delete(ctx as object);

    const user = (ctx.context.newSession?.user ?? ctx.context.session?.user) as
      Record<string, unknown> | undefined;
    if (!user) return;

    if (hadSession) {
      await recordAuthAudit({
        action: "auth.mfa_enrolled",
        request,
        authUserId: readAuthUserId(user),
        lexnepalUserId: readLexnepalUserId(user),
      });
      return;
    }

    await recordAuthAudit({
      action: "auth.login",
      request,
      authUserId: readAuthUserId(user),
      lexnepalUserId: readLexnepalUserId(user),
    });
    return;
  }

  if (ctx.path === "/change-password" && !isAPIError(returned)) {
    const user = ctx.context.session?.user as Record<string, unknown> | undefined;
    if (!user) return;
    await recordAuthAudit({
      action: "auth.password_changed",
      request,
      authUserId: readAuthUserId(user),
      lexnepalUserId: readLexnepalUserId(user),
      details: ctx.body?.revokeOtherSessions ? "revoke_other_sessions=true" : null,
    });
  }
});
