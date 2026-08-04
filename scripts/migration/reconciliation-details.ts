/**
 * R3.5 — Structured reconciliation dimensions for the markdown report.
 * Does not rewrite importers; reads export + Postgres (and storage journal) after migrate.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { inArray, eq } from "drizzle-orm";
import { getDatabase } from "../../src/server/db/client";
import {
  expenses,
  invoices,
  storageMigrationItems,
  timeEntries,
  trustTransactions,
} from "../../src/server/db/schema";
import type { DomainMigrationReport } from "./types";
import type { ReconcileException } from "./reconcile";

export type CountCheck = {
  table: string;
  source: number;
  target: number;
  match: boolean;
};

export type MissingId = {
  table: string;
  id: string;
  reason?: string;
};

export type FkIssue = {
  table: string;
  id?: string;
  reason: string;
};

export type FinancialTotal = {
  metric: string;
  source: string;
  target: string;
  match: boolean;
};

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
  fkIntegrity: {
    status: "pass" | "fail" | "n/a";
    issues: FkIssue[];
  };
  financialTotals?: FinancialTotal[];
  fileSha256?: FileSha256Row[];
};

const FK_REASON =
  /missing|could not be mapped|unknown userid|firm ownership|approver|submitter|case missing|client missing|user missing|notification user/i;

export function isFkReason(reason: string) {
  return FK_REASON.test(reason);
}

export function exceptionTypeForReason(reason: string): ReconcileException["type"] {
  if (isFkReason(reason)) return "FK_VIOLATION";
  return "OTHER";
}

/** Build the five report dimensions from a domain migration report (+ optional enrichments). */
export function detailsFromReport(
  report: DomainMigrationReport,
  extra?: Partial<ReconciliationDetails>,
): ReconciliationDetails {
  const counts: CountCheck[] = Object.entries(report.reconciliation.checks ?? {}).map(
    ([table, check]) => ({
      table,
      source: check.source,
      target: check.target,
      match: check.source === check.target,
    }),
  );

  const missingIds: MissingId[] = report.exceptions
    .filter((ex): ex is { table: string; id: string; reason: string } => Boolean(ex.id))
    .map((ex) => ({ table: ex.table, id: ex.id, reason: ex.reason }));

  const fkIssues: FkIssue[] = report.exceptions
    .filter((ex) => isFkReason(ex.reason))
    .map((ex) => ({ table: ex.table, id: ex.id, reason: ex.reason }));

  const base: ReconciliationDetails = {
    counts,
    missingIds,
    fkIntegrity: {
      status: fkIssues.length > 0 ? "fail" : report.exceptions.length === 0 ? "pass" : "n/a",
      issues: fkIssues,
    },
  };

  return mergeDetails(base, extra ?? {});
}

export function mergeDetails(
  base: ReconciliationDetails,
  extra: Partial<ReconciliationDetails>,
): ReconciliationDetails {
  return {
    counts: extra.counts ?? base.counts,
    missingIds: extra.missingIds ?? base.missingIds,
    fkIntegrity: extra.fkIntegrity ?? base.fkIntegrity,
    financialTotals: extra.financialTotals ?? base.financialTotals,
    fileSha256: extra.fileSha256 ?? base.fileSha256,
  };
}

export async function computeFinancialTotals(exportPath: string): Promise<FinancialTotal[]> {
  const sourceInvoices = await readExportRows(exportPath, "invoices");
  const sourceExpenses = await readExportRows(exportPath, "expenses");
  const sourceTrust = await readExportRows(exportPath, "trustTransactions");
  const sourceTime = await readExportRows(exportPath, "timeEntries");

  const invoiceIds = idsOf(sourceInvoices);
  const expenseIds = idsOf(sourceExpenses);
  const trustIds = idsOf(sourceTrust);
  const timeIds = idsOf(sourceTime);

  const db = getDatabase();

  const targetInvoices = invoiceIds.length
    ? await db
        .select({
          legacy: invoices.legacyConvexId,
          total: invoices.total,
          subtotal: invoices.subtotal,
          vatAmount: invoices.vatAmount,
        })
        .from(invoices)
        .where(inArray(invoices.legacyConvexId, invoiceIds))
    : [];
  const targetExpenses = expenseIds.length
    ? await db
        .select({ legacy: expenses.legacyConvexId, amount: expenses.amount })
        .from(expenses)
        .where(inArray(expenses.legacyConvexId, expenseIds))
    : [];
  const targetTrust = trustIds.length
    ? await db
        .select({ legacy: trustTransactions.legacyConvexId, amount: trustTransactions.amount })
        .from(trustTransactions)
        .where(inArray(trustTransactions.legacyConvexId, trustIds))
    : [];
  const targetTime = timeIds.length
    ? await db
        .select({
          legacy: timeEntries.legacyConvexId,
          minutes: timeEntries.minutes,
          ratePerHour: timeEntries.ratePerHour,
        })
        .from(timeEntries)
        .where(inArray(timeEntries.legacyConvexId, timeIds))
    : [];

  const sourceInvoiceTotal = sumMoney(sourceInvoices, (r) => r.total);
  const targetInvoiceTotal = sumMoney(targetInvoices, (r) => r.total);
  const sourceInvoiceSubtotal = sumMoney(sourceInvoices, (r) => r.subtotal);
  const targetInvoiceSubtotal = sumMoney(targetInvoices, (r) => r.subtotal);
  const sourceInvoiceVat = sumMoney(sourceInvoices, (r) => r.vatAmount ?? r.taxTotal);
  const targetInvoiceVat = sumMoney(targetInvoices, (r) => r.vatAmount);
  const sourceExpenseTotal = sumMoney(sourceExpenses, (r) => r.amount);
  const targetExpenseTotal = sumMoney(targetExpenses, (r) => r.amount);
  const sourceTrustTotal = sumMoney(sourceTrust, (r) => r.amount);
  const targetTrustTotal = sumMoney(targetTrust, (r) => r.amount);
  const sourceTimeMinutes = sumNumber(sourceTime, (r) => r.minutes);
  const targetTimeMinutes = sumNumber(targetTime, (r) => r.minutes);
  const sourceTimeValue = sumMoney(sourceTime, (r) => (Number(r.minutes ?? 0) / 60) * Number(r.ratePerHour ?? 0));
  const targetTimeValue = sumMoney(targetTime, (r) => (Number(r.minutes ?? 0) / 60) * Number(r.ratePerHour ?? 0));

  return [
    moneyRow("invoices.total", sourceInvoiceTotal, targetInvoiceTotal),
    moneyRow("invoices.subtotal", sourceInvoiceSubtotal, targetInvoiceSubtotal),
    moneyRow("invoices.vatAmount", sourceInvoiceVat, targetInvoiceVat),
    moneyRow("expenses.amount", sourceExpenseTotal, targetExpenseTotal),
    moneyRow("trustTransactions.amount", sourceTrustTotal, targetTrustTotal),
    {
      metric: "timeEntries.minutes",
      source: String(sourceTimeMinutes),
      target: String(targetTimeMinutes),
      match: sourceTimeMinutes === targetTimeMinutes,
    },
    moneyRow("timeEntries.billableValue", sourceTimeValue, targetTimeValue),
  ];
}

