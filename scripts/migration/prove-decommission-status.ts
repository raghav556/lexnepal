/**
 * R8 proof: local Convex decommission complete under waiver.
 * Requires checklist CSV complete_local for A3–A8 / C1–C4 / C8;
 * zero runtime residual in src/ (archive under doc/ is allowed).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { appendReconciliationReport } from "./report-writer";
import type { DomainMigrationReport } from "./types";
import { DOC_MIGRATION_DIR } from "./types";

const CHECKLIST = path.join(DOC_MIGRATION_DIR, "decommission-checklist.md");
const CSV = path.join(DOC_MIGRATION_DIR, "decommission-checklist.csv");
const ARCHIVE_ZIP = path.join(
  DOC_MIGRATION_DIR,
  "archive",
  "convex-decommission",
  "convex-source.zip",
);
const ROOT = process.cwd();

const REQUIRED_COMPLETE = [
  "A1",
  "A3",
  "A4",
  "A5",
  "A6",
  "A7",
  "A8",
  "C1",
  "C2",
  "C3",
  "C4",
  "C5",
  "C8",
  "C9",
  "C11",
  "C12",
] as const;

const RESIDUAL_RE =
  /from\s+["']convex\/|useConvexAuth|convex\/_generated|VITE_CONVEX|CONVEX_DEPLOYMENT|convex-bridge|convex-mock/;

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
  "archive",
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
    if (!/\.(ts|tsx|mjs|js)$/.test(entry.name)) continue;
    const rel = path.relative(ROOT, full).replace(/\\/g, "/");
    if (rel.startsWith("doc/migration/reconciliation")) continue;
    if (rel.includes("decommission-checklist")) continue;
    if (rel.includes("archive/convex-decommission")) continue;
    acc.push(full);
  }
  return acc;
}

async function findResidualFiles(): Promise<string[]> {
  const roots = [path.join(ROOT, "src"), path.join(ROOT, "tests")];
  const singles = [
    path.join(ROOT, "package.json"),
    path.join(ROOT, "next.config.ts"),
    path.join(ROOT, "vite.config.ts"),
  ];
  const files: string[] = [];
  for (const dir of roots) await walkFiles(dir, files);
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

try {
  await fs.access(CHECKLIST);
  await fs.access(CSV);
  await fs.access(ARCHIVE_ZIP);

  const convexDir = path.join(ROOT, "convex");
  const convexExists = await fs.access(convexDir).then(
    () => true,
    () => false,
  );
  if (convexExists) throw new Error("convex/ directory still present — A5 incomplete");

  const pkg = JSON.parse(await fs.readFile(path.join(ROOT, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  if (pkg.dependencies?.convex || pkg.devDependencies?.convex) {
    throw new Error("package.json still lists convex dependency — A6/C8 incomplete");
  }

  const text = await fs.readFile(CSV, "utf8");
  const rows = text.trim().split(/\r?\n/).slice(1).filter(Boolean).map(parseCsvLine);
  const byWave = new Map(rows.map((r) => [r[0], r]));

  for (const wave of REQUIRED_COMPLETE) {
    const status = byWave.get(wave)?.[2] ?? "";
    if (!/complete_local/i.test(status)) {
      throw new Error(`${wave} expected complete_local, got ${status || "(missing)"}`);
    }
  }

  const residualFiles = await findResidualFiles();
  if (residualFiles.length) {
    throw new Error(`Runtime Convex residual still present:\n${residualFiles.join("\n")}`);
  }

  const report: DomainMigrationReport = {
    source: { waves: rows.length, residualFiles: 0 },
    migrated: { safeComplete: REQUIRED_COMPLETE.length, residualFiles: 0 },
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
      "R8 complete_local under local-only waiver — Convex runtime removed; archive retained.",
      "R7 production readiness remains DEFER_PROD.",
      `archive=${path.relative(ROOT, ARCHIVE_ZIP).replace(/\\/g, "/")}`,
      `requiredComplete=${REQUIRED_COMPLETE.join(",")}`,
    ],
  });

  console.log(
    JSON.stringify(
      {
        passed: true,
        r8: {
          status: "complete_local",
          convexDecommissionComplete: true,
          residualFileCount: 0,
          archivePresent: true,
          productionReady: false,
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
