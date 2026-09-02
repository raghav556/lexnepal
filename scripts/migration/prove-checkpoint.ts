/**
 * R3.3 proof: dry-run does not write rows; checkpoint enables --resume skip;
 * --force re-imports idempotently (legacyConvexId) with matching reconcile checks.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { attendance } from "../../src/server/db/schema";
import { STATE_FILE } from "./types";
import { appendReconciliationReport } from "./report-writer";
import type { DomainMigrationReport } from "./types";

const firmMap = path.resolve("tests/fixtures/convex-identity-firm-map.json");
const exportPath = path.resolve("tests/fixtures/convex-hr-export");
const orphan = "61000000-0000-4000-8000-000000000001";

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

async function attendanceCount() {
  const db = getDatabase();
  const [row] = await db.select({ n: sql<number>`cast(count(*) as signed)` }).from(attendance);
  return Number(row?.n ?? 0);
}

async function readCheckpoint(domain: string) {
  try {
    const state = JSON.parse(await fs.readFile(STATE_FILE, "utf8")) as Record<string, unknown>;
    return state[`checkpoint:${domain}`] as
      | {
          status: string;
          fingerprint: string;
          passed: boolean;
        }
      | undefined;
  } catch {
    return undefined;
  }
}

try {
  const base = [
    "--domain",
    "hr",
    "--export-path",
    exportPath,
    "--firm-map",
    firmMap,
    "--orphan-firm",
    orphan,
  ];

  // Ensure a clean known baseline import exists
  const forceImport = await runCli(["import-mysql", ...base, "--force"]);
  if (forceImport.code !== 0) throw new Error("baseline --force import failed");
  const afterForce = await attendanceCount();
  const checkpointImported = await readCheckpoint("hr");
  if (
    !checkpointImported ||
    checkpointImported.status !== "imported" ||
    !checkpointImported.passed
  ) {
    throw new Error(`expected imported checkpoint, got ${JSON.stringify(checkpointImported)}`);
  }

  // Dry-run must not change row counts
  const beforeDry = afterForce;
  const dry = await runCli(["import-mysql", ...base, "--dry-run"]);
  if (dry.code !== 0) throw new Error("dry-run failed");
  const afterDry = await attendanceCount();
  if (afterDry !== beforeDry) {
    throw new Error(`dry-run mutated attendance count ${beforeDry} → ${afterDry}`);
  }
  const checkpointDry = await readCheckpoint("hr");
  if (!checkpointDry || checkpointDry.status !== "dry-run") {
    throw new Error(`expected dry-run checkpoint status, got ${JSON.stringify(checkpointDry)}`);
  }

  // Re-import for a real imported checkpoint (dry-run overwrote status)
  const reimport = await runCli(["import-mysql", ...base, "--force"]);
  if (reimport.code !== 0) throw new Error("re-import after dry-run failed");
  const beforeResume = await attendanceCount();

  // --resume should skip and leave counts unchanged
  const resumed = await runCli(["import-mysql", ...base, "--resume"]);
  if (resumed.code !== 0) throw new Error("resume import failed");
  if (!resumed.stdout.includes("Resume: skipping")) {
    throw new Error("resume did not skip import");
  }
  const afterResume = await attendanceCount();
  if (afterResume !== beforeResume) {
    throw new Error(`resume mutated attendance count ${beforeResume} → ${afterResume}`);
  }
  const checkpointResume = await readCheckpoint("hr");
  if (!checkpointResume || checkpointResume.status !== "skipped-resume") {
    throw new Error(`expected skipped-resume checkpoint, got ${JSON.stringify(checkpointResume)}`);
  }

  // --force must re-run safely (idempotent)
  const forced = await runCli(["import-mysql", ...base, "--force"]);
  if (forced.code !== 0) throw new Error("force re-import failed");
  const afterForced = await attendanceCount();
  if (afterForced !== beforeResume) {
    throw new Error(
      `force re-import changed attendance count ${beforeResume} → ${afterForced} (not idempotent)`,
    );
  }

  const report: DomainMigrationReport = {
    source: { attendance: beforeResume },
    migrated: { attendance: afterForced },
    exceptions: [],
    reconciliation: {
      passed: true,
      checks: {
        dryRunNoWrite: { source: beforeDry, target: afterDry },
        resumeNoWrite: { source: beforeResume, target: afterResume },
        forceIdempotent: { source: beforeResume, target: afterForced },
      },
    },
  };
  await appendReconciliationReport({
    domain: "hr",
    command: "prove-checkpoint",
    report,
    notes: [
      "R3.3: dry-run does not write; --resume skips on fingerprint match; --force re-imports via legacyConvexId without duplicating rows.",
      "Service-backed domains use full-table idempotent importers (not mid-JSONL offsets). Engine processTable offsets remain for streaming adapters.",
    ],
  });

  // silence unused eq import if any
  void eq;

  console.log(
    JSON.stringify(
      {
        passed: true,
        dryRunNoWrite: afterDry === beforeDry,
        resumeSkipped: true,
        forceIdempotent: afterForced === beforeResume,
        fingerprint: checkpointImported.fingerprint,
      },
      null,
      2,
    ),
  );
  console.log("migration:prove-checkpoint passed");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
