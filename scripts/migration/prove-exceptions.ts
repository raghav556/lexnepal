/**
 * R3.4 proof: a deliberately bad export row is never silently dropped —
 * it must appear in doc/migration/data-exceptions.csv. Approving it via
 * approved-exceptions.csv makes reconcile exit clean for that exception.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { closeDatabase } from "../../src/server/db/client";
import { EXCEPTIONS_CSV, APPROVED_EXCEPTIONS_CSV } from "./types";
import { appendReconciliationReport } from "./report-writer";
import type { DomainMigrationReport } from "./types";
import {
  ensureApprovedExceptionsPlaceholder,
  loadApprovedExceptions,
  partitionExceptions,
} from "./exceptions-ledger";
import type { ReconcileException } from "./reconcile";

const firmMap = path.resolve("tests/fixtures/convex-identity-firm-map.json");
const orphan = "61000000-0000-4000-8000-000000000001";
const badId = "convex_hr_leave_bad_unmapped_user";

async function runCli(args: string[]): Promise<{ code: number; stdout: string }> {
  const { spawn } = await import("node:child_process");
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

async function csvContains(id: string) {
  const text = await fs.readFile(EXCEPTIONS_CSV, "utf8").catch(() => "");
  return text.includes(id);
}

try {
  // Start from a clean approval ledger so the fail-then-approve sequence is deterministic.
  await fs.mkdir(path.dirname(APPROVED_EXCEPTIONS_CSV), { recursive: true });
  await fs.writeFile(
    APPROVED_EXCEPTIONS_CSV,
    "domain,table,id,type,reasonContains,approvedBy,approvedAt,note\n",
    "utf8",
  );
  await ensureApprovedExceptionsPlaceholder();

  // Build a temp HR export with one good attendance row and one bad leave (unknown user).
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "lexnepal-hr-exceptions-"));
  await fs.mkdir(path.join(tempDir, "attendance"), { recursive: true });
  await fs.mkdir(path.join(tempDir, "leaveRequests"), { recursive: true });
  await fs.writeFile(
    path.join(tempDir, "attendance", "documents.jsonl"),
    `${JSON.stringify({
      _id: "convex_hr_att_prove_ok",
      _creationTime: 1785628800000,
      firmId: "convex_firm_a",
      userId: "convex_identity_user_1",
      date: "2026-08-05",
      clockIn: "09:00 AM",
      status: "present",
    })}\n`,
    "utf8",
  );
  await fs.writeFile(
    path.join(tempDir, "leaveRequests", "documents.jsonl"),
    `${JSON.stringify({
      _id: badId,
      _creationTime: 1785715200000,
      firmId: "convex_firm_a",
      userId: "convex_user_DOES_NOT_EXIST",
      type: "annual",
      fromDate: "2026-08-20",
      toDate: "2026-08-21",
      reason: "prove silent-drop detection",
      status: "pending",
    })}\n`,
    "utf8",
  );

  const before = await fs.readFile(EXCEPTIONS_CSV, "utf8").catch(() => "");

  const importResult = await runCli([
    "import-postgres",
    "--domain",
    "hr",
    "--force",
    "--export-path",
    tempDir,
    "--firm-map",
    firmMap,
    "--orphan-firm",
    orphan,
  ]);
  if (importResult.code === 0) {
    throw new Error("Expected import to fail when a leave row cannot be mapped");
  }

  const afterImport = await fs.readFile(EXCEPTIONS_CSV, "utf8");
  if (afterImport.length <= before.length || !(await csvContains(badId))) {
    throw new Error(`Bad row ${badId} was not written to data-exceptions.csv`);
  }

  // Reconcile should also record the exception and exit unexplained.
  const reconcileBad = await runCli([
    "reconcile",
    "--domain",
    "hr",
    "--export-path",
    tempDir,
    "--firm-map",
    firmMap,
    "--orphan-firm",
    orphan,
  ]);
  if (reconcileBad.code === 0) {
    throw new Error("Expected reconcile to fail with unexplained exceptions");
  }

  // Approve the exception(s) (operator step 6), then reconcile should pass unexplained=0.
  // Import reports both the row-level failure and the resulting count mismatch.
  // Rewrite (not append) so re-runs stay idempotent.
  const approvedAt = new Date().toISOString();
  await fs.writeFile(
    APPROVED_EXCEPTIONS_CSV,
    [
      "domain,table,id,type,reasonContains,approvedBy,approvedAt,note",
      `"hr","leaveRequests","${badId}","OTHER","Unknown userId","local-prove","${approvedAt}","R3.4 prove-exceptions intentional bad row"`,
      `"hr","leaveRequests","","ROW_COUNT_MISMATCH","","local-prove","${approvedAt}","Count mismatch caused by approved unmapped leave row"`,
      "",
    ].join("\n"),
    "utf8",
  );

  const reconcileApproved = await runCli([
    "reconcile",
    "--domain",
    "hr",
    "--export-path",
    tempDir,
    "--firm-map",
    firmMap,
    "--orphan-firm",
    orphan,
  ]);
  if (reconcileApproved.code !== 0) {
    throw new Error("Expected reconcile to pass after approving the exception");
  }
  if (!reconcileApproved.stdout.includes("approved")) {
    throw new Error("Expected reconcile log to mention approved exceptions");
  }

  // Still never dropped from raw CSV
  if (!(await csvContains(badId))) {
    throw new Error("Approved exception disappeared from data-exceptions.csv");
  }

  const synthetic: ReconcileException[] = [
    {
      domain: "hr",
      table: "leaveRequests",
      id: badId,
      type: "OTHER",
      reason: "Unknown userId",
    },
  ];
  const partitioned = partitionExceptions(synthetic, await loadApprovedExceptions());
  if (partitioned.unexplained.length !== 0 || partitioned.approved.length !== 1) {
    throw new Error("partitionExceptions failed for approved row");
  }

  const report: DomainMigrationReport = {
    source: { leaveRequests: 1 },
    migrated: { leaveRequests: 0 },
    exceptions: [{ table: "leaveRequests", id: badId, reason: "Unknown userId" }],
    reconciliation: {
      passed: true,
      checks: { leaveRequests: { source: 1, target: 0 } },
    },
  };
  await appendReconciliationReport({
    domain: "hr",
    command: "prove-exceptions",
    report,
    notes: [
      "R3.4: bad row always appended to data-exceptions.csv.",
      "Approved via approved-exceptions.csv → unexplained=0 for exit gate.",
      "Raw exception ledger retains the row (never silently dropped).",
    ],
  });

  console.log(
    JSON.stringify(
      {
        passed: true,
        badId,
        recordedInCsv: true,
        importFailedAsExpected: true,
        reconcileFailedUntilApproved: true,
        reconcilePassedAfterApproval: true,
      },
      null,
      2,
    ),
  );
  console.log("migration:prove-exceptions passed");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
