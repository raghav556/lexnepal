import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * Starts Next (3001) and the Vite legacy SPA (3002) together.
 * Unmigrated routes are rewritten from Next → Vite via next.config.ts.
 */
const nextCli = fileURLToPath(new URL("../../node_modules/next/dist/bin/next", import.meta.url));
const viteCli = fileURLToPath(new URL("../../node_modules/vite/bin/vite.js", import.meta.url));

const children = [];

function start(name, args) {
  const child = spawn(process.execPath, args, {
    env: process.env,
    stdio: "inherit",
  });
  child.on("error", (error) => {
    console.error(`[${name}] failed to start:`, error);
    shutdown(1);
  });
  child.on("exit", (code, signal) => {
    if (signal) {
      shutdown(1, signal);
      return;
    }
    if (code && code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
      shutdown(code);
    }
  });
  children.push(child);
  return child;
}

function shutdown(code = 0, signal) {
  for (const child of children) {
    if (!child.killed) child.kill(signal ?? "SIGTERM");
  }
  if (signal) process.kill(process.pid, signal);
  else process.exit(code);
}

process.on("SIGINT", () => shutdown(0, "SIGINT"));
process.on("SIGTERM", () => shutdown(0, "SIGTERM"));

console.log("[dev] Starting Vite legacy SPA on :3002 (fallback for unmigrated routes)...");
start("vite", [viteCli, "--port", "3002"]);

console.log("[dev] Starting Next.js on :3001...");
start("next", [nextCli, "dev", "next-app", "--port", "3001"]);
