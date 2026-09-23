import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

/** Starts the Next dev server on :3001 — the only application shell. */
const nextCli = fileURLToPath(new URL("../../node_modules/next/dist/bin/next", import.meta.url));
const previewOrigin = "http://127.0.0.1:3001";

// Next 16's Turbopack substantially reduces cold page and API compilation time.
// Keep the flag explicit so local preview performance does not silently regress
// to the legacy webpack development compiler.
// A troubleshooting fallback remains available with: npm run dev -- --webpack.
const bundler = process.argv.includes("--webpack") ? "--webpack" : "--turbopack";
const child = spawn(
  process.execPath,
  ["--max-old-space-size=4096", nextCli, "dev", bundler, "--port", "3001"],
  {
    env: process.env,
    stdio: "inherit",
  },
);

/*
 * Next development routes compile lazily. Owner preview currently focuses on
 * the Client portal, so Phase A pre-compiles Client-critical pages/APIs before
 * signalling readiness. Phase B then warms remaining Staff/general routes in
 * the background without blocking Client login.
 *
 * Warm only idempotent GET routes. Production behavior is unchanged.
 *
 * LEXNEPAL_SKIP_DEV_WARMUP=1 — skip all warm-up
 * LEXNEPAL_DEV_WARMUP=client|full|off — optional scope (default: full two-phase)
 */
const clientCriticalTargets = [
  "/",
  "/sign-in?portal=client",
  "/client",
  "/client/cases",
  "/client/hearings",
  "/client/checklist",
  "/client/documents",
  "/client/messages",
  "/api/auth/get-session",
  "/api/v1/public/cms/settings",
  "/api/v1/users/me",
  "/api/v1/auth/session",
  "/api/v1/cases",
  "/api/v1/hearings",
  "/api/v1/tasks",
  "/api/v1/documents",
  "/api/v1/notifications",
  "/api/v1/messages/unread",
];

const backgroundTargets = [
  "/sign-in/staff",
  "/staff",
  "/staff/tasks",
  "/staff/hr",
  "/staff/cases",
  "/staff/cases/warmup",
  "/staff/hearings",
  "/staff/documents",
  "/staff/research",
  "/staff/content",
  "/staff/crm",
  "/staff/clients",
  "/staff/messages",
  "/staff/team-chat",
  "/staff/appointments",
  "/staff/profile",
  "/api/v1/public/cms/team",
  "/api/v1/public/cms/practice-areas?isActive=true",
  "/api/v1/public/cms/testimonials?isApproved=true&showOnHome=true",
  "/api/v1/public/cms/blog-posts?status=published",
  "/api/v1/public/cms/assets/warmup",
  "/api/v1/clients",
  "/api/v1/tasks/workload",
  "/api/v1/appointments",
  "/api/v1/documents/recent?limit=5",
  "/api/v1/dm/threads",
  "/api/v1/users/directory",
];

function resolveWarmupMode() {
  const mode = (process.env.LEXNEPAL_DEV_WARMUP ?? "full").trim().toLowerCase();
  if (mode === "off" || mode === "client" || mode === "full") return mode;
  console.warn(`[dev] Unknown LEXNEPAL_DEV_WARMUP=${mode}; using full`);
  return "full";
}

async function waitForPreviewServer() {
  // External HDD / first webpack compile can exceed 30s before any route responds.
  for (let attempt = 0; attempt < 480; attempt += 1) {
    try {
      const response = await fetch(`${previewOrigin}/api/v1/health`, {
        signal: AbortSignal.timeout(3_000),
      });
      if (response.ok || response.status < 500) return;
    } catch {
      /* retry until Next accepts connections */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Next.js did not become reachable within 120 seconds");
}

async function warmTarget(pathname) {
  try {
    const response = await fetch(`${previewOrigin}${pathname}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(60_000),
      headers: { "x-lexnepal-preview-warmup": "1" },
    });
    return response.status < 500 ? null : `${pathname} (${response.status})`;
  } catch (error) {
    return `${pathname} (${error instanceof Error ? error.message : "request failed"})`;
  }
}

async function warmQueue(targets, workerCount) {
  const failures = [];
  const queue = [...targets];
  const workers = Array.from({ length: workerCount }, async () => {
    while (queue.length > 0) {
      const pathname = queue.shift();
      if (!pathname) return;
      const failure = await warmTarget(pathname);
      if (failure) failures.push(failure);
    }
  });
  await Promise.all(workers);
  return failures;
}

function logWarmupWarnings(label, failures, elapsedSeconds) {
  if (failures.length === 0) return;
  console.warn(`[dev] ${label} finished in ${elapsedSeconds}s with warnings:`);
  failures.forEach((failure) => console.warn(`  - ${failure}`));
}

async function warmLocalPreview() {
  const mode = resolveWarmupMode();
  if (mode === "off") {
    console.log("[dev] Preview warm-up disabled (LEXNEPAL_DEV_WARMUP=off or SKIP)");
    return;
  }

  await waitForPreviewServer();

  console.log("[dev] Client owner-preview warm-up starting...");
  const phaseAStarted = Date.now();
  const phaseAFailures = await warmQueue(clientCriticalTargets, 2);
  const phaseASeconds = ((Date.now() - phaseAStarted) / 1_000).toFixed(1);
  logWarmupWarnings("Client owner-preview warm-up", phaseAFailures, phaseASeconds);
  console.log(`[dev] Client owner preview ready at ${previewOrigin} (warmed in ${phaseASeconds}s)`);

  if (mode === "client") {
    console.log("[dev] Background warm-up skipped (LEXNEPAL_DEV_WARMUP=client)");
    return;
  }

  // Delay Staff/general compile so owner Client login/nav is not starved immediately
  // after the ready message (webpack compiles one graph at a time on this machine).
  const backgroundDelayMs = 120_000;
  console.log(
    `[dev] Background Staff/general warm-up scheduled in ${backgroundDelayMs / 1000}s...`,
  );
  await new Promise((resolve) => setTimeout(resolve, backgroundDelayMs));
  console.log("[dev] Background Staff/general warm-up proceeding...");
  const phaseBStarted = Date.now();
  const phaseBFailures = await warmQueue(backgroundTargets, 1);
  const phaseBSeconds = ((Date.now() - phaseBStarted) / 1_000).toFixed(1);
  logWarmupWarnings("Background warm-up", phaseBFailures, phaseBSeconds);
  if (phaseBFailures.length === 0) {
    console.log(`[dev] Background warm-up complete (${phaseBSeconds}s)`);
  }
}

child.on("error", (error) => {
  console.error("[dev] Next failed to start:", error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (!child.killed) child.kill(signal);
  });
}

console.log("[dev] Starting Next.js on :3001...");

if (process.env.LEXNEPAL_SKIP_DEV_WARMUP !== "1") {
  void warmLocalPreview().catch((error) => {
    console.warn(
      `[dev] Preview warm-up skipped: ${error instanceof Error ? error.message : String(error)}`,
    );
  });
}