export async function loadFileSha256Rows(firmId?: string): Promise<FileSha256Row[]> {
  const db = getDatabase();
  const rows = firmId
    ? await db
        .select({
          storageId: storageMigrationItems.legacyStorageId,
          expectedSha256: storageMigrationItems.expectedSha256,
          actualSha256: storageMigrationItems.actualSha256,
          status: storageMigrationItems.status,
        })
        .from(storageMigrationItems)
        .where(eq(storageMigrationItems.firmId, firmId))
    : await db
        .select({
          storageId: storageMigrationItems.legacyStorageId,
          expectedSha256: storageMigrationItems.expectedSha256,
          actualSha256: storageMigrationItems.actualSha256,
          status: storageMigrationItems.status,
        })
        .from(storageMigrationItems);

  return rows.map((row) => {
    const expected = row.expectedSha256 ?? null;
    const actual = row.actualSha256 ?? null;
    const match =
      row.status === "verified" &&
      Boolean(expected) &&
      Boolean(actual) &&
      expected!.toLowerCase() === actual!.toLowerCase();
    return {
      storageId: row.storageId,
      expectedSha256: expected,
      actualSha256: actual,
      match,
      status: row.status,
    };
  });
}

/** Resolve missing legacy IDs by comparing export IDs to Postgres for known financial tables. */
export async function findMissingFinancialIds(exportPath: string): Promise<MissingId[]> {
  const missing: MissingId[] = [];
  const pairs = [
    ["invoices", invoices] as const,
    ["expenses", expenses] as const,
    ["trustTransactions", trustTransactions] as const,
    ["timeEntries", timeEntries] as const,
  ];
  const db = getDatabase();
  for (const [table, schema] of pairs) {
    const rows = await readExportRows(exportPath, table);
    const legacyIds = idsOf(rows);
    if (legacyIds.length === 0) continue;
    const present = await db
      .select({ legacy: schema.legacyConvexId })
      .from(schema)
      .where(inArray(schema.legacyConvexId, legacyIds));
    const have = new Set(present.map((r) => r.legacy).filter(Boolean));
    for (const id of legacyIds) {
      if (!have.has(id)) missing.push({ table, id, reason: "legacyConvexId not found in Postgres" });
    }
  }
  return missing;
}

async function readExportRows(
  exportPath: string,
  table: string,
): Promise<Array<Record<string, unknown>>> {
  for (const candidate of [
    path.join(exportPath, table, "documents.jsonl"),
    path.join(exportPath, `${table}.jsonl`),
    path.join(exportPath, `${table}.json`),
  ]) {
    try {
      const text = (await fs.readFile(candidate, "utf8")).trim();
      if (!text) return [];
      if (text.startsWith("[")) return JSON.parse(text) as Array<Record<string, unknown>>;
      return text
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line) as Record<string, unknown>);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error;
    }
  }
  return [];
}

function idsOf(rows: Array<Record<string, unknown>>) {
  return rows
    .map((r) => (typeof r._id === "string" ? r._id : undefined))
    .filter((id): id is string => Boolean(id));
}

function cents(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function sumMoney<T>(rows: T[], pick: (row: T) => unknown): number {
  return rows.reduce((acc, row) => acc + cents(pick(row)), 0);
}

function sumNumber<T>(rows: T[], pick: (row: T) => unknown): number {
  return rows.reduce((acc, row) => {
    const n = Number(pick(row));
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
}

function moneyRow(metric: string, sourceCents: number, targetCents: number): FinancialTotal {
  return {
    metric,
    source: (sourceCents / 100).toFixed(2),
    target: (targetCents / 100).toFixed(2),
    match: sourceCents === targetCents,
  };
}
