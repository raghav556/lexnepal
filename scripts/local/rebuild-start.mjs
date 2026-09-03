import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const port = process.env.PORT ?? "3001";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (process.platform === "win32") {
  spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      `$pids = (Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue).OwningProcess | Sort-Object -Unique; foreach ($p in $pids) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }`,
    ],
    { stdio: "inherit" },
  );
} else {
  try {
    const result = spawnSync("bash", ["-c", `fuser -k ${port}/tcp 2>/dev/null || true`], {
      stdio: "ignore",
    });
    // fuser may not be available; lsof is a fallback
    if (result.status !== 0) {
      spawnSync("bash", ["-c", `lsof -ti:${port} | xargs -r kill -9 2>/dev/null || true`], {
        stdio: "ignore",
      });
    }
  } catch {
    // port-kill is best-effort on Linux
  }
}

run(npmCmd, ["run", "build"]);
run("node", [
  "--env-file-if-exists=.env.local",
  fileURLToPath(new URL("./run-next.mjs", import.meta.url)),
  "start",
  "--port",
  port,
]);
