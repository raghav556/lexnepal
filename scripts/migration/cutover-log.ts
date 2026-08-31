/**
 * Append / read R6 cutover dress-rehearsal log rows.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { DOC_MIGRATION_DIR } from "./types";

export const CUTOVER_LOG_CSV = path.join(DOC_MIGRATION_DIR, "cutover-log.csv");

export type CutoverLogRow = {
  domain: string;
  environment: string;
  rehearsalId: string;
  startedAt: string;
  finishedAt: string;
  backupOk: string;
  writeFreezeOk: string;
  deltaImportOk: string;
  reconcileOk: string;
  flagNextOk: string;
  rollbackPracticeOk: string;
  localSoak: string;
  result: "passed" | "failed";
  notes: string;
};

const HEADER =
  "domain,environment,rehearsalId,startedAt,finishedAt,backupOk,writeFreezeOk,deltaImportOk,reconcileOk,flagNextOk,rollbackPracticeOk,localSoak,result,notes";

function csv(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function appendCutoverLog(row: CutoverLogRow): Promise<void> {
  await fs.mkdir(DOC_MIGRATION_DIR, { recursive: true });
  const exists = await fs
    .access(CUTOVER_LOG_CSV)
    .then(() => true)
    .catch(() => false);
  const line = [
    row.domain,
    row.environment,
    row.rehearsalId,
    row.startedAt,
    row.finishedAt,
    row.backupOk,
    row.writeFreezeOk,
    row.deltaImportOk,
    row.reconcileOk,
    row.flagNextOk,
    row.rollbackPracticeOk,
    row.localSoak,
    row.result,
    row.notes,
  ]
    .map(csv)
    .join(",");
  if (!exists) {
    await fs.writeFile(CUTOVER_LOG_CSV, `${HEADER}\n${line}\n`, "utf8");
  } else {
    await fs.appendFile(CUTOVER_LOG_CSV, `${line}\n`, "utf8");
  }
}

/** Latest result per domain from the cutover log (last row wins). */
export async function latestCutoverResults(): Promise<Map<string, CutoverLogRow>> {
  const map = new Map<string, CutoverLogRow>();
  try {
    const text = await fs.readFile(CUTOVER_LOG_CSV, "utf8");
    const lines = text.trim().split(/\r?\n/).filter(Boolean).slice(1);
    for (const line of lines) {
      const cols = parseCsvLine(line);
      if (cols.length < 14) continue;
      map.set(cols[0]!, {
        domain: cols[0]!,
        environment: cols[1]!,
        rehearsalId: cols[2]!,
        startedAt: cols[3]!,
        finishedAt: cols[4]!,
        backupOk: cols[5]!,
        writeFreezeOk: cols[6]!,
        deltaImportOk: cols[7]!,
        reconcileOk: cols[8]!,
        flagNextOk: cols[9]!,
        rollbackPracticeOk: cols[10]!,
        localSoak: cols[11]!,
        result: cols[12] === "passed" ? "passed" : "failed",
        notes: cols[13] ?? "",
      });
    }
  } catch {
    /* no log yet */
  }
  return map;
}

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
