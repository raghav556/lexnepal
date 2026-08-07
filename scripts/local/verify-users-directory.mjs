/**
 * Phase D — Users directory API smoke (table ops prerequisites).
 *
 * Usage (server on :3001):
 *   npm run verify:users-directory
 */
import { E2E_PASSWORD, E2E_USERS } from "../e2e/fixtures.ts";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";

const AUTH_HEADERS = {
  "content-type": "application/json",
  origin: BASE.replace(/\/$/, ""),
  referer: `${BASE}/sign-in`,
};

function parseCookies(setCookieHeaders) {
  const jar = new Map();
  for (const header of setCookieHeaders) {
    const [pair] = header.split(";");
    const eqIdx = pair.indexOf("=");
    if (eqIdx > 0) jar.set(pair.slice(0, eqIdx).trim(), pair.slice(eqIdx + 1).trim());
  }
  return jar;
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function signIn(email, password) {
  const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: AUTH_HEADERS,
    body: JSON.stringify({ email, password, rememberMe: false }),
  });
  if (!res.ok) throw new Error(`sign-in failed ${res.status}`);
  const setCookies =
    typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const jar = parseCookies(setCookies);
  if (jar.size === 0) throw new Error("no session cookie");
  return jar;
}

async function main() {
  console.log(`\n=== Phase D users directory — ${BASE} ===\n`);
  const jar = await signIn(E2E_USERS.admin.email, E2E_PASSWORD);
  const cookie = cookieHeader(jar);

  const usersRes = await fetch(`${BASE}/api/v1/users`, { headers: { cookie } });
  if (!usersRes.ok) throw new Error(`users list ${usersRes.status}`);
  const usersBody = await usersRes.json();
  if (!Array.isArray(usersBody.data) || usersBody.data.length < 1) {
    throw new Error("expected at least one user");
  }
  console.log(`users: ${usersBody.data.length}`);

  const clientsRes = await fetch(`${BASE}/api/v1/clients`, { headers: { cookie } });
  if (!clientsRes.ok) throw new Error(`clients list ${clientsRes.status}`);
  console.log("clients list OK (admin CRM deep-link backend)");

  const pageRes = await fetch(`${BASE}/admin/users`, { headers: { cookie }, redirect: "manual" });
  if (pageRes.status >= 500) throw new Error(`/admin/users ${pageRes.status}`);
  console.log("\nPASS — users directory API + page reachable\n");
}

main().catch((error) => {
  console.error("\nFAIL", error);
  process.exitCode = 1;
});
