import fs from "node:fs/promises";
import type { ReconcileException } from "./reconcile";
import { APPROVED_EXCEPTIONS_CSV, DOC_MIGRATION_DIR } from "./types";

export { APPROVED_EXCEPTIONS_CSV };

export type ApprovedException = {
  domain: string;
  table: string;
  id: string;
  type: string;
  reasonContains?: string;
  approvedBy: string;
  approvedAt: string;
  note: string;
};

export function exceptionKey(ex: {
  domain: string;
  table: string;
  id?: string;
  type: string;
}): string {
  return `${ex.domain}|${ex.table}|${ex.id ?? ""}|${ex.type}`.toLowerCase();
}

export async function ensureApprovedExceptionsPlaceholder() {
  await fs.mkdir(DOC_MIGRATION_DIR, { recursive: true });
  try {
    await fs.access(APPROVED_EXCEPTIONS_CSV);
  } catch {
    await fs.writeFile(
      APPROVED_EXCEPTIONS_CSV,
      "domain,table,id,type,reasonContains,approvedBy,approvedAt,note\n",
      "utf8",
    );
  }
}

export async function loadApprovedExceptions(): Promise<ApprovedException[]> {
  await ensureApprovedExceptionsPlaceholder();
  const text = await fs.readFile(APPROVED_EXCEPTIONS_CSV, "utf8");
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length <= 1) return [];
  const rows: ApprovedException[] = [];
  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    if (cols.length < 4) continue;
    rows.push({
      domain: cols[0] ?? "",
      table: cols[1] ?? "",
      id: cols[2] ?? "",
      type: cols[3] ?? "",
      reasonContains: cols[4] || undefined,
      approvedBy: cols[5] ?? "",
      approvedAt: cols[6] ?? "",
      note: cols[7] ?? "",
    });
  }
  return rows;
}

export function partitionExceptions(
  exceptions: ReconcileException[],
  approved: ApprovedException[],
): {
  all: ReconcileException[];
  approved: ReconcileException[];
  unexplained: ReconcileException[];
} {
  const approvedMatches = exceptions.filter((ex) =>
    approved.some((row) => {
      if (row.domain.toLowerCase() !== ex.domain.toLowerCase()) return false;
      if (row.table.toLowerCase() !== ex.table.toLowerCase()) return false;
      if ((row.id || "").toLowerCase() !== (ex.id || "").toLowerCase()) return false;
      if (row.type && row.type.toLowerCase() !== ex.type.toLowerCase()) return false;
      if (
        row.reasonContains &&
        !ex.reason.toLowerCase().includes(row.reasonContains.toLowerCase())
      ) {
        return false;
      }
      return true;
    }),
  );
  const approvedKeys = new Set(approvedMatches.map((ex) => exceptionKey(ex)));
  const unexplained = exceptions.filter((ex) => !approvedKeys.has(exceptionKey(ex)));
  return { all: exceptions, approved: approvedMatches, unexplained };
}

/** Minimal CSV line parser for quoted fields. */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}
