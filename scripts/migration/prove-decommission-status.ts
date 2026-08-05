/**
 * R8 status proof: decommission checklist present; safe waves recorded;
 * Convex residual expected until R8.A authorized (non-zero residual is OK).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { appendReconciliationReport } from "./report-writer";
import type { DomainMigrationReport } from "./types";
import { DOC_MIGRATION_DIR } from "./types";

const CHECKLIST = path.join(DOC_MIGRATION_DIR, "decommission-checklist.md");
const CSV = path.join(DOC_MIGRATION_DIR, "decommission-checklist.csv");
const ROOT = process.cwd();

const REQUIRED_COMPLETE = ["A8", "C5", "C6", "C11", "C12"] as const;
const BLOCKED_MUST_NOT_BE_COMPLETE = ["A3", "A4", "A5", "A6", "C1", "C2", "C8"] as const;

const RESIDUAL_RE =
  /convex\/react|useConvexAuth|convex\/_generated|VITE_CONVEX|CONVEX_DEPLOYMENT|convex-bridge|convex-mock/;

const SKIP_DIR = new Set([
  "node_modules",
  ".next",
  "dist",
  "coverage",
  ".git",
  "exports",
  "tmp",
  "test-results",
  "playwright-report",
]);

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      q = !q;
      continue;
    }
    if (c === "," && !q) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

async function walkFiles(dir: string, acc: string[] = []): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (SKIP_DIR.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(full, acc);
      continue;
    }
    if (!/\.(ts|tsx|mjs|json)$/.test(entry.name)) continue;
    // Skip huge migration report dumps and this checklist itself
    const rel = path.relative(ROOT, full).replace(/\\/g, "/");
    if (rel.startsWith("doc/migration/reconciliation")) continue;
    if (rel.includes("decommission-checklist")) continue;
    acc.push(full);
  }
  return acc;
}

async function findResidualFiles(): Promise<string[]> {
  const roots = [
    path.join(ROOT, "src"),
    path.join(ROOT, "scripts"),
    path.join(ROOT, "tests"),
    path.join(ROOT, "convex"),
  ];
  const singles = [
    path.join(ROOT, "package.json"),
    path.join(ROOT, "next.config.ts"),
    path.join(ROOT, "vite.config.ts"),
    path.join(ROOT, "eslint.config.mjs"),
  ];
  const files: string[] = [];
  for (const dir of roots) {
    await walkFiles(dir, files);
  }
  for (const file of singles) {
    try {
      await fs.access(file);
      files.push(file);
    } catch {
      /* optional */
    }
  }
  const hits: string[] = [];
  for (const file of files) {
    const text = await fs.readFile(file, "utf8").catch(() => "");
    if (RESIDUAL_RE.test(text)) {
      hits.push(path.relative(ROOT, file).replace(/\\/g, "/"));
    }
  }
  return [...new Set(hits)].sort();
}

async function legacyCommunicationRoutesExist(): Promise<boolean> {
  const base = path.join(ROOT, "src/app/api/communication");
  const files = await walkFiles(base).catch(() => [] as string[]);
  return files.some((f) => f.endsWith(`${path.sep}route.ts`) || f.endsWith("/route.ts"));
}

try {
  await fs.access(CHECKLIST);
  await fs.access(CSV);

  if (await legacyCommunicationRoutesExist()) {
    throw new Error("C12 incomplete: legacy src/app/api/communication/**/route.ts still present");
  }

  const text = await fs.readFile(CSV, "utf8");
  const rows = text
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map(parseCsvLine);
  const byWave = new Map(rows.map((r) => [r[0], r]));

  for (const wave of REQUIRED_COMPLETE) {
    const status = byWave.get(wave)?.[2] ?? "";
    if (!/complete_local/i.test(status)) {
      throw new Error(`${wave} expected complete_local, got ${status || "(missing)"}`);
    }
  }

  for (const wave of BLOCKED_MUST_NOT_BE_COMPLETE) {
    const status = byWave.get(wave)?.[2] ?? "";
    if (/^complete(_local)?$/i.test(status)) {
      throw new Error(
        `${wave} marked complete while Convex rollback still required — keep DEFER until R8.A authorized`,
      );
    }
  }

  const residualFiles = await findResidualFiles();

  const report: DomainMigrationReport = {
    source: { waves: rows.length, residualFiles: residualFiles.length },
    migrated: {
      safeComplete: REQUIRED_COMPLETE.length,
      residualFiles: residualFiles.length,
    },
    exceptions: [],
    reconciliation: {
      passed: true,
      checks: Object.fromEntries(REQUIRED_COMPLETE.map((w) => [w, { source: 1, target: 1 }])),
    },
  };

  await appendReconciliationReport({
    domain: "r8",
    command: "prove-decommission-status",
    report,
    notes: [
      "R8 partial_local: checklist present; safe waves C5/C6/C11/C12/A8 complete_local.",
      "Full Convex decommission (A3–A6, C1–C4, C8–C10) remains DEFER until rollback window.",
      `convexResidualFiles=${residualFiles.length}`,
      ...residualFiles.slice(0, 25).map((f) => `residual=${f}`),
    ],
  });

  console.log(
    JSON.stringify(
      {
        passed: true,
        r8: {
          status: "partial_local",
          convexDecommissionComplete: false,
          residualAllowed: residualFiles.length > 0,
          residualFileCount: residualFiles.length,
          safeWavesComplete: [...REQUIRED_COMPLETE],
          blockedWaves: [...BLOCKED_MUST_NOT_BE_COMPLETE],
        },
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
