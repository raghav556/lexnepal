/**
 * R5.5 proof: every Vite product URL has the same Next path (or a documented redirect).
 *
 * Offline gate: inventory + deep-link matrix + App.tsx coverage + src/app filesystem.
 * Optional HTTP: set NEXT_PROOF_BASE_URL=http://localhost:3001 to GET sample deep links.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { appendReconciliationReport } from "./report-writer";
import type { DomainMigrationReport } from "./types";

const ROOT = process.cwd();
const INVENTORY = path.join(ROOT, "doc/migration/ui-route-inventory.csv");
const MATRIX = path.join(ROOT, "doc/migration/ui-deep-link-matrix.csv");
const APP_TSX = path.join(ROOT, "src/App.tsx");
const NEXT_CONFIG = path.join(ROOT, "next.config.ts");

type InventoryRow = {
  vitePath: string;
  nextPath: string;
  nextFile: string;
  status: string;
};

type MatrixRow = {
  vitePath: string;
  nextPath: string;
  sampleUrl: string;
  kind: string;
  redirectFrom: string;
  proof: string;
};

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

async function readCsv(file: string): Promise<string[][]> {
  const text = await fs.readFile(file, "utf8");
  return text
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map(parseCsvLine);
}

function normalizePathPattern(p: string): string {
  if (p === "*") return "*";
  return p
    .replace(/:([A-Za-z0-9_]+)/g, "[$1]")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "") || "/";
}

/** Expand React Router nested paths in App.tsx into absolute inventory-style paths. */
function extractAppRoutes(source: string): string[] {
  const paths = new Set<string>();
  const stack: string[] = [];
  const lines = source.split(/\r?\n/);

  function isSelfClosingRoute(line: string): boolean {
    // Ignore `/>` inside element={...} JSX (e.g. element={<Layout />})
    const stripped = line.replace(/\{[\s\S]*?\}/g, "{}");
    return /<Route\b[^>]*\/>/.test(stripped);
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("</Route>")) {
      stack.pop();
      continue;
    }
    if (!line.includes("<Route")) continue;

    const pathMatch = line.match(/\bpath=["']([^"']+)["']/);
    const isIndex = /\bindex\b/.test(line);

    if (isIndex) {
      const parent = stack[stack.length - 1] || "/";
      paths.add(parent);
      continue;
    }
    if (!pathMatch) continue;

    const seg = pathMatch[1]!;
    if (seg === "*") {
      paths.add("*");
      continue;
    }

    let full: string;
    if (seg.startsWith("/")) {
      full = seg;
    } else {
      const parent = stack[stack.length - 1] || "";
      full = `${parent.replace(/\/$/, "")}/${seg}`.replace(/\/+/g, "/");
      if (!full.startsWith("/")) full = `/${full}`;
    }
    paths.add(full);

    if (!isSelfClosingRoute(line)) {
      stack.push(full);
    }
  }

  return [...paths].sort();
}

async function pathExists(rel: string): Promise<boolean> {
  try {
    await fs.access(path.join(ROOT, rel));
    return true;
  } catch {
    return false;
  }
}

