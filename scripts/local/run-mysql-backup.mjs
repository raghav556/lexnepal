import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const ps1 = path.join(root, "scripts/local/mysql-backup.ps1");
const sh = path.join(root, "scripts/local/mysql-backup.sh");

if (process.platform === "win32") {
  const shell = existsSync("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe")
    ? "powershell"
    : "pwsh";
  const result = spawnSync(shell, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1], {
    cwd: root,
    stdio: "inherit",
  });
  process.exit(result.status ?? 1);
}

if (!existsSync(sh)) {
  console.error(`Missing Unix backup script: ${sh}`);
  process.exit(1);
}

const result = spawnSync("bash", [sh], { cwd: root, stdio: "inherit" });
process.exit(result.status ?? 1);
