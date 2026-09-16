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
 * Next development routes are compiled lazily. The staff dashboard requests
 * several independent API route handlers on first paint, so opening it
 * immediately after a restart can otherwise spend many seconds waiting for
 * compilation even though the underlying queries complete quickly.
 *
 * Warm only idempotent GET routes, with modest concurrency, so `npm run dev`
 * produces a smooth owner preview without changing production behavior.
 */
const previewWarmupTargets = [
  "/",
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
  "/api/auth/get-session",
  "/api/v1/public/cms/settings",
  "/api/v1/public/cms/team",
  "/api/v1/public/cms/practice-areas?isActive=true",
  "/api/v1/public/cms/testimonials?isApproved=true&showOnHome=true",
  "/api/v1/public/cms/blog-posts?status=published",
  "/api/v1/public/cms/assets/warmup",
  "/api/v1/users/me",
  "/api/v1/auth/session",
  "/api/v1/cases",
  "/api/v1/clients",
  "/api/v1/hearings",
  "/api/v1/tasks",
  "/api/v1/tasks/workload",
  "/api/v1/appointments",
  "/api/v1/documents",
  "/api/v1/documents/recent?limit=5",
  "/api/v1/dm/threads",
  "/api/v1/notifications",
  "/api/v1/users/directory",
  "/api/v1/messages/unread",
];

async function waitForPreviewServer() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      await fetch(`${previewOrigin}/sign-in/staff`, {
        signal: AbortSignal.timeout(2_000),
      });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error("Next.js did not become reachable within 30 seconds");
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

async function warmLocalPreview() {
  await waitForPreviewServer();
  console.log("[dev] Warming staff preview routes...");
  const startedAt = Date.now();
  const failures = [];
  const queue = [...previewWarmupTargets];
  const workers = Array.from({ length: 3 }, async () => {
    while (queue.length > 0) {
      const pathname = queue.shift();
      if (!pathname) return;
      const failure = await warmTarget(pathname);
      if (failure) failures.push(failure);
    }
  });
  await Promise.all(workers);
  const elapsedSeconds = ((Date.now() - startedAt) / 1_000).toFixed(1);
  if (failures.length > 0) {
    console.warn(`[dev] Preview warm-up finished in ${elapsedSeconds}s with warnings:`);
    failures.forEach((failure) => console.warn(`  - ${failure}`));
    return;
  }
  console.log(`[dev] Preview ready at ${previewOrigin} (warmed in ${elapsedSeconds}s)`);
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
