/* eslint-disable @typescript-eslint/no-explicit-any -- migration input is untrusted heterogeneous legacy JSON */
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { inArray } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import {
  cases,
  clients,
  expenses,
  invoices,
  timeEntries,
  trustTransactions,
  users,
} from "@/server/db/schema";

type Value = Record<string, unknown>;
const tables = ["invoices", "timeEntries", "trustTransactions", "expenses"] as const;

export interface FinancialMigrationReport {
  source: Record<string, number>;
  migrated: Record<string, number>;
  exceptions: Array<{ table: string; id?: string; reason: string }>;
  reconciliation: { passed: boolean; checks: Record<string, { source: number; target: number }> };
}

export async function migrateFinancialExport(input: {
  exportPath: string;
  firmMap: Record<string, string>;
  orphanFirmId?: string;
}): Promise<FinancialMigrationReport> {
  const reader = await createReader(input.exportPath);
  const records = new Map<string, Value[]>();
  for (const table of tables) {
    try {
      records.set(table, await reader.readTable(table));
    } catch {
      records.set(table, []);
    }
  }

  const database = getDatabase();
  const userRows = await database
    .select({ id: users.id, firmId: users.firmId, legacyId: users.legacyConvexId })
    .from(users);
  const userMap = new Map(userRows.filter((row) => row.legacyId).map((row) => [row.legacyId!, row]));
  const caseRows = await database
    .select({ id: cases.id, firmId: cases.firmId, legacyId: cases.legacyConvexId })
    .from(cases);
  const caseMap = new Map(caseRows.filter((row) => row.legacyId).map((row) => [row.legacyId!, row]));
  const clientRows = await database
    .select({ id: clients.id, firmId: clients.firmId, legacyId: clients.legacyConvexId })
    .from(clients);
  const clientMap = new Map(
    clientRows.filter((row) => row.legacyId).map((row) => [row.legacyId!, row]),
  );

  const migrated = Object.fromEntries(tables.map((table) => [table, 0]));
  const exceptions: FinancialMigrationReport["exceptions"] = [];
  const invoiceMap = new Map<string, { id: string; firmId: string }>();

  await database.transaction(async (tx) => {
    for (const record of records.get("invoices") ?? []) {
      const legacyId = asString(record._id);
      try {
        if (!legacyId) throw new Error("Missing legacy ID");
        const caseRecord = caseMap.get(asString(record.caseId) ?? "");
        if (!caseRecord) throw new Error("Case missing");
        const clientRecord = clientMap.get(asString(record.clientId) ?? "");
        if (!clientRecord) throw new Error("Client missing");
        const firmId = resolveFirm(record, input, caseRecord.firmId);
        const [row] = await tx
          .insert(invoices)
          .values({
            legacyConvexId: legacyId,
            firmId,
            clientId: clientRecord.id,
            caseId: caseRecord.id,
            invoiceNumber: asString(record.invoiceNumber) ?? `INV-${legacyId.slice(-6)}`,
            subtotal: String(record.subtotal ?? 0),
            vatAmount: String(record.vatAmount ?? record.taxTotal ?? 0),
            total: String(record.total ?? 0),
            status: enumValue(
              record.status,
              ["draft", "sent", "paid", "overdue", "cancelled"] as const,
              "draft",
            ),
            issuedDate:
              dateOnly(record.issuedDate) ??
              dateOnly(record.issueDate) ??
              new Date().toISOString().slice(0, 10),
            dueDate: dateOnly(record.dueDate) ?? new Date().toISOString().slice(0, 10),
            paidDate: dateOnly(record.paidDate),
            notes: asString(record.notes),
            createdAt: toDate(record._creationTime) ?? new Date(),
          })
          .onConflictDoUpdate({
            target: invoices.legacyConvexId,
            set: {
              firmId,
              status: enumValue(
                record.status,
                ["draft", "sent", "paid", "overdue", "cancelled"] as const,
                "draft",
              ),
              updatedAt: new Date(),
            },
          })
          .returning({ id: invoices.id, firmId: invoices.firmId });
        invoiceMap.set(legacyId, row);
        migrated.invoices += 1;
      } catch (error) {
        exceptions.push({ table: "invoices", id: legacyId, reason: message(error) });
      }
    }

    for (const record of records.get("timeEntries") ?? []) {
      const legacyId = asString(record._id);
      try {
        if (!legacyId) throw new Error("Missing legacy ID");
        const caseRecord = caseMap.get(asString(record.caseId) ?? "");
        if (!caseRecord) throw new Error("Case missing");
        const userRecord = userMap.get(asString(record.userId) ?? "");
        if (!userRecord) throw new Error("User missing");
        const firmId = resolveFirm(record, input, caseRecord.firmId);
        const invoiceRef = asString(record.invoiceId);
        await tx
          .insert(timeEntries)
          .values({
            legacyConvexId: legacyId,
            firmId,
            caseId: caseRecord.id,
            userId: userRecord.id,
            description: asString(record.description) ?? "Time entry",
            minutes: typeof record.minutes === "number" ? record.minutes : 0,
            isBillable: typeof record.isBillable === "boolean" ? record.isBillable : true,
            entryDate:
              dateOnly(record.entryDate) ??
              dateOnly(record.date) ??
              new Date().toISOString().slice(0, 10),
            ratePerHour: String(record.ratePerHour ?? 0),
            invoiceId: invoiceRef ? invoiceMap.get(invoiceRef)?.id : undefined,
            createdAt: toDate(record._creationTime) ?? new Date(),
          })
          .onConflictDoUpdate({
            target: timeEntries.legacyConvexId,
            set: {
              firmId,
              description: asString(record.description) ?? "Time entry",
              updatedAt: new Date(),
            },
          });
        migrated.timeEntries += 1;
      } catch (error) {
        exceptions.push({ table: "timeEntries", id: legacyId, reason: message(error) });
      }
    }

    for (const record of records.get("trustTransactions") ?? []) {
      const legacyId = asString(record._id);
      try {
        if (!legacyId) throw new Error("Missing legacy ID");
        const clientRecord = clientMap.get(asString(record.clientId) ?? "");
        if (!clientRecord) throw new Error("Client missing");
        const firmId = resolveFirm(record, input, clientRecord.firmId);
        const caseId = asString(record.caseId);
        const approver =
          userMap.get(asString(record.approvedBy) ?? "") ??
          userMap.get(asString(record.recordedBy) ?? "") ??
          userRows.find((row) => row.firmId === firmId);
        if (!approver) throw new Error("Approver missing");
        await tx
          .insert(trustTransactions)
          .values({
            legacyConvexId: legacyId,
            firmId,
            clientId: clientRecord.id,
            caseId: caseId ? caseMap.get(caseId)?.id : undefined,
            type: enumValue(record.type, ["receipt", "disbursement"] as const, "receipt"),
            amount: String(record.amount ?? 0),
            description: asString(record.description) ?? "Trust transaction",
            transactionDate: dateOnly(record.date) ?? new Date().toISOString().slice(0, 10),
            balance: String(record.balance ?? record.amount ?? 0),
            approvedBy: approver.id,
            createdAt: toDate(record._creationTime) ?? new Date(),
          })
          .onConflictDoUpdate({
            target: trustTransactions.legacyConvexId,
            set: {
              firmId,
              description: asString(record.description) ?? "Trust transaction",
              updatedAt: new Date(),
            },
          });
        migrated.trustTransactions += 1;
      } catch (error) {
        exceptions.push({ table: "trustTransactions", id: legacyId, reason: message(error) });
      }
    }

    for (const record of records.get("expenses") ?? []) {
      const legacyId = asString(record._id);
      try {
        if (!legacyId) throw new Error("Missing legacy ID");
        const submitter = userMap.get(asString(record.submittedBy) ?? "");
        if (!submitter) throw new Error("Submitter missing");
        const firmId = resolveFirm(record, input, submitter.firmId);
        const caseId = asString(record.caseId);
        const approvedBy = asString(record.approvedBy);
        const invoiceRef = asString(record.invoiceId);
        await tx
          .insert(expenses)
          .values({
            legacyConvexId: legacyId,
            firmId,
            description: asString(record.description) ?? "Expense",
            category: enumValue(
              record.category,
              [
                "office_rent",
                "utilities",
                "court_fees",
                "courier",
                "printing",
                "travel",
                "supplies",
                "software",
                "other",
              ] as const,
              "other",
            ),
            amount: String(record.amount ?? 0),
            caseId: caseId ? caseMap.get(caseId)?.id : undefined,
            receiptId: asString(record.receiptId),
            expenseDate: dateOnly(record.date) ?? new Date().toISOString().slice(0, 10),
            submittedBy: submitter.id,
            status: enumValue(record.status, ["pending", "approved", "rejected"] as const, "pending"),
            approvedBy: approvedBy ? userMap.get(approvedBy)?.id : undefined,
            invoiceId: invoiceRef ? invoiceMap.get(invoiceRef)?.id : undefined,
            createdAt: toDate(record._creationTime) ?? new Date(),
          })
          .onConflictDoUpdate({
            target: expenses.legacyConvexId,
            set: {
              firmId,
              description: asString(record.description) ?? "Expense",
              updatedAt: new Date(),
            },
          });
        migrated.expenses += 1;
      } catch (error) {
        exceptions.push({ table: "expenses", id: legacyId, reason: message(error) });
      }
    }
  });

  const checks: Record<string, { source: number; target: number }> = {};
  for (const [name, table] of [
    ["invoices", invoices],
    ["timeEntries", timeEntries],
    ["trustTransactions", trustTransactions],
    ["expenses", expenses],
  ] as const) {
    const ids = (records.get(name) ?? [])
      .map((row) => asString(row._id))
      .filter(Boolean) as string[];
    const target = ids.length
      ? (
          await database
            .select({ id: table.id })
            .from(table)
            .where(inArray(table.legacyConvexId, ids))
        ).length
      : 0;
    checks[name] = { source: records.get(name)?.length ?? 0, target };
  }

  return {
    source: Object.fromEntries([...records].map(([name, rows]) => [name, rows.length])),
    migrated,
    exceptions,
    reconciliation: {
      passed:
        exceptions.length === 0 &&
        Object.values(checks).every((check) => check.source === check.target),
      checks,
    },
  };
}

