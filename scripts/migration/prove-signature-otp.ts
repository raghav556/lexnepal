/**
 * R4.6 proof: signature/OTP path — issue, verify, decline, void, expire.
 */
import { spawn } from "node:child_process";
import { appendReconciliationReport } from "./report-writer";
import type { DomainMigrationReport } from "./types";

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
    "tests/unit/envelopes-contracts.test.ts",
  ]);
  if (unit.code !== 0) throw new Error("R4.6 envelope contract tests failed");

  // Identity fixture is a prerequisite for envelope create/send/OTP.
  const identity = await run(process.execPath, [
    "--env-file-if-exists=.env.local",
    "--conditions=react-server",
    "--import",
    "tsx",
    "scripts/migration/migrate-identity-export.ts",
    "tests/fixtures/convex-identity-export",
    "tests/fixtures/convex-identity-firm-map.json",
  ]);
  if (identity.code !== 0) throw new Error("R4.6 identity migrate prerequisite failed");

  const verify = await run(process.execPath, [
    "--env-file-if-exists=.env.local",
    "--conditions=react-server",
    "--import",
    "tsx",
    "scripts/envelopes/verify-local.ts",
  ]);
  if (verify.code !== 0) throw new Error("R4.6 envelopes verify-local failed");

  const jsonLine = verify.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("{") && line.includes('"r46"'))
    .at(-1);
  if (!jsonLine) throw new Error("Envelope verify did not emit R4.6 evidence JSON");

  const payload = JSON.parse(jsonLine) as {
    r46: {
      issue: boolean;
      verify: boolean;
      verifyRejectsBadCode: boolean;
      decline: boolean;
      void: boolean;
      expire: boolean;
      sign: boolean;
    };
  };
  const checks = payload.r46;
  const passed =
    checks.issue &&
    checks.verify &&
    checks.verifyRejectsBadCode &&
    checks.decline &&
    checks.void &&
    checks.expire;

  if (!passed) {
    throw new Error(`R4.6 evidence incomplete: ${JSON.stringify(checks)}`);
  }

  const report: DomainMigrationReport = {
    source: { issue: 1, verify: 1, decline: 1, void: 1, expire: 1 },
    migrated: {
      issue: checks.issue ? 1 : 0,
      verify: checks.verify ? 1 : 0,
      decline: checks.decline ? 1 : 0,
      void: checks.void ? 1 : 0,
      expire: checks.expire ? 1 : 0,
    },
    exceptions: [],
    reconciliation: {
      passed,
      checks: {
        issue: { source: 1, target: checks.issue ? 1 : 0 },
        verify: { source: 1, target: checks.verify ? 1 : 0 },
        decline: { source: 1, target: checks.decline ? 1 : 0 },
        void: { source: 1, target: checks.void ? 1 : 0 },
        expire: { source: 1, target: checks.expire ? 1 : 0 },
        badCodeRejected: { source: 1, target: checks.verifyRejectsBadCode ? 1 : 0 },
      },
    },
  };

  await appendReconciliationReport({
    domain: "r4.6",
    command: "prove-signature-otp",
    report,
    notes: [
      "R4.6 signature/OTP: issue, verify (rejects bad code), decline, void, expire (+ sign after verified OTP).",
      "tests/unit/envelopes-contracts.test.ts",
      "scripts/envelopes/verify-local.ts",
    ],
  });

  console.log(JSON.stringify({ passed, checks }, null, 2));
  console.log("migration:prove-signature-otp passed");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
  console.error("migration:prove-signature-otp failed");
}
