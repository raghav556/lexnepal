import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const nextCli = fileURLToPath(new URL("../../node_modules/next/dist/bin/next", import.meta.url));
const isBuild = process.argv.includes("build");
const child = spawn(process.execPath, [nextCli, ...process.argv.slice(2)], {
  env: {
    ...process.env,
    ...(isBuild ? { NEXT_PHASE: "phase-production-build", NEXT_IS_BUILD: "1" } : {}),
  },
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
