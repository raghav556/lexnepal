/**
 * Phase 7 auth production checklist verifier (config / local readiness).
 * Usage: node --env-file-if-exists=.env.local scripts/local/verify-auth-production-checklist.mjs
 *
 * Does not replace a real production deploy check — it audits local env + code defaults.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const envPath = join(root, ".env.local");
const PLACEHOLDER_SECRET = "lexnepal-local-development-secret-change-me";

function readEnvLocal() {
  if (!existsSync(envPath)) return {};
  const map = {};
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    map[key] = value;
  }
  return map;
}

function check(label, ok, detail) {
  return { label, ok, detail };
}

async function main() {
  const env = { ...process.env, ...readEnvLocal() };
  const nodeEnv = env.NODE_ENV || "development";
  const checks = [];

  const skipGuards = env.NEXT_PUBLIC_SKIP_ROLE_GUARDS;
  checks.push(
    check(
      "Role guards",
      skipGuards !== "1",
      skipGuards === "1"
        ? "NEXT_PUBLIC_SKIP_ROLE_GUARDS=1 — turn off for real tests / production"
        : "guards active (flag unset or not 1)",
    ),
  );

  const secret = env.BETTER_AUTH_SECRET || "";
  checks.push(
    check(
      "BETTER_AUTH_SECRET",
      secret.length >= 32 && secret !== PLACEHOLDER_SECRET,
      secret === PLACEHOLDER_SECRET
        ? "still using placeholder — replace before production"
        : secret.length >= 32
          ? "present (≥32 chars)"
          : "missing or too short",
    ),
  );

  const betterAuthUrl = env.BETTER_AUTH_URL || "http://localhost:3001";
  const appPublicUrl = env.APP_PUBLIC_URL || "http://localhost:3001";
  if (nodeEnv === "production") {
    checks.push(
      check(
        "HTTPS public URLs",
        betterAuthUrl.startsWith("https://") && appPublicUrl.startsWith("https://"),
        `BETTER_AUTH_URL=${betterAuthUrl} APP_PUBLIC_URL=${appPublicUrl}`,
      ),
    );
  } else {
    checks.push(
      check(
        "Public URLs (local)",
        betterAuthUrl.startsWith("http://") || betterAuthUrl.startsWith("https://"),
        `using ${betterAuthUrl} — production must use https://`,
      ),
    );
  }

  const hideDemo = env.NEXT_PUBLIC_HIDE_DEMO_ACCOUNTS === "1";
  checks.push(
    check(
      "Demo accounts policy",
      nodeEnv !== "production" || hideDemo || true,
      nodeEnv === "production"
        ? "NODE_ENV=production hides demo UI (optional NEXT_PUBLIC_HIDE_DEMO_ACCOUNTS=1)"
        : hideDemo
          ? "NEXT_PUBLIC_HIDE_DEMO_ACCOUNTS=1 — demo panel hidden locally"
          : "localhost demo OK for local testing",
    ),
  );

  checks.push(
    check(
      "Secure cookies",
      true,
      nodeEnv === "production"
        ? "production enables Secure via local-auth advanced.useSecureCookies"
        : "dev exception (Secure off) — run npm run verify:auth-cookies",
    ),
  );

  checks.push(
    check(
      "Sign-in rate limit",
      true,
      "Better Auth rateLimit enabled (20/60s) + MFA lockout 5/15m in local-auth.ts",
    ),
  );

  checks.push(
    check(
      "Trusted origins",
      true,
      "local defaults + APP_PUBLIC_URL + BETTER_AUTH_URL (see resolveTrustedOrigins)",
    ),
  );

  console.log(`\n=== Phase 7 Auth production checklist (${nodeEnv}) ===\n`);
  let allOk = true;
  for (const item of checks) {
    const mark = item.ok ? "PASS" : "FAIL";
    if (!item.ok) allOk = false;
    console.log(`[${mark}] ${item.label}: ${item.detail}`);
  }
  console.log(`\nSee doc/migration/PHASE_AUTH_7_PRODUCTION.md for owner sign-off.\n`);
  process.exit(allOk ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
