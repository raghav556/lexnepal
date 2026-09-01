/**
 * Local production-shaped verify harness.
 *
 * Usage:
 *   npm run verify:local-production-shaped
 *   npm run verify:local-production-shaped -- --full
 *   npm run verify:local-production-shaped -- --quick
 *
 * Collects all results, writes `.migration-reports/local-production-shaped.json`, exits 1 if any failed.
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const full = process.argv.includes("--full");
const quick = process.argv.includes("--quick");

const CORE = [
  { id: "storage-local", npmScript: "storage:verify-local", group: "infra" },
  { id: "storage-pipeline", npmScript: "storage:verify-pipeline", group: "infra" },
  { id: "jobs-local", npmScript: "jobs:verify-local", group: "infra" },
  { id: "auth-boundary", npmScript: "auth:verify-boundary", group: "auth" },
  { id: "auth-baseline", npmScript: "verify:auth-baseline", group: "auth" },
  { id: "auth-production", npmScript: "verify:auth-production", group: "auth" },
  { id: "cms", npmScript: "cms:verify-local", group: "domains" },
  { id: "matters", npmScript: "matters:verify-local", group: "domains" },
  { id: "analytics", npmScript: "analytics:verify-local", group: "domains" },
  {
    id: "decommission",
    npmScript: "migration:prove-decommission-status",
    group: "migration",
  },
  {
    id: "production-readiness-plan",
    npmScript: "migration:prove-production-readiness-plan",
    group: "migration",
  },
];

const STANDARD = [
  ...CORE,
  { id: "hr", npmScript: "hr:verify-local", group: "domains" },
  { id: "envelopes", npmScript: "envelopes:verify-local", group: "domains" },
  { id: "crm", npmScript: "crm:verify-local", group: "domains" },
  { id: "cutover-rehearsal", npmScript: "migration:prove-cutover-rehearsal", group: "migration" },
];

const FULL = [
  ...STANDARD,
  { id: "communication", npmScript: "communication:verify-local", group: "domains" },
  { id: "documents", npmScript: "documents:verify-local", group: "domains" },
  { id: "work-management", npmScript: "work-management:verify-local", group: "domains" },
  { id: "prove-cross-firm", npmScript: "migration:prove-cross-firm", group: "migration" },
  { id: "prove-job-retries", npmScript: "migration:prove-job-retries", group: "migration" },
  { id: "prove-url-preserve", npmScript: "migration:prove-url-preserve", group: "migration" },
];

const steps = quick ? CORE : full ? FULL : STANDARD;

function runNpm(script) {
  const started = Date.now();
  return new Promise((resolve) => {
    const npmCli = process.env.npm_execpath;
    if (!npmCli) {
      throw new Error("npm_execpath is unavailable; run this harness through npm");
    }
    const child = spawn(process.execPath, [npmCli, "run", script], {
      cwd: root,
      env: process.env,
    });
    let out = "";
    child.stdout?.on("data", (chunk) => {
      const text = String(chunk);
      out += text;
      process.stdout.write(text);
    });
    child.stderr?.on("data", (chunk) => {
      const text = String(chunk);
      out += text;
      process.stderr.write(text);
    });
    child.on("close", (code) => {
      const tail = out.trim().split(/\r?\n/).slice(-8).join("\n");
      resolve({ code: code ?? 1, ms: Date.now() - started, tail });
    });
  });
}

async function main() {
  const results = [];

  console.log(
    `\n=== verify:local-production-shaped (${quick ? "quick" : full ? "full" : "standard"}) — ${steps.length} steps ===\n`,
  );

  for (const step of steps) {
    console.log(`\n--- [${step.group}] npm run ${step.npmScript} ---\n`);
    const { code, ms, tail } = await runNpm(step.npmScript);
    results.push({
      id: step.id,
      group: step.group,
      npmScript: step.npmScript,
      ok: code === 0,
      code,
      ms,
      tail,
    });
    console.log(`\n<<< ${step.id}: ${code === 0 ? "PASS" : "FAIL"} (${ms}ms, exit ${code}) >>>\n`);
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  const report = {
    ranAt: new Date().toISOString(),
    mode: quick ? "quick" : full ? "full" : "standard",
    passed: failed.length === 0,
    summary: { total: results.length, passed, failed: failed.length },
    cloudFence: {
      note: "R7 remains DEFER_PROD — this harness never sets productionReady true",
    },
    results,
  };

  const outDir = join(root, ".migration-reports");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "local-production-shaped.json");
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`\n=== Summary: ${passed}/${results.length} passed ===`);
  if (failed.length) {
    console.log("Failed:");
    for (const f of failed) console.log(`  - ${f.id} (${f.npmScript}) exit ${f.code}`);
  }
  console.log(`Report: ${outPath}\n`);
  process.stdout.write(
    `${JSON.stringify({ passed: report.passed, ...report.summary, mode: report.mode })}\n`,
  );
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
