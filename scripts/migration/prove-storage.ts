/**
 * R3.6 proof: full local rehearsal for --domain storage using existing
 * convertConvexStorageExport + migrateLegacyStorage helpers.
 *
 * Sequence: dry-run → import → verify → reconcile → second import (double-run).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { closeDatabase } from "../../src/server/db/client";
import { appendReconciliationReport } from "./report-writer";
import { loadDomainReport } from "./report-store";
import { countStorageObjects, runStorageConvertAndMigrate } from "./storage-run";

const exportPath = path.resolve("tests/fixtures/convex-export");
const firmMapPath = path.resolve("tests/fixtures/convex-export/firm-map.json");
const firmA = "61000000-0000-4000-8000-000000000001";

async function runCli(args: string[]): Promise<{ code: number; stdout: string }> {
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
      { cwd: process.cwd(), env: process.env },
    );
    let stdout = "";
    child.stdout.on("data", (c) => {
      stdout += String(c);
      process.stdout.write(c);
    });
    child.stderr.on("data", (c) => process.stderr.write(c));
    child.on("close", (code) => resolve({ code: code ?? 1, stdout }));
  });
}

try {
  const sourceCount = await countStorageObjects(exportPath);
  if (sourceCount < 1) {
    throw new Error(`Expected fixture _storage objects, got ${sourceCount}`);
  }

  // Mirror under exports/storage (plan step 2)
  const dest = path.resolve("exports", "storage");
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.rm(dest, { recursive: true, force: true }).catch(() => undefined);
  try {
    await fs.symlink(exportPath, dest, "junction");
  } catch {
    // optional
  }

  const dry = await runCli([
    "import-postgres",
    "--domain",
    "storage",
    "--dry-run",
    "--export-path",
    exportPath,
    "--firm-map",
    firmMapPath,
  ]);
  if (dry.code !== 0) throw new Error("storage dry-run failed");
  if (!dry.stdout.includes(String(sourceCount))) {
    throw new Error(`dry-run did not report inventory count ${sourceCount}`);
  }

  const first = await runCli([
    "import-postgres",
    "--domain",
    "storage",
    "--force",
    "--export-path",
    exportPath,
    "--firm-map",
    firmMapPath,
  ]);
  if (first.code !== 0) throw new Error("storage import failed (is MinIO up?)");

  const verify = await runCli(["verify", "--domain", "storage"]);
  if (verify.code !== 0) throw new Error("storage verify failed");

  const reconcile = await runCli([
    "reconcile",
    "--domain",
    "storage",
    "--export-path",
    exportPath,
    "--firm-map",
    firmMapPath,
    "--orphan-firm",
    firmA,
  ]);
  if (reconcile.code !== 0) throw new Error("storage reconcile failed");

  const firmMap = JSON.parse(await fs.readFile(firmMapPath, "utf8")) as Record<string, string>;
  const firstReport = await loadDomainReport("storage");
  if (!firstReport) throw new Error("Missing saved storage report after import");

  const second = await runStorageConvertAndMigrate({ exportPath, firmMap });

  const checksMatch =
    JSON.stringify(firstReport.reconciliation.checks) ===
    JSON.stringify(second.report.reconciliation.checks);
  if (!second.report.reconciliation.passed || !checksMatch) {
    throw new Error("storage double-run checks did not match");
  }
  if (second.report.reconciliation.checks.storageObjects?.target !== sourceCount) {
    throw new Error(
      `Expected verified=${sourceCount}, got ${second.report.reconciliation.checks.storageObjects?.target}`,
    );
  }

  await appendReconciliationReport({
    domain: "storage",
    command: "prove-storage",
    report: second.report,
    details: second.report.details,
    notes: [
      "R3.6: dry-run → import → verify → reconcile → double-run via convertConvexStorageExport + migrateLegacyStorage.",
      `sourceCount=${sourceCount}`,
      "Zero unexplained differences on second migrate.",
    ],
  });

  console.log(
    JSON.stringify(
      {
        passed: true,
        sourceCount,
        verified: second.report.reconciliation.checks.storageObjects?.target,
        helpers: ["convertConvexStorageExport", "migrateLegacyStorage"],
        doubleRunMatched: true,
      },
      null,
      2,
    ),
  );
  console.log("migration:prove-storage passed");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
