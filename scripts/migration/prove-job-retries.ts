/**
 * R4.7 proof: failure/retry jobs — dead-letter recoverable; no duplicate side effects.
 */
import { spawn } from "node:child_process";
import { appendReconciliationReport } from "./report-writer";
import type { DomainMigrationReport } from "./types";

const unitSuites = [
  "tests/unit/jobs-contracts.test.ts",
  "tests/unit/durable-job-worker.test.ts",
] as const;

function run(command: string, args: string[]): Promise<{ code: number; stdout: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      shell: false,
    });
    let stdout = "";
    child.stdout.on("data", (c) => {
      stdout += String(c);
      process.stdout.write(c);
    });
    child.stderr.on("data", (c) => {
      stdout += String(c);
      process.stderr.write(c);
    });
    child.on("close", (code) => resolve({ code: code ?? 1, stdout }));
  });
}

try {
  const unit = await run(process.execPath, [
    "./node_modules/vitest/vitest.mjs",
    "run",
    ...unitSuites,
  ]);
  if (unit.code !== 0) throw new Error("R4.7 unit suites failed");

  const verify = await run(process.execPath, [
    "--env-file-if-exists=.env.local",
    "--conditions=react-server",
    "--import",
    "tsx",
    "scripts/jobs/verify-local.ts",
  ]);
  if (verify.code !== 0) throw new Error("R4.7 jobs verify-local failed");

  const jsonLine = verify.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("{") && line.includes('"r47"'))
    .at(-1);
  if (!jsonLine) throw new Error("Jobs verify did not emit R4.7 evidence JSON");

  const payload = JSON.parse(jsonLine) as {
    r47: {
      idempotentEnqueue: boolean;
      retryBackoff: boolean;
      deadLetter: boolean;
      manualRetryRecoverable: boolean;
      noDuplicateSideEffects: boolean;
      leaseRecovery: boolean;
      scheduleExactlyOnce: boolean;
      sideEffectRuns: number;
    };
  };
  const checks = payload.r47;
  const passed =
    checks.idempotentEnqueue &&
    checks.retryBackoff &&
    checks.deadLetter &&
    checks.manualRetryRecoverable &&
    checks.noDuplicateSideEffects &&
    checks.sideEffectRuns === 1;

  if (!passed) {
    throw new Error(`R4.7 evidence incomplete: ${JSON.stringify(checks)}`);
  }

  const report: DomainMigrationReport = {
    source: { deadLetter: 1, recover: 1, sideEffects: 1 },
    migrated: {
      deadLetter: checks.deadLetter ? 1 : 0,
      recover: checks.manualRetryRecoverable ? 1 : 0,
      sideEffects: checks.sideEffectRuns,
    },
    exceptions: [],
    reconciliation: {
      passed,
      checks: {
        idempotentEnqueue: { source: 1, target: checks.idempotentEnqueue ? 1 : 0 },
        deadLetter: { source: 1, target: checks.deadLetter ? 1 : 0 },
        manualRetryRecoverable: { source: 1, target: checks.manualRetryRecoverable ? 1 : 0 },
        noDuplicateSideEffects: { source: 1, target: checks.noDuplicateSideEffects ? 1 : 0 },
      },
    },
  };

  await appendReconciliationReport({
    domain: "r4.7",
    command: "prove-job-retries",
    report,
    notes: [
      "R4.7 failure/retry: dead-letter → audited manual retry → single durable_job_effects row (no duplicate side effects).",
      ...unitSuites,
      "scripts/jobs/verify-local.ts",
    ],
  });

  console.log(JSON.stringify({ passed, checks }, null, 2));
  console.log("migration:prove-job-retries passed");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
  console.error("migration:prove-job-retries failed");
}
