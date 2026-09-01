/** Reconciliation-report proof for retained storage checksums. */
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { closeDatabase } from "../../src/server/db/client";
import { RECONCILIATION_REPORT } from "./types";

const firmA = "61000000-0000-4000-8000-000000000001";

function runCli(args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [
        "--env-file-if-exists=.env.local",
        "--conditions=react-server",
        "--import",
        "tsx",
        "scripts/migration/cli.ts",
        ...args,
      ],
      { cwd: process.cwd(), env: process.env, stdio: "inherit" },
    );
    child.on("close", (code) => resolve(code ?? 1));
  });
}

try {
  const exportPath = "tests/fixtures/convex-export";
  const firmMap = path.resolve(exportPath, "firm-map.json");
  if (
    (await runCli([
      "import-postgres",
      "--domain",
      "storage",
      "--force",
      "--export-path",
      exportPath,
      "--firm-map",
      firmMap,
    ])) !== 0
  ) {
    throw new Error("Storage import failed");
  }
  if (
    (await runCli([
      "reconcile",
      "--domain",
      "storage",
      "--export-path",
      exportPath,
      "--firm-map",
      firmMap,
      "--orphan-firm",
      firmA,
    ])) !== 0
  ) {
    throw new Error("Storage reconciliation failed");
  }
  const report = await fs.readFile(RECONCILIATION_REPORT, "utf8");
  const slice = report.slice(report.lastIndexOf("## storage"));
  if (!slice.includes("### File SHA-256") || !slice.includes("| yes |")) {
    throw new Error("Storage checksum evidence is incomplete");
  }
  console.log(JSON.stringify({ passed: true, fileSha256Present: true }));
} finally {
  await closeDatabase();
}
