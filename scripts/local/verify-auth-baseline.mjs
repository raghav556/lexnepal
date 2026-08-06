/**
 * Phase 0 auth baseline verifier.
 * Usage: node --env-file-if-exists=.env.local scripts/local/verify-auth-baseline.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const PASSWORD = "E2E-Smoke-Only-2026!";
const USERS = [
  { label: "admin", email: "e2e-admin@example.invalid", role: "admin", portal: "/admin" },
  { label: "staff", email: "e2e-staff@example.invalid", role: "associate", portal: "/staff" },
  { label: "client", email: "e2e-client@example.invalid", role: "client", portal: "/client" },
];

const DOC_PATH = join(dirname(fileURLToPath(import.meta.url)), "../../doc/migration/PHASE_AUTH_0_BASELINE.md");

function parseCookies(setCookieHeaders) {
  const jar = new Map();
  for (const header of setCookieHeaders) {
    const [pair] = header.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
  return jar;
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function mergeCookies(jar, setCookieHeaders) {
  const next = new Map(jar);
  for (const [k, v] of parseCookies(setCookieHeaders)) next.set(k, v);
  return next;
}

async function fetchWithCookies(url, options = {}, jar = new Map()) {
  const headers = { ...(options.headers ?? {}) };
  const serialized = cookieHeader(jar);
  if (serialized) headers.cookie = serialized;
  const res = await fetch(url, { ...options, headers, redirect: "manual" });
  const setCookies = res.headers.getSetCookie?.() ?? [];
  return { res, jar: mergeCookies(jar, setCookies), setCookies };
}

function checkEnvGuards() {
  const envPath = join(dirname(fileURLToPath(import.meta.url)), "../../.env.local");
  if (!existsSync(envPath)) {
    return { ok: true, detail: ".env.local not found — guards default to active" };
  }
  const content = readFileSync(envPath, "utf8");
  const match = content.match(/^NEXT_PUBLIC_SKIP_ROLE_GUARDS=(.*)$/m);
  if (!match) return { ok: true, detail: "NEXT_PUBLIC_SKIP_ROLE_GUARDS not set (guards active)" };
  const value = match[1].trim().replace(/^["']|["']$/g, "");
  if (value === "1") return { ok: false, detail: "NEXT_PUBLIC_SKIP_ROLE_GUARDS=1 — disable for real testing" };
  return { ok: true, detail: `NEXT_PUBLIC_SKIP_ROLE_GUARDS=${value} (guards active)` };
}

async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${BASE}/sign-in`, { redirect: "manual" });
      if (res.status < 500) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

async function checkSignInPage() {
  const res = await fetch(`${BASE}/sign-in`);
  const html = await res.text();
  const cssMatch = html.match(/\/_next\/static\/(?:css|chunks)\/[^"']+\.css/);
  let cssOk = false;
  let cssStatus = "n/a";
  if (cssMatch) {
    const cssRes = await fetch(`${BASE}${cssMatch[0]}`);
    cssStatus = String(cssRes.status);
    cssOk = cssRes.ok;
  }
  return {
    ok: res.ok && cssOk,
    signInStatus: res.status,
    cssStatus,
    cssPath: cssMatch?.[0] ?? "not found",
  };
}

const AUTH_HEADERS = {
  "content-type": "application/json",
  origin: BASE.replace(/\/$/, ""),
  referer: `${BASE}/sign-in`,
};

async function signInUser(email) {
  let jar = new Map();
  const body = JSON.stringify({ email, password: PASSWORD, rememberMe: false });
  let { res, jar: jar1 } = await fetchWithCookies(
    `${BASE}/api/auth/sign-in/email`,
    { method: "POST", headers: AUTH_HEADERS, body },
    jar,
  );
  jar = jar1;

  if (res.status === 200) {
    const data = await res.json().catch(() => ({}));
    if (data.twoFactorRedirect) {
      return { ok: false, reason: "MFA required — enroll or use backup for E2E account", jar: null, role: null };
    }
  } else if (res.status !== 302 && !res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, reason: `sign-in HTTP ${res.status}: ${text.slice(0, 200)}`, jar: null, role: null };
  }

  const meRes = await fetch(`${BASE}/api/v1/users/me`, { headers: { cookie: cookieHeader(jar) } });
  if (!meRes.ok) {
    return { ok: false, reason: `/users/me HTTP ${meRes.status}`, jar: null, role: null };
  }
  const me = await meRes.json();
  const role = me?.role ?? me?.data?.role;
  return { ok: true, role, jar };
}

async function checkPortalPage(jar, portal) {
  const res = await fetch(`${BASE}${portal}`, { headers: { cookie: cookieHeader(jar) } });
  const html = await res.text();
  const broken = /This page couldn.?t load/i.test(html);
  return { ok: res.ok && !broken, status: res.status, broken };
}

function updateDoc(summary) {
  if (!existsSync(DOC_PATH)) return;
  let doc = readFileSync(DOC_PATH, "utf8");
  const date = new Date().toISOString().slice(0, 10);

  doc = doc.replace(/\| 0\.1 \|.*\| ☐ \|/, "| 0.1 | This test matrix documented | ☑ |");
  doc = doc.replace(/\| 0\.2 \|.*\| ☐ \|/, `| 0.2 | All three demo accounts verified | ${summary.logins.every((l) => l.ok) ? "☑" : "☐"} |`);
  doc = doc.replace(/\| 0\.3 \|.*\| ☐ \|/, `| 0.3 | \`npm run rebuild:start\` — CSS 200, portals load | ${summary.pages.ok ? "☑" : "☐"} |`);
  doc = doc.replace(/\| 0\.4 \|.*\| ☐ \|/, `| 0.4 | Role guards confirmed active (no skip flag) | ${summary.guards.ok ? "☑" : "☐"} |`);

  doc = doc.replace(/\| Date \| _pending_ \|/, `| Date | ${date} |`);
  doc = doc.replace(/\| Verifier \| _pending_ \|/, "| Verifier | verify-auth-baseline.mjs |");
  doc = doc.replace(/\| Guards \| _pending_ \|/, `| Guards | ${summary.guards.detail} |`);
  doc = doc.replace(/\| Admin login \| _pending_ \|/, `| Admin login | ${summary.logins.find((l) => l.label === "admin")?.ok ? "pass" : "fail"} |`);
  doc = doc.replace(/\| Staff login \| _pending_ \|/, `| Staff login | ${summary.logins.find((l) => l.label === "staff")?.ok ? "pass" : "fail"} |`);
  doc = doc.replace(/\| Client login \| _pending_ \|/, `| Client login | ${summary.logins.find((l) => l.label === "client")?.ok ? "pass" : "fail"} |`);
  doc = doc.replace(/\| CSS 200 \| _pending_ \|/, `| CSS 200 | ${summary.css.ok ? "pass" : "fail"} (${summary.css.cssStatus}) |`);

  writeFileSync(DOC_PATH, doc, "utf8");
  return summary.ok;
}

async function main() {
  console.log(`\n=== Phase 0 Auth Baseline — ${BASE} ===\n`);

  const guards = checkEnvGuards();
  console.log(guards.ok ? "✓" : "✗", "0.4 Role guards:", guards.detail);

  const up = await waitForServer();
  if (!up) {
    console.error("✗ Server not reachable at", BASE);
    console.error("  Run: npm run rebuild:start");
    process.exit(1);
  }

  const pages = await checkSignInPage();
  console.log(pages.ok ? "✓" : "✗", "0.3 Sign-in page:", pages.signInStatus, "| CSS:", pages.cssPath, "→", pages.cssStatus);

  const logins = [];
  for (const user of USERS) {
    const result = await signInUser(user.email);
    const roleMatch = result.role === user.role;
    const portal = result.jar ? await checkPortalPage(result.jar, user.portal) : { ok: false };
    const ok = result.ok && roleMatch && portal.ok;
    logins.push({ label: user.label, ok, role: result.role, expectedRole: user.role, portal: portal.ok, reason: result.reason });
    console.log(
      ok ? "✓" : "✗",
      `0.2 ${user.label} login:`,
      ok ? `role=${result.role}, portal ${user.portal} OK` : (result.reason ?? `role mismatch (${result.role} vs ${user.role}) or portal fail`),
    );
  }

  const summary = {
    guards,
    css: { ok: pages.cssStatus === "200", cssStatus: pages.cssStatus },
    pages,
    logins,
    ok: guards.ok && pages.ok && logins.every((l) => l.ok),
  };

  updateDoc(summary);

  console.log("\n---");
  if (summary.ok) {
    console.log("PASS — Phase 0 baseline complete. See doc/migration/PHASE_AUTH_0_BASELINE.md");
    process.exit(0);
  } else {
    console.log("FAIL — Fix issues above and re-run: npm run verify:auth-baseline");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
