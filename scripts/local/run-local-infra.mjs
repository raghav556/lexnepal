import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const action = process.argv[2] || "start";

const commands = {
  start: {
    ps1: "scripts/local/start-infrastructure.ps1",
    sh: "scripts/local/start-infrastructure.sh",
  },
  stop: {
    ps1: "scripts/local/stop-infrastructure.ps1",
    sh: "scripts/local/stop-infrastructure.sh",
  },
  "update-clamav": {
    ps1: "scripts/local/update-clamav.ps1",
    sh: "scripts/local/update-clamav.sh",
  },
};

const command = commands[action];
if (!command) {
  console.error(`Unknown local infrastructure action: ${action}`);
  process.exit(1);
}

function executableExists(name) {
  const checker = process.platform === "win32" ? "where" : "command";
  const args = process.platform === "win32" ? [name] : ["-v", name];
  return (
    spawnSync(checker, args, { stdio: "ignore", shell: process.platform !== "win32" }).status === 0
  );
}

function run(bin, args) {
  const result = spawnSync(bin, args, { cwd: root, stdio: "inherit" });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

if (process.platform === "win32") {
  const shell = executableExists("pwsh")
    ? "pwsh"
    : executableExists("powershell")
      ? "powershell"
      : null;
  if (!shell) {
    console.error("PowerShell is required for local infrastructure on Windows.");
    process.exit(1);
  }
  run(shell, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(root, command.ps1)]);
}

const shellScript = path.join(root, command.sh);
if (!fs.existsSync(shellScript)) {
  console.error(`Missing Unix local infrastructure script: ${command.sh}`);
  process.exit(1);
}

run("bash", [shellScript]);
