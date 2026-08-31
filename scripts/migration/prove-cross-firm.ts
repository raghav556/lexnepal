/**
 * R4.3 proof: cross-firm attack tests — no firm can see another firm’s data.
 * Runs authorization + domain attack unit/integration suites and records evidence.
 */
import { spawn } from "node:child_process";
import { appendReconciliationReport } from "./report-writer";
import type { DomainMigrationReport } from "./types";

const suites = [
  "tests/unit/authorization.test.ts",
  "tests/unit/cross-firm-attack.test.ts",
  "tests/integration/cross-firm-security.test.ts",
] as const;

function runVitest(files: readonly string[]): Promise<{ code: number; stdout: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["./node_modules/vitest/vitest.mjs", "run", ...files], {
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
  const { code, stdout } = await runVitest(suites);
  const passed = code === 0;
  const testsMatch = stdout.match(/Tests\s+(\d+)\s+passed/);
  const filesMatch = stdout.match(/Test Files\s+(\d+)\s+passed/);
  const testsPassed = testsMatch ? Number(testsMatch[1]) : 0;
  const filesPassed = filesMatch ? Number(filesMatch[1]) : 0;

  const report: DomainMigrationReport = {
    source: { crossFirmSuites: suites.length },
    migrated: { crossFirmSuites: passed ? suites.length : 0 },
    exceptions: passed ? [] : [{ table: "cross-firm", id: "vitest", reason: `exit code ${code}` }],
    reconciliation: {
      passed,
      checks: {
        authorization: { source: 1, target: passed ? 1 : 0 },
        crossFirmAttack: { source: 1, target: passed ? 1 : 0 },
        crossFirmSecurity: { source: 1, target: passed ? 1 : 0 },
      },
    },
  };

  await appendReconciliationReport({
    domain: "r4.3",
    command: "prove-cross-firm",
    report,
    notes: [
      "R4.3 cross-firm attack tests: spoofed firm context, requireSameFirm, assertResourceInFirm NOT_FOUND probes.",
      `filesPassed=${filesPassed} testsPassed=${testsPassed} exitCode=${code}`,
      ...suites,
    ],
  });

  console.log(
    JSON.stringify(
      {
        passed,
        filesPassed,
        testsPassed,
        suites: [...suites],
      },
      null,
      2,
    ),
  );

  if (!passed) {
    process.exitCode = 1;
    console.error("migration:prove-cross-firm failed");
  } else {
    console.log("migration:prove-cross-firm passed");
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
