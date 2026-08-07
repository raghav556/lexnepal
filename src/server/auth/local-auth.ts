import "server-only";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, twoFactor } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { getDatabase } from "@/server/db/client";
import {
  authAccounts,
  authRateLimits,
  authSessions,
  authTwoFactors,
  authUsers,
  authVerifications,
  users,
} from "@/server/db/schema";
import { getServerEnvironment } from "@/server/env";
import { enqueueIdentityEmail } from "@/server/auth/identity-email";
import { authAuditAfterHook, authAuditBeforeHook } from "@/server/auth/auth-event-hooks";

let instance: ReturnType<typeof createLocalAuth> | undefined;
export function getLocalAuth() {
  instance ??= createLocalAuth();
  return instance;
}

function createLocalAuth() {
  const environment = getServerEnvironment();
  const secureCookies = environment.NODE_ENV === "production";
  return betterAuth({
    appName: "LexNepal",
    baseURL: environment.BETTER_AUTH_URL,
    trustedOrigins: resolveTrustedOrigins(environment.APP_PUBLIC_URL, environment.BETTER_AUTH_URL),
    secret: environment.BETTER_AUTH_SECRET,
    advanced: {
      useSecureCookies: secureCookies,
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: secureCookies,
        path: "/",
      },
    },
    hooks: {
      before: authAuditBeforeHook,
      after: authAuditAfterHook,
    },
    database: drizzleAdapter(getDatabase(), {
      provider: "pg",
      schema: {
        user: authUsers,
        session: authSessions,
        account: authAccounts,
        verification: authVerifications,
        twoFactor: authTwoFactors,
        rateLimit: authRateLimits,
      },
    }),
    user: {
      additionalFields: {
        lexnepalUserId: {
          type: "string",
          required: true,
          input: true,
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      requireEmailVerification: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) =>
        enqueueIdentityEmail({
          authUserId: user.id,
          email: user.email,
          name: user.name,
          purpose: "password-reset",
          url,
        }),
      onPasswordReset: async ({ user }) => activateLinkedUser(user),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      expiresIn: 86_400,
      sendVerificationEmail: async ({ user, url }) =>
        enqueueIdentityEmail({
          authUserId: user.id,
          email: user.email,
          name: user.name,
          purpose: "verify",
          url,
        }),
      afterEmailVerification: activateLinkedUser,
    },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 20 },
    plugins: [
      twoFactor({
        issuer: "LexNepal",
        accountLockout: { enabled: true, maxFailedAttempts: 5, durationSeconds: 900 },
      }),
      admin(),
      nextCookies(),
    ],
  });
}

export async function provisionLocalIdentity(input: {
  lexnepalUserId: string;
  name: string;
  email: string;
}): Promise<void> {
  const auth = getLocalAuth();
  await auth.api.createUser({
    body: {
      name: input.name,
      email: input.email,
      password: randomBytes(24).toString("base64url"),
      role: "user",
      data: { lexnepalUserId: input.lexnepalUserId },
    },
  });
  await getDatabase()
    .update(authUsers)
    .set({ emailVerified: true, updatedAt: new Date() })
    .where(eq(authUsers.email, input.email));
  // First-time invites land on /setup-account (same Better Auth reset token).
  // Forgotten-password flows use /reset-password via requestLocalPasswordResetForLexUser.
  await auth.api.requestPasswordReset({
    body: {
      email: input.email,
      redirectTo: new URL("/setup-account", getServerEnvironment().APP_PUBLIC_URL).toString(),
    },
  });
}

export async function requestLocalPasswordResetForLexUser(
  lexnepalUserId: string,
  options?: { redirectPath?: string },
): Promise<void> {
  const [identity] = await getDatabase()
    .select({ email: authUsers.email })
    .from(authUsers)
    .where(eq(authUsers.lexnepalUserId, lexnepalUserId))
    .limit(1);
  if (!identity) throw new Error("LOCAL_IDENTITY_NOT_PROVISIONED");
  const redirectPath = options?.redirectPath ?? "/reset-password";
  await getLocalAuth().api.requestPasswordReset({
    body: {
      email: identity.email,
      redirectTo: new URL(redirectPath, getServerEnvironment().APP_PUBLIC_URL).toString(),
    },
  });
}

async function activateLinkedUser(user: { id: string; [key: string]: unknown }): Promise<void> {
  let linkedId = typeof user.lexnepalUserId === "string" ? user.lexnepalUserId : undefined;
  if (!linkedId && typeof user.id === "string") {
    const [row] = await getDatabase()
      .select({ lexnepalUserId: authUsers.lexnepalUserId })
      .from(authUsers)
      .where(eq(authUsers.id, user.id))
      .limit(1);
    linkedId = row?.lexnepalUserId ?? undefined;
  }
  if (!linkedId) {
    throw new Error(
      `Identity activation failed: auth user ${String(user.id)} is not linked to LexNepal`,
    );
  }

  const now = new Date();
  const [updated] = await getDatabase()
    .update(users)
    .set({
      tokenIdentifier: `local:${user.id}`,
      isPending: false,
      isActive: true,
      activationToken: null,
      inviteExpiresAt: null,
      updatedAt: now,
    })
    .where(eq(users.id, linkedId))
    .returning({ id: users.id, firmId: users.firmId, email: users.email });

  if (!updated) {
    throw new Error(`Identity activation failed: LexNepal user ${linkedId} was not found`);
  }

  // Best-effort security audit — never block activation if audit insert fails.
  try {
    const { auditLog } = await import("@/server/db/schema");
    await getDatabase()
      .insert(auditLog)
      .values({
        firmId: updated.firmId,
        userId: updated.id,
        action: "auth.invite_activated",
        resource: "auth",
        resourceId: updated.id,
        details: updated.email ? `email=${updated.email}` : null,
        ipAddress: null,
        requestId: "password-reset-hook",
        createdAt: now,
        updatedAt: now,
      });
  } catch {
    // ignore
  }
}

/** Local defaults plus production URLs from env (no trailing slash). */
function resolveTrustedOrigins(...urls: Array<string | undefined>): string[] {
  const localDefaults = [
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
  ];
  const fromEnv = urls
    .filter((value): value is string => Boolean(value))
    .map((value) => value.replace(/\/$/, ""));
  return [...new Set([...localDefaults, ...fromEnv])];
}
