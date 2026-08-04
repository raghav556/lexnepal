/**
 * R3.5 proof: reconciliation-report.md includes Counts, Missing IDs, FK integrity,
 * Financial totals, and File SHA-256 for the representative domains.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { closeDatabase } from "../../src/server/db/client";
import { RECONCILIATION_REPORT } from "./types";
import { appendReconciliationReport } from "./report-writer";
import type { DomainMigrationReport } from "./types";

const firmA = "61000000-0000-4000-8000-000000000001";
const firmMap = path.resolve("tests/fixtures/convex-identity-firm-map.json");
const storageFirmMap = path.resolve("tests/fixtures/convex-export/firm-map.json");

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

function assertContains(haystack: string, needle: string, label: string) {
  if (!haystack.includes(needle)) {
    throw new Error(`Expected reconciliation report to include ${label}: ${needle}`);
  }
}

try {
  // Prereqs for financial FK targets.
  for (const args of [
    [
      "import-postgres",
      "--domain",
      "identity",
      "--force",
      "--export-path",
      "tests/fixtures/convex-identity-export",
      "--firm-map",
      firmMap,
    ],
    [
      "import-postgres",
      "--domain",
      "matters",
      "--force",
      "--export-path",
      "tests/fixtures/convex-matters-export",
      "--firm-map",
      firmMap,
      "--orphan-firm",
      firmA,
    ],
    [
      "import-postgres",
      "--domain",
      "financial",
      "--force",
      "--export-path",
      "tests/fixtures/convex-financial-export",
      "--firm-map",
      firmMap,
      "--orphan-firm",
      firmA,
    ],
  ]) {
    const result = await runCli(args);
    if (result.code !== 0) throw new Error(`CLI failed: ${args.join(" ")}`);
  }

  const financialReconcile = await runCli([
    "reconcile",
    "--domain",
    "financial",
    "--export-path",
    "tests/fixtures/convex-financial-export",
    "--firm-map",
    firmMap,
    "--orphan-firm",
    firmA,
  ]);
  if (financialReconcile.code !== 0) {
    throw new Error("financial reconcile failed");
  }

  const storageImport = await runCli([
    "import-postgres",
    "--domain",
    "storage",
    "--force",
    "--export-path",
    "tests/fixtures/convex-export",
    "--firm-map",
    storageFirmMap,
  ]);
  if (storageImport.code !== 0) {
    throw new Error("storage import failed (is local MinIO up?)");
  }

  const storageReconcile = await runCli([
    "reconcile",
    "--domain",
    "storage",
    "--export-path",
    "tests/fixtures/convex-export",
    "--firm-map",
    storageFirmMap,
    "--orphan-firm",
    firmA,
  ]);
  if (storageReconcile.code !== 0) {
    throw new Error("storage reconcile failed (SHA mismatches?)");
  }

  const reportText = await fs.readFile(RECONCILIATION_REPORT, "utf8");
  const financialSlice = reportText.slice(reportText.lastIndexOf("## financial — reconcile"));
  assertContains(financialSlice, "### Counts", "Counts section");
  assertContains(financialSlice, "### Missing IDs", "Missing IDs section");
  assertContains(financialSlice, "### FK integrity", "FK integrity section");
  assertContains(financialSlice, "### Financial totals", "Financial totals section");
  assertContains(financialSlice, "invoices.total", "invoice total metric");
  assertContains(financialSlice, "| 11300.00 | 11300.00 | yes |", "matching invoice total");

  const storageSlice = reportText.slice(
    Math.max(
      reportText.lastIndexOf("## storage — reconcile"),
      reportText.lastIndexOf("## storage — import-postgres"),
    ),
  );
  assertContains(storageSlice, "### File SHA-256", "File SHA-256 section");
  assertContains(storageSlice, "| yes |", "at least one SHA match");

  const summary: DomainMigrationReport = {
    source: { financial: 1, storage: 1 },
    migrated: { financial: 1, storage: 1 },
    exceptions: [],
    reconciliation: {
      passed: true,
      checks: {
        financial: { source: 1, target: 1 },
        storage: { source: 1, target: 1 },
      },
    },
  };
  await appendReconciliationReport({
    domain: "r3.5",
    command: "prove-reconciliation",
    report: summary,
    notes: [
      "R3.5: reconciliation-report.md includes Counts, Missing IDs, FK integrity, Financial totals, File SHA-256.",
      "Financial invoice total 11300.00 matched export ↔ Postgres.",
      "Storage journal SHA-256 rows present with matches.",
    ],
  });

  console.log(
    JSON.stringify(
      {
        passed: true,
        financialTotalsPresent: true,
        fileSha256Present: true,
        invoiceTotalMatched: true,
      },
      null,
      2,
    ),
  );
  console.log("migration:prove-reconciliation passed");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
