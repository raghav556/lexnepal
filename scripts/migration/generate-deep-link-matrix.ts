/**
 * One-shot helper to generate ui-deep-link-matrix.csv from the route inventory.
 * Kept runnable; prove-url-preserve.ts is the gate that validates the matrix.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const invPath = path.join(root, "doc/migration/ui-route-inventory.csv");
const outPath = path.join(root, "doc/migration/ui-deep-link-matrix.csv");

const SAMPLE_BY_VITE: Record<string, string> = {
  "/lawyers/:id": "/lawyers/sample-lawyer",
  "/blog/:slug": "/blog/sample-post",
  "/staff/cases/:id": "/staff/cases/00000000-0000-4000-8000-000000000001",
  "/intake/:token": "/intake/sample-token",
  "/share/:token": "/share/sample-token",
};

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
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

const lines = fs.readFileSync(invPath, "utf8").trim().split(/\r?\n/).slice(1);
const rows = ["vitePath,nextPath,sampleUrl,kind,redirectFrom,proof"];

for (const line of lines) {
  const cols = parseCsvLine(line);
  const vitePath = cols[0]!;
  const nextPath = cols[3]!;
  let kind: "exact" | "dynamic" | "catch-all" = "exact";
  let sampleUrl = nextPath;

  if (vitePath === "*") {
    kind = "catch-all";
    sampleUrl = "/__url-preserve-unknown__";
  } else if (vitePath.includes(":") || nextPath.includes("[")) {
    kind = "dynamic";
    sampleUrl = SAMPLE_BY_VITE[vitePath] ?? nextPath.replace(/\[([^\]]+)\]/g, "sample");
  }

  const fields = [vitePath, nextPath, sampleUrl, kind, "", "same-path"];
  rows.push(fields.map((v) => `"${v.replace(/"/g, '""')}"`).join(","));
}

fs.writeFileSync(outPath, rows.join("\n") + "\n", "utf8");
console.log(`Wrote ${rows.length - 1} rows to ${outPath}`);