async function optionalHttpSmoke(sampleUrls: string[]): Promise<{
  ran: boolean;
  failures: string[];
}> {
  const base = process.env.NEXT_PROOF_BASE_URL?.replace(/\/$/, "");
  if (!base) return { ran: false, failures: [] };

  const failures: string[] = [];
  for (const sample of sampleUrls) {
    if (sample === "/__url-preserve-unknown__") continue;
    const url = `${base}${sample}`;
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status === 404) {
        failures.push(`${sample} → HTTP ${res.status}`);
      }
    } catch (err) {
      failures.push(`${sample} → ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { ran: true, failures };
}

async function main() {
  const errors: string[] = [];

  const invRows = (await readCsv(INVENTORY)).slice(1);
  const inventory: InventoryRow[] = invRows.map((cols) => ({
    vitePath: cols[0]!,
    nextPath: cols[3]!,
    nextFile: cols[4]!,
    status: cols[5]!,
  }));

  const matrixRows = (await readCsv(MATRIX)).slice(1);
  const matrix: MatrixRow[] = matrixRows.map((cols) => ({
    vitePath: cols[0]!,
    nextPath: cols[1]!,
    sampleUrl: cols[2]!,
    kind: cols[3]!,
    redirectFrom: cols[4] || "",
    proof: cols[5] || "",
  }));

  if (inventory.length !== 68) {
    errors.push(`Inventory expected 68 rows, got ${inventory.length}`);
  }
  if (matrix.length !== inventory.length) {
    errors.push(`Matrix rows (${matrix.length}) != inventory rows (${inventory.length})`);
  }

  const invByVite = new Map(inventory.map((r) => [r.vitePath, r]));
  const matrixByVite = new Map(matrix.map((r) => [r.vitePath, r]));

  for (const row of inventory) {
    if (row.status !== "exists") {
      errors.push(`${row.vitePath}: status=${row.status}, expected exists`);
    }
    if (!row.nextFile) {
      errors.push(`${row.vitePath}: missing nextFile`);
    } else if (!(await pathExists(row.nextFile))) {
      errors.push(`${row.vitePath}: missing file ${row.nextFile}`);
    }

    const normVite = normalizePathPattern(row.vitePath);
    const normNext = normalizePathPattern(row.nextPath);
    if (row.vitePath !== "*" && normVite !== normNext) {
      errors.push(`${row.vitePath}: path mismatch vite=${normVite} next=${normNext}`);
    }

    const m = matrixByVite.get(row.vitePath);
    if (!m) {
      errors.push(`${row.vitePath}: missing from deep-link matrix`);
      continue;
    }
    if (m.nextPath !== row.nextPath) {
      errors.push(`${row.vitePath}: matrix nextPath mismatch`);
    }
    if (!m.sampleUrl) {
      errors.push(`${row.vitePath}: matrix sampleUrl empty`);
    }
    if (!["exact", "dynamic", "catch-all"].includes(m.kind)) {
      errors.push(`${row.vitePath}: invalid kind ${m.kind}`);
    }
  }

  for (const m of matrix) {
    if (!invByVite.has(m.vitePath)) {
      errors.push(`Matrix orphan vitePath ${m.vitePath}`);
    }
  }

  const redirects = matrix.filter((m) => m.redirectFrom.trim().length > 0);
  const nextConfigText = await fs.readFile(NEXT_CONFIG, "utf8");
  const hasRedirectsFn = /async\s+redirects\s*\(/.test(nextConfigText);
  if (redirects.length === 0 && hasRedirectsFn) {
    // Allowed but unused — not an error
  }
  if (redirects.length > 0 && !hasRedirectsFn) {
    errors.push(
      `Matrix declares ${redirects.length} redirect(s) but next.config.ts has no redirects()`,
    );
  }
  for (const r of redirects) {
    if (!r.redirectFrom.startsWith("/")) {
      errors.push(`Invalid redirectFrom ${r.redirectFrom}`);
    }
  }

  const appSource = await fs.readFile(APP_TSX, "utf8");
  const appRoutes = extractAppRoutes(appSource);
  const invPaths = new Set(inventory.map((r) => r.vitePath));

  for (const route of appRoutes) {
    if (!invPaths.has(route)) {
      errors.push(`App.tsx route not in inventory: ${route}`);
    }
  }
  for (const row of inventory) {
    if (!appRoutes.includes(row.vitePath)) {
      errors.push(`Inventory path missing from App.tsx: ${row.vitePath}`);
    }
  }

  const http = await optionalHttpSmoke(matrix.map((m) => m.sampleUrl));
  if (http.ran && http.failures.length > 0) {
    for (const f of http.failures) errors.push(`HTTP smoke: ${f}`);
  }

  const passed = errors.length === 0;
  const report: DomainMigrationReport = {
    source: { inventoryRoutes: inventory.length, matrixRoutes: matrix.length, appRoutes: appRoutes.length },
    migrated: {
      inventoryRoutes: passed ? inventory.length : 0,
      matrixRoutes: passed ? matrix.length : 0,
      appRoutes: passed ? appRoutes.length : 0,
    },
    exceptions: errors.map((reason, i) => ({
      table: "url-preserve",
      id: String(i),
      reason,
    })),
    reconciliation: {
      passed,
      checks: {
        inventoryCount: { source: 68, target: inventory.length },
        matrixCount: { source: inventory.length, target: matrix.length },
        appCoverage: { source: inventory.length, target: appRoutes.length },
        redirects: { source: redirects.length, target: redirects.length },
        httpSmoke: {
          source: http.ran ? 1 : 0,
          target: http.ran && http.failures.length === 0 ? 1 : http.ran ? 0 : 0,
        },
      },
    },
  };

  await appendReconciliationReport({
    domain: "r5.5",
    command: "prove-url-preserve",
    report,
    notes: [
      "R5.5/R5.6 URL preserve: inventory ↔ matrix ↔ App.tsx ↔ src/app files; same-path default; redirects only if matrix.redirectFrom set.",
      `redirectCount=${redirects.length}`,
      `httpSmoke=${http.ran ? (http.failures.length === 0 ? "passed" : "failed") : "skipped"}`,
      ...(http.ran ? [`NEXT_PROOF_BASE_URL=${process.env.NEXT_PROOF_BASE_URL}`] : []),
      ...errors.slice(0, 20),
    ],
  });

  console.log(
    JSON.stringify(
      {
        r55: {
          passed,
          inventoryRoutes: inventory.length,
          matrixRoutes: matrix.length,
          appRoutes: appRoutes.length,
          redirectCount: redirects.length,
          httpSmoke: http.ran ? (http.failures.length === 0 ? "passed" : "failed") : "skipped",
          errors,
        },
      },
      null,
      2,
    ),
  );

  if (!passed) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
