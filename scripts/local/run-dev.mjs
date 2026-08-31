import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

/** Starts the Next dev server on :3001 — the only application shell. */
const nextCli = fileURLToPath(new URL("../../node_modules/next/dist/bin/next", import.meta.url));

// Next 16's Turbopack substantially reduces cold page and API compilation time.
// Keep the flag explicit so local preview performance does not silently regress
// to the legacy webpack development compiler.
// A troubleshooting fallback remains available with: npm run dev -- --webpack.
const bundler = process.argv.includes("--webpack") ? "--webpack" : "--turbopack";
const child = spawn(process.execPath, [nextCli, "dev", bundler, "--port", "3001"], {
  env: process.env,
  stdio: "inherit",
});

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
