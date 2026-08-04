import fs from "node:fs/promises";
import { appendExceptionsCsv } from "./report-writer";
import {
  ensureApprovedExceptionsPlaceholder,
  loadApprovedExceptions,
  partitionExceptions,
} from "./exceptions-ledger";

export interface ReconcileException {
  domain: string;
  table: string;
  id?: string;
  type:
    | "MISSING_ID"
    | "EXTRA_ID"
    | "ROW_COUNT_MISMATCH"
    | "FK_VIOLATION"
    | "FIRM_MISSING"
    | "NULLABILITY_VIOLATION"
    | "UNIQUE_VIOLATION"
    | "FINANCIAL_MISMATCH"
    | "OTHER";
  reason: string;
  sourceValue?: unknown;
  targetValue?: unknown;
}

export class Reconciler {
  private exceptions: ReconcileException[] = [];
  public domain: string;

  constructor(domain: string) {
    this.domain = domain;
  }

  addException(exception: Omit<ReconcileException, "domain">) {
    this.exceptions.push({
      ...exception,
      domain: this.domain,
    });
  }

  getExceptions() {
    return this.exceptions;
  }

  /**
   * Always append every exception to data-exceptions.csv (never silently drop).
   * Returns partition against approved-exceptions.csv for exit-gate decisions.
   */
  async writeExceptions(): Promise<{
    written: number;
    approved: number;
    unexplained: number;
  }> {
    await ensureApprovedExceptionsPlaceholder();
    // Raw ledger: every exception is recorded, including ones later marked approved.
    await appendExceptionsCsv(this.exceptions);
    const approvedRows = await loadApprovedExceptions();
    const partitioned = partitionExceptions(this.exceptions, approvedRows);
    return {
      written: this.exceptions.length,
      approved: partitioned.approved.length,
      unexplained: partitioned.unexplained.length,
    };
  }

  checkRowCount(table: string, sourceCount: number, targetCount: number) {
    if (sourceCount !== targetCount) {
      this.addException({
        table,
        type: "ROW_COUNT_MISMATCH",
        reason: "Source and target row counts do not match",
        sourceValue: sourceCount,
        targetValue: targetCount,
      });
    }
  }
}

/** Ensure the exceptions CSV exists (header only) for operators. */
export async function ensureExceptionsCsvPlaceholder() {
  const { EXCEPTIONS_CSV, DOC_MIGRATION_DIR } = await import("./types");
  await fs.mkdir(DOC_MIGRATION_DIR, { recursive: true });
  try {
    await fs.access(EXCEPTIONS_CSV);
  } catch {
    await fs.writeFile(
      EXCEPTIONS_CSV,
      "domain,table,id,type,reason,sourceValue,targetValue,recordedAt\n",
      "utf8",
    );
  }
  await ensureApprovedExceptionsPlaceholder();
}
