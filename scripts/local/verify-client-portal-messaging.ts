/**
 * Operator mapping (staff/admin → client portal):
 * - Clients → Grant portal access → /client/* unlocks
 * - Cases create/assign → /client/cases + Messages threads
 * - Tasks clientVisible=true → /client/checklist
 * - Documents isPrivileged=false + confidentiality not internal/privileged → /client/documents
 * - Messages Client Reply (isInternal=false) → /client/messages
 * - Finance invoices → /client/billing
 * - Hearings on matter → /client/hearings
 * - Appointments confirm → /client/booking
 *
 * Usage (server on :3001, after npm run e2e:seed:portal):
 *   npm run verify:client-portal-messaging
 */
import { and, desc, eq, isNull } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { notifications, users } from "../../db/schema";
import { E2E_PASSWORD, E2E_USERS } from "../e2e/fixtures";
import { seedE2eClientPortal } from "../e2e/seed-e2e-client-portal";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";

const AUTH_HEADERS = {
  "content-type": "application/json",
  origin: BASE.replace(/\/$/, ""),
  referer: `${BASE}/sign-in`,
  "x-forwarded-for": "127.0.0.33",
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
  if (body.twoFactorRedirect) throw new Error("sign-in requires MFA — use a non-MFA user");
  return jar;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log(`\n=== Client portal messaging verify — ${BASE} ===\n`);

  console.log("0. Ensure portal seed…");
  const seeded = await seedE2eClientPortal();
  console.log(`   case ${seeded.caseId}`);

  console.log("1. Client sign-in → POST message…");
  let clientJar = await signIn(E2E_USERS.client.email, E2E_PASSWORD);
  const mark = `verify-msg-${Date.now()}`;
  const sendClient = await fetchWithCookies(
    `${BASE}/api/v1/messages`,
    {
      method: "POST",
      headers: { ...AUTH_HEADERS, cookie: cookieHeader(clientJar) },
      body: JSON.stringify({
        caseId: seeded.caseId,
        content: `Client hello ${mark}`,
        isInternal: false,
      }),
    },
    clientJar,
  );
  clientJar = sendClient.jar;
  const sendClientText = await sendClient.res.text();
  assert(
    sendClient.res.ok,
    `client send failed ${sendClient.res.status}: ${sendClientText.slice(0, 300)}`,
  );

  const db = getDatabase();
  const [staffUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, E2E_USERS.staff.email), isNull(users.deletedAt)))
    .limit(1);
  assert(staffUser, "E2E staff user missing");

  const [staffNotif] = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, staffUser.id), eq(notifications.type, "message")))
    .orderBy(desc(notifications.createdAt))
    .limit(1);
  assert(
    staffNotif?.link?.includes("/staff/messages?caseId="),
    `staff notif link bad: ${staffNotif?.link}`,
  );
  assert(
    staffNotif.link?.includes(seeded.caseId),
    `staff notif caseId mismatch: ${staffNotif.link}`,
  );
  console.log(`   staff notif → ${staffNotif.link}`);

  console.log("2. Staff Messages page + Client Reply…");
  const staffJar = await signIn(E2E_USERS.staff.email, E2E_PASSWORD);
  const pageRes = await fetchWithCookies(
    `${BASE}/staff/messages?caseId=${seeded.caseId}`,
    {
      headers: { cookie: cookieHeader(staffJar) },
    },
    staffJar,
  );
  assert([200, 307, 308].includes(pageRes.res.status), `staff messages page ${pageRes.res.status}`);

  const listRes = await fetchWithCookies(
    `${BASE}/api/v1/messages?caseId=${seeded.caseId}`,
    { headers: { cookie: cookieHeader(staffJar) } },
    staffJar,
  );
  assert(listRes.res.ok, `staff list messages ${listRes.res.status}`);

  const sendStaff = await fetchWithCookies(
    `${BASE}/api/v1/messages`,
    {
      method: "POST",
      headers: { ...AUTH_HEADERS, cookie: cookieHeader(staffJar) },
      body: JSON.stringify({
        caseId: seeded.caseId,
        content: `Staff reply ${mark}`,
        isInternal: false,
      }),
    },
    staffJar,
  );
  const sendStaffText = await sendStaff.res.text();
  assert(
    sendStaff.res.ok,
    `staff send failed ${sendStaff.res.status}: ${sendStaffText.slice(0, 300)}`,
  );

  const [clientUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, E2E_USERS.client.email), isNull(users.deletedAt)))
    .limit(1);
  assert(clientUser, "E2E client user missing");

  const [clientNotif] = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, clientUser.id), eq(notifications.type, "message")))
    .orderBy(desc(notifications.createdAt))
    .limit(1);
  assert(
    clientNotif?.link?.includes("/client/messages"),
    `client notif link bad: ${clientNotif?.link}`,
  );
  console.log(`   client notif → ${clientNotif.link}`);

  console.log("3. Unread summary…");
  const unreadRes = await fetchWithCookies(
    `${BASE}/api/v1/messages/unread?caseIds=${seeded.caseId}`,
    { headers: { cookie: cookieHeader(clientJar) } },
    clientJar,
  );
  assert(unreadRes.res.ok, `unread failed ${unreadRes.res.status}`);

  console.log("\nPASS — client↔staff messaging + notification links\n");
}

main()
  .catch((error) => {
    console.error("\nFAIL", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase().catch(() => undefined);
  });
