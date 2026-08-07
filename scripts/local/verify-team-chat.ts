/**
 * Team Chat E2E:
 * - Staff A ↔ Staff B DM
 * - Case team internal message invisible to client
 * - Client reply still works
 *
 * Prerequisites: migrate (0020), server on :3001
 *   npm run db:migrate
 *   npm run e2e:seed:portal
 *   npm run verify:team-chat
 */
import { and, eq } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { messages } from "../../db/schema";
import { E2E_PASSWORD, E2E_USERS } from "../e2e/fixtures";
import { seedE2eClientPortal } from "../e2e/seed-e2e-client-portal";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";

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
  const headers = { ...(options.headers as Record<string, string> | undefined) };
  const serialized = cookieHeader(jar);
  if (serialized) headers.cookie = serialized;
  const res = await fetch(url, { ...options, headers, redirect: "manual" });
  const setCookies =
    typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  return { res, jar: mergeCookies(jar, setCookies) };
}

async function signIn(email: string, password: string) {
  const { res, jar } = await fetchWithCookies(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: AUTH_HEADERS,
    body: JSON.stringify({ email, password, rememberMe: false }),
  });
  if (!res.ok) throw new Error(`sign-in failed ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return jar;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log(`\n=== Team chat verify — ${BASE} ===\n`);

  const seeded = await seedE2eClientPortal();
  assert(seeded.staff2UserId, "staff2 missing — re-run e2e seed after fixtures update");

  console.log("1. Staff DM A ↔ B…");
  const staffJar = await signIn(E2E_USERS.staff.email, E2E_PASSWORD);
  const openDm = await fetchWithCookies(
    `${BASE}/api/v1/dm/threads`,
    {
      method: "POST",
      headers: { ...AUTH_HEADERS, cookie: cookieHeader(staffJar) },
      body: JSON.stringify({ peerUserId: seeded.staff2UserId }),
    },
    staffJar,
  );
  const openText = await openDm.res.text();
  assert(openDm.res.ok, `open DM failed ${openDm.res.status}: ${openText.slice(0, 300)}`);
  const thread = JSON.parse(openText) as { data: { _id: string } };
  const threadId = thread.data._id;

  const sendDm = await fetchWithCookies(
    `${BASE}/api/v1/dm/threads/${threadId}/messages`,
    {
      method: "POST",
      headers: { ...AUTH_HEADERS, cookie: cookieHeader(staffJar) },
      body: JSON.stringify({ content: `DM hello ${Date.now()}` }),
    },
    staffJar,
  );
  assert(sendDm.res.ok, `send DM failed ${sendDm.res.status}`);

  const staff2Jar = await signIn(E2E_USERS.staff2.email, E2E_PASSWORD);
  const listDm = await fetchWithCookies(
    `${BASE}/api/v1/dm/threads/${threadId}/messages`,
    { headers: { cookie: cookieHeader(staff2Jar) } },
    staff2Jar,
  );
  assert(listDm.res.ok, `staff2 list DM failed ${listDm.res.status}`);
  const listBody = (await listDm.res.json()) as { data: { page: unknown[] } };
  assert(listBody.data.page.length >= 1, "staff2 should see DM");

  console.log("2. Case team internal (hidden from client)…");
  const mark = `team-internal-${Date.now()}`;
  const teamSend = await fetchWithCookies(
    `${BASE}/api/v1/messages`,
    {
      method: "POST",
      headers: { ...AUTH_HEADERS, cookie: cookieHeader(staffJar) },
      body: JSON.stringify({
        caseId: seeded.caseId,
        content: mark,
        isInternal: true,
      }),
    },
    staffJar,
  );
  assert(teamSend.res.ok, `team message failed ${teamSend.res.status}`);

  const clientJar = await signIn(E2E_USERS.client.email, E2E_PASSWORD);
  const clientList = await fetchWithCookies(
    `${BASE}/api/v1/messages?caseId=${seeded.caseId}`,
    { headers: { cookie: cookieHeader(clientJar) } },
    clientJar,
  );
  assert(clientList.res.ok, `client list failed ${clientList.res.status}`);
  const clientMsgs = (await clientList.res.json()) as {
    data: { page: Array<{ content: string; isInternal?: boolean }> };
  };
  assert(
    !clientMsgs.data.page.some((m) => m.content === mark),
    "client must not see internal case team message",
  );

  console.log("3. Client reply still works…");
  const clientSend = await fetchWithCookies(
    `${BASE}/api/v1/messages`,
    {
      method: "POST",
      headers: { ...AUTH_HEADERS, cookie: cookieHeader(clientJar) },
      body: JSON.stringify({
        caseId: seeded.caseId,
        content: `client-visible-${Date.now()}`,
        isInternal: false,
      }),
    },
    clientJar,
  );
  assert(clientSend.res.ok, `client send failed ${clientSend.res.status}`);

  const db = getDatabase();
  const [internalRow] = await db
    .select({ id: messages.id })
    .from(messages)
    .where(and(eq(messages.caseId, seeded.caseId), eq(messages.content, mark), eq(messages.isInternal, true)))
    .limit(1);
  assert(internalRow, "internal message not stored");

  const page = await fetchWithCookies(`${BASE}/staff/team-chat`, {
    headers: { cookie: cookieHeader(staffJar) },
  }, staffJar);
  assert([200, 307, 308].includes(page.res.status), `team-chat page ${page.res.status}`);

  console.log("\nPASS — team DMs + case team privacy + client chat\n");
}

main()
  .catch((error) => {
    console.error("\nFAIL", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase().catch(() => undefined);
  });
