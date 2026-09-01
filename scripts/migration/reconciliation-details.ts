import { eq } from "drizzle-orm";
import { getDatabase } from "../../src/server/db/client";
import { storageMigrationItems } from "../../src/server/db/schema";
import type { DomainMigrationReport } from "./types";
import type { ReconcileException } from "./reconcile";

export type CountCheck = { table: string; source: number; target: number; match: boolean };
export type MissingId = { table: string; id: string; reason?: string };
export type FkIssue = { table: string; id?: string; reason: string };
export type FileSha256Row = {
  storageId: string;
  expectedSha256: string | null;
  actualSha256: string | null;
  match: boolean;
  status: string;
};
export type ReconciliationDetails = {
  counts: CountCheck[];
  missingIds: MissingId[];
  fkIntegrity: { status: "pass" | "fail" | "n/a"; issues: FkIssue[] };
  fileSha256?: FileSha256Row[];
};

const FK_REASON =
  /missing|could not be mapped|unknown userid|firm ownership|approver|submitter|case missing|client missing|user missing|notification user/i;

export function isFkReason(reason: string) {
  return FK_REASON.test(reason);
}

export function exceptionTypeForReason(reason: string): ReconcileException["type"] {
  return isFkReason(reason) ? "FK_VIOLATION" : "OTHER";
}

export function detailsFromReport(
  report: DomainMigrationReport,
  extra: Partial<ReconciliationDetails> = {},
): ReconciliationDetails {
  const counts = Object.entries(report.reconciliation.checks ?? {}).map(([table, check]) => ({
    table,
    source: check.source,
    target: check.target,
    match: check.source === check.target,
  }));
  const missingIds = report.exceptions
    .filter((exception): exception is { table: string; id: string; reason: string } =>
      Boolean(exception.id),
    )
    .map((exception) => ({
      table: exception.table,
      id: exception.id,
      reason: exception.reason,
    }));
  const issues = report.exceptions
    .filter((exception) => isFkReason(exception.reason))
    .map((exception) => ({
      table: exception.table,
      id: exception.id,
      reason: exception.reason,
    }));
  return {
    counts: extra.counts ?? counts,
    missingIds: extra.missingIds ?? missingIds,
    fkIntegrity:
      extra.fkIntegrity ??
      ({
        status: issues.length ? "fail" : report.exceptions.length ? "n/a" : "pass",
        issues,
      } as const),
    fileSha256: extra.fileSha256,
  };
}

export async function loadFileSha256Rows(firmId?: string): Promise<FileSha256Row[]> {
  const database = getDatabase();
  const query = database
    .select({
      storageId: storageMigrationItems.legacyStorageId,
      expectedSha256: storageMigrationItems.expectedSha256,
      actualSha256: storageMigrationItems.actualSha256,
      status: storageMigrationItems.status,
    })
    .from(storageMigrationItems);
  const rows = firmId ? await query.where(eq(storageMigrationItems.firmId, firmId)) : await query;
  return rows.map((row) => {
    const expected = row.expectedSha256 ?? null;
    const actual = row.actualSha256 ?? null;
    return {
      storageId: row.storageId,
      expectedSha256: expected,
      actualSha256: actual,
      match:
        row.status === "verified" &&
        Boolean(expected) &&
        Boolean(actual) &&
        expected!.toLowerCase() === actual!.toLowerCase(),
      status: row.status,
    };
  });
}
