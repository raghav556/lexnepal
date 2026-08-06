/**
 * Verify Better Auth session cookie security attributes after sign-in.
 * Usage: node --env-file-if-exists=.env.local scripts/local/verify-auth-cookies.mjs
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const PASSWORD = "E2E-Smoke-Only-2026!";
const ADMIN_EMAIL = "e2e-admin@example.invalid";

const AUTH_HEADERS = {
  "content-type": "application/json",
  origin: BASE.replace(/\/$/, ""),
  referer: `${BASE}/sign-in`,
};

function parseSetCookie(header) {
  const attributes = {};
  const parts = header.split(";").map((part) => part.trim());
  const [nameValue] = parts;
  const eq = nameValue.indexOf("=");
  attributes.name = eq > 0 ? nameValue.slice(0, eq) : nameValue;
  attributes.value = eq > 0 ? nameValue.slice(eq + 1) : "";

  for (const part of parts.slice(1)) {
    const lower = part.toLowerCase();
    if (lower === "httponly") attributes.httpOnly = true;
    else if (lower === "secure") attributes.secure = true;
    else if (lower.startsWith("samesite=")) attributes.sameSite = part.split("=")[1];
    else if (lower.startsWith("path=")) attributes.path = part.split("=")[1];
  }
  return attributes;
}

function findSessionCookie(setCookieHeaders) {
  return setCookieHeaders
    .map(parseSetCookie)
    .find((cookie) => cookie.name.includes("session_token") && cookie.value);
}

async function signInAndCollectCookies() {
  const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: AUTH_HEADERS,
    body: JSON.stringify({ email: ADMIN_EMAIL, password: PASSWORD, rememberMe: true }),
  });
  const setCookies = res.headers.getSetCookie?.() ?? [];
  return { status: res.status, setCookies, sessionCookie: findSessionCookie(setCookies) };
}

function verifyCookieAttributes(cookie) {
  const issues = [];
  if (!cookie.httpOnly) issues.push("missing HttpOnly");
  if ((cookie.sameSite ?? "").toLowerCase() !== "lax") issues.push(`SameSite=${cookie.sameSite ?? "unset"}`);
  if (cookie.path !== "/") issues.push(`Path=${cookie.path ?? "unset"}`);
  if (IS_PRODUCTION && !cookie.secure) issues.push("missing Secure in production");
  if (!IS_PRODUCTION && cookie.secure) issues.push("Secure should be off in local development");
  return issues;
}

async function main() {
  console.log(`Verifying auth cookies against ${BASE} (production=${IS_PRODUCTION})`);

  const { status, sessionCookie, setCookies } = await signInAndCollectCookies(ADMIN_EMAIL);
  if (status !== 200) {
    console.error(`Sign-in failed with status ${status}`);
    process.exit(1);
  }
  if (!sessionCookie) {
    console.error("No session_token cookie returned from sign-in");
    console.error("Set-Cookie headers:", setCookies);
    process.exit(1);
  }

  const issues = verifyCookieAttributes(sessionCookie);
  if (issues.length) {
    console.error("Cookie attribute issues:", issues.join(", "));
    console.error("Cookie:", sessionCookie);
    process.exit(1);
  }

  console.log("Session cookie attributes OK:", {
    name: sessionCookie.name,
    httpOnly: sessionCookie.httpOnly,
    sameSite: cookieSameSite(sessionCookie),
    secure: Boolean(sessionCookie.secure),
    path: sessionCookie.path,
  });
}

function cookieSameSite(cookie) {
  return (cookie.sameSite ?? "lax").toLowerCase();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
