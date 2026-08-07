/**
 * Phase A — prove invite → activate → portal on localhost.
 *
 * Usage (server must be on :3001):
 *   node --env-file-if-exists=.env.local --conditions=react-server --import tsx scripts/local/verify-invite-activation.ts
 */
import { desc, eq, like } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { authUsers, authVerifications, users } from "../../db/schema";
import { E2E_PASSWORD, E2E_USERS } from "../e2e/fixtures";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const INVITE_PASSWORD = "Invite-Activate-2026!";

function portalForRole(role: string): "/client" | "/staff" | "/admin" {
  if (role === "admin") return "/admin";
  if (role === "client") return "/client";
  return "/staff";
}

const AUTH_HEADERS = {
  "content-type": "application/json",
  origin: BASE.replace(/\/$/, ""),
  referer: `${BASE}/sign-in`,
};

function parseCookies(setCookieHeaders: string[]) {
  const jar = new Map<string, string>();
  for (const header of setCookieHeaders) {
    const [pair] = header.split(";");
    const eqIdx = pair.indexOf("=");
    if (eqIdx > 0) jar.set(pair.slice(0, eqIdx).trim(), pair.slice(eqIdx + 1).trim());
  }
  return jar;
}

function cookieHeader(jar: Map<string, string>) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function mergeCookies(jar: Map<string, string>, setCookieHeaders: string[]) {
  const next = new Map(jar);
  for (const [k, v] of parseCookies(setCookieHeaders)) next.set(k, v);
  return next;
}

async function fetchWithCookies(
  url: string,
  options: RequestInit = {},
  jar = new Map<string, string>(),
) {
  const headers = { ...(options.headers as Record<string, string> | undefined), ...{} };
  const serialized = cookieHeader(jar);
  if (serialized) headers.cookie = serialized;
  const res = await fetch(url, { ...options, headers, redirect: "manual" });
  const setCookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  return { res, jar: mergeCookies(jar, setCookies), setCookies };
}

async function signIn(email: string, password: string) {
  const { res, jar } = await fetchWithCookies(
    `${BASE}/api/auth/sign-in/email`,
    {
      method: "POST",
      headers: AUTH_HEADERS,
      body: JSON.stringify({ email, password, rememberMe: false }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`sign-in failed ${res.status}: ${text.slice(0, 200)}`);
  }
  const body = (await res.json()) as { twoFactorRedirect?: boolean };
  if (body.twoFactorRedirect) throw new Error("sign-in requires MFA — use a non-MFA admin for this proof");
  return jar;
}

async function latestResetTokenForAuthUser(authUserId: string): Promise<string | null> {
  const db = getDatabase();
  const rows = await db
    .select({ identifier: authVerifications.identifier, value: authVerifications.value })
    .from(authVerifications)
    .where(like(authVerifications.identifier, "reset-password:%"))
    .orderBy(desc(authVerifications.createdAt))
    .limit(50);
  for (const row of rows) {
    if (row.value === authUserId) {
      return row.identifier.replace(/^reset-password:/, "");
    }
  }
  return null;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log(`\n=== Phase A invite activation — ${BASE} ===\n`);

  const stamp = Date.now();
  const inviteEmail = `invite-activate-${stamp}@example.invalid`;
  const inviteName = `Invite Activate ${stamp}`;

  console.log("1. Sign in as E2E admin…");
  let jar = await signIn(E2E_USERS.admin.email, E2E_PASSWORD);

  console.log("2. Create invited associate…");
  const create = await fetchWithCookies(
    `${BASE}/api/v1/users`,
    {
      method: "POST",
      headers: { ...AUTH_HEADERS, cookie: cookieHeader(jar) },
      body: JSON.stringify({
        name: inviteName,
        email: inviteEmail,
        role: "associate",
        isPublicFacing: false,
        invite: true,
      }),
    },
    jar,
  );
  jar = create.jar;
  const createText = await create.res.text();
  assert(create.res.ok, `create user failed ${create.res.status}: ${createText.slice(0, 300)}`);
  const createdBody = JSON.parse(createText) as {
    data: { id: string; isPending: boolean; isActive: boolean; role: string };
  };
  const lexUserId = createdBody.data.id;
  assert(createdBody.data.isPending === true, "invited user should be isPending=true");
  assert(createdBody.data.isActive === false, "invited user should be isActive=false until activation");
  console.log(`   created ${lexUserId} (${createdBody.data.role})`);

  const db = getDatabase();
  const [authRow] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.lexnepalUserId, lexUserId))
    .limit(1);
  assert(authRow, "Better Auth user was not provisioned for invite");

  console.log("3. Locate setup token…");
  // Allow async provision + requestPasswordReset to finish writing verification row.
  let token: string | null = null;
  for (let attempt = 0; attempt < 20; attempt++) {
    token = await latestResetTokenForAuthUser(authRow.id);
    if (token) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  assert(token, "No reset-password verification token found for invitee");
  console.log(`   token ${token.slice(0, 8)}…`);

  console.log("4. Activate via Better Auth resetPassword (setup-account path)…");
  const reset = await fetch(`${BASE}/api/auth/reset-password`, {
    method: "POST",
    headers: AUTH_HEADERS,
    body: JSON.stringify({ newPassword: INVITE_PASSWORD, token }),
  });
  assert(reset.ok, `reset-password failed ${reset.status}: ${await reset.text()}`);

  const [activated] = await db
    .select({
      isPending: users.isPending,
      isActive: users.isActive,
      role: users.role,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, lexUserId))
    .limit(1);
  assert(activated, "LexNepal user missing after activation");
  assert(activated.isPending === false, "isPending should be false after activation");
  assert(activated.isActive === true, "isActive should be true after activation");
  console.log("   isPending=false, isActive=true ✓");

  console.log("5. Sign in as invitee…");
  const inviteJar = await signIn(inviteEmail, INVITE_PASSWORD);

  console.log("6. GET /api/v1/users/me…");
  const meRes = await fetch(`${BASE}/api/v1/users/me`, {
    headers: { cookie: cookieHeader(inviteJar) },
  });
  const meText = await meRes.text();
  assert(meRes.ok, `/users/me failed ${meRes.status}: ${meText.slice(0, 300)}`);
  const me = JSON.parse(meText) as { data?: { role: string; email: string }; role?: string };
  const role = me.data?.role ?? me.role;
  assert(role === "associate", `expected associate role, got ${role}`);
  const portal = portalForRole(role!);
  assert(portal === "/staff", `expected /staff portal for associate, got ${portal}`);

  console.log("7. Portal HTML loads…");
  const portalRes = await fetch(`${BASE}${portal}`, {
    headers: { cookie: cookieHeader(inviteJar) },
  });
  assert(portalRes.ok, `portal ${portal} failed ${portalRes.status}`);
  const html = await portalRes.text();
  assert(!/This page couldn.?t load/i.test(html), "portal rendered error boundary");

  console.log(`\nPASS — invite activated and signed into ${portal}\n`);
  console.log(
    JSON.stringify(
      {
        ok: true,
        inviteEmail,
        lexUserId,
        role,
        portal,
        note: "Admin/partner invites still require MFA enrollment after activation",
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("\nFAIL —", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
