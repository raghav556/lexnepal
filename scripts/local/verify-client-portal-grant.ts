/**
 * Phase C — grant portal access on CRM client → activate → /client + linked matters.
 *
 * Usage (server must be on :3001):
 *   npm run verify:client-portal-grant
 */
import { and, desc, eq, isNull, like } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { authUsers, authVerifications, cases, clients, users } from "../../db/schema";
import { E2E_PASSWORD, E2E_USERS } from "../e2e/fixtures";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const INVITE_PASSWORD = "Portal-Grant-2026!";
const MARK = `portal-grant-${Date.now()}`;
const CLIENT_EMAIL = `portal.grant.${Date.now()}@example.invalid`;

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
  const setCookies =
    typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  return { res, jar: mergeCookies(jar, setCookies), setCookies };
}

async function signIn(email: string, password: string) {
  const { res, jar } = await fetchWithCookies(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: AUTH_HEADERS,
    body: JSON.stringify({ email, password, rememberMe: false }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`sign-in failed ${res.status}: ${text.slice(0, 200)}`);
  }
  const body = (await res.json()) as { twoFactorRedirect?: boolean };
  if (body.twoFactorRedirect) throw new Error("sign-in requires MFA — use a non-MFA admin");
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
  console.log(`\n=== Phase C client portal grant — ${BASE} ===\n`);

  const db = getDatabase();

  console.log("1. Sign in as E2E admin…");
  let jar = await signIn(E2E_USERS.admin.email, E2E_PASSWORD);

  console.log("2. Create CRM client (no portal)…");
  const createRes = await fetchWithCookies(
    `${BASE}/api/v1/clients`,
    {
      method: "POST",
      headers: { ...AUTH_HEADERS, cookie: cookieHeader(jar) },
      body: JSON.stringify({
        type: "individual",
        fullName: `Portal Grant ${MARK}`,
        email: CLIENT_EMAIL,
        phone: "9800000000",
      }),
    },
    jar,
  );
  jar = createRes.jar;
  const createText = await createRes.res.text();
  assert(createRes.res.ok, `create client failed ${createRes.res.status}: ${createText.slice(0, 300)}`);
  const created = JSON.parse(createText) as { data: { _id: string; userId?: string | null } };
  const clientId = created.data._id;
  assert(!created.data.userId, "new CRM client should not have userId yet");
  console.log(`   client ${clientId}`);

  console.log("3. Grant portal access…");
  const grantRes = await fetchWithCookies(
    `${BASE}/api/v1/clients/${clientId}/portal-access`,
    {
      method: "POST",
      headers: { ...AUTH_HEADERS, cookie: cookieHeader(jar) },
      body: "{}",
    },
    jar,
  );
  jar = grantRes.jar;
  const grantText = await grantRes.res.text();
  assert(grantRes.res.ok, `grant failed ${grantRes.res.status}: ${grantText.slice(0, 400)}`);
  const grant = JSON.parse(grantText) as {
    data: {
      client: { userId: string };
      user: { id: string };
      created: boolean;
      linked: boolean;
      inviteSent: boolean;
    };
  };
  assert(grant.data.client.userId, "grant did not set clients.userId");
  assert(grant.data.created || grant.data.linked, "expected created or linked");
  const lexUserId = grant.data.user.id;
  console.log(`   linked user ${lexUserId} (created=${grant.data.created})`);

  const [authRow] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.lexnepalUserId, lexUserId))
    .limit(1);
  assert(authRow, "Better Auth user was not provisioned for portal invite");

  const [linkedClient] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), isNull(clients.deletedAt)))
    .limit(1);
  assert(linkedClient?.userId === lexUserId, "DB client.userId mismatch");

  const [lawyer] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, E2E_USERS.staff.email), isNull(users.deletedAt)))
    .limit(1);
  if (lawyer) {
    await db.insert(cases).values({
      firmId: linkedClient!.firmId,
      caseNumber: `PG-${Date.now()}`,
      title: `Portal grant matter ${MARK}`,
      practiceArea: "Corporate",
      status: "active",
      clientId,
      assignedLawyerId: lawyer.id,
    });
    console.log("   attached test matter");
  } else {
    console.log("   (skip matter attach — E2E staff user missing)");
  }

  console.log("4. Activate via setup token…");
  let token: string | null = null;
  for (let attempt = 0; attempt < 20; attempt++) {
    token = await latestResetTokenForAuthUser(authRow.id);
    if (token) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  assert(token, "No reset-password verification token found for invitee");

  const reset = await fetch(`${BASE}/api/auth/reset-password`, {
    method: "POST",
    headers: AUTH_HEADERS,
    body: JSON.stringify({ newPassword: INVITE_PASSWORD, token }),
  });
  const resetText = await reset.text();
  assert(reset.ok, `activate failed ${reset.status}: ${resetText.slice(0, 300)}`);

  console.log("5. Client sign-in → clients/me + cases…");
  const clientJar = await signIn(CLIENT_EMAIL, INVITE_PASSWORD);
  const meRes = await fetchWithCookies(
    `${BASE}/api/v1/clients/me`,
    { headers: { cookie: cookieHeader(clientJar) } },
    clientJar,
  );
  assert(meRes.res.ok, `clients/me failed ${meRes.res.status}`);
  const me = (await meRes.res.json()) as { data: { _id: string } | null };
  assert(me.data?._id === clientId, `clients/me mismatch: ${JSON.stringify(me.data)}`);

  const casesRes = await fetchWithCookies(
    `${BASE}/api/v1/cases?clientId=${clientId}`,
    { headers: { cookie: cookieHeader(clientJar) } },
    clientJar,
  );
  assert(casesRes.res.ok, `cases failed ${casesRes.res.status}`);
  const casesBody = (await casesRes.res.json()) as { data: Array<{ clientId: string }> };
  if (lawyer) {
    assert(casesBody.data.length >= 1, "expected at least one linked matter");
  }
  assert(
    casesBody.data.every((c) => c.clientId === clientId),
    "client saw a matter for another CRM client",
  );

  console.log("\nPASS — grant portal access → activate → clients/me + linked matters\n");
}

main()
  .catch((error) => {
    console.error("\nFAIL", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase().catch(() => undefined);
  });