function resolveFirm(
  record: Value,
  input: { firmMap: Record<string, string>; orphanFirmId?: string },
  relatedFirmId?: string,
) {
  const legacyFirmId = asString(record.firmId);
  const mapped = legacyFirmId ? input.firmMap[legacyFirmId] : undefined;
  const firmId = mapped ?? relatedFirmId ?? input.orphanFirmId;
  if (!firmId) throw new Error("Firm ownership is missing");
  if (mapped && relatedFirmId && mapped !== relatedFirmId) {
    throw new Error("Firm ownership conflicts with a related record");
  }
  return firmId;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function toDate(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}
function dateOnly(value: unknown) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = toDate(value);
  return date ? date.toISOString().slice(0, 10) : null;
}
function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}
function message(error: unknown) {
  return error instanceof Error ? error.message : "Unknown migration error";
}

async function createReader(exportPath: string) {
  const stat = await fs.stat(exportPath);
  if (stat.isDirectory()) {
    return {
      readTable: async (table: string) => {
        for (const candidate of [
          path.join(exportPath, table, "documents.jsonl"),
          path.join(exportPath, `${table}.jsonl`),
          path.join(exportPath, `${table}.json`),
        ]) {
          try {
            return parseRows(await fs.readFile(candidate, "utf8"));
          } catch {
            // try next candidate
          }
        }
        return [];
      },
    };
  }
  const buffer = await fs.readFile(exportPath);
  const zip = await JSZip.loadAsync(buffer);
  return {
    readTable: async (table: string) => {
      const file =
        zip.file(`${table}/documents.jsonl`) ||
        zip.file(`${table}.jsonl`) ||
        zip.file(`${table}.json`);
      if (!file) return [];
      return parseRows(await file.async("string"));
    },
  };
}

function parseRows(content: string): Value[] {
  const trimmed = content.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) return JSON.parse(trimmed) as Value[];
  return trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Value);
}
