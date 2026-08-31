/**
 * R4.8 proof: performance smoke — list/search usable at representative local volume.
 */
import { spawn } from "node:child_process";
import { appendReconciliationReport } from "./report-writer";
import type { DomainMigrationReport } from "./types";
import {
  PERFORMANCE_SMOKE_BUDGETS_MS,
  PERFORMANCE_SMOKE_VOLUME,
  performanceSmokeResultSchema,
} from "../../src/shared/contracts/performance";

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
    "tests/unit/performance-contracts.test.ts",
  ]);
  if (unit.code !== 0) throw new Error("R4.8 performance contract tests failed");

  const smoke = await run(process.execPath, [
    "--env-file-if-exists=.env.local",
    "--conditions=react-server",
    "--import",
    "tsx",
    "scripts/performance/smoke-local.ts",
  ]);
  if (smoke.code !== 0) throw new Error("R4.8 performance smoke-local failed");

  const jsonLine = smoke.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("{") && line.includes('"r48"'))
    .at(-1);
  if (!jsonLine) throw new Error("Performance smoke did not emit R4.8 evidence JSON");

  const payload = JSON.parse(jsonLine) as {
    r48: {
      passed: boolean;
      volume: typeof PERFORMANCE_SMOKE_VOLUME;
      results: unknown[];
    };
  };
  const results = payload.r48.results.map((row) => performanceSmokeResultSchema.parse(row));
  const passed = payload.r48.passed && results.every((row) => row.passed);
  if (!passed) {
    throw new Error(`R4.8 evidence incomplete: ${JSON.stringify(results)}`);
  }

  const report: DomainMigrationReport = {
    source: { ...PERFORMANCE_SMOKE_VOLUME },
    migrated: { ...payload.r48.volume },
    exceptions: [],
    reconciliation: {
      passed,
      checks: Object.fromEntries(
        results.map((row) => [row.name, { source: row.budgetMs, target: Math.round(row.ms) }]),
      ),
    },
  };

  await appendReconciliationReport({
    domain: "r4.8",
    command: "prove-performance-smoke",
    report,
    notes: [
      "R4.8 performance smoke: representative local volume; list/search Route Handlers under budget.",
      `volume=${JSON.stringify(PERFORMANCE_SMOKE_VOLUME)}`,
      `budgetsMs=${JSON.stringify(PERFORMANCE_SMOKE_BUDGETS_MS)}`,
      ...results.map((row) => `${row.name}=${row.ms}ms/${row.budgetMs}ms`),
    ],
  });

  console.log(
    JSON.stringify(
      {
        passed,
        volume: payload.r48.volume,
        results: results.map((row) => ({
          name: row.name,
          ms: row.ms,
          budgetMs: row.budgetMs,
          passed: row.passed,
          rows: row.rows,
        })),
      },
      null,
      2,
    ),
  );
  console.log("migration:prove-performance-smoke passed");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
  console.error("migration:prove-performance-smoke failed");
}
