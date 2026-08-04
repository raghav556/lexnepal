import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { AuditContext } from "@/server/audit/context";
import { getDatabase } from "@/server/db/client";
import { runFinancialTransaction } from "@/server/db/financial-transaction";
import {
  auditLog,
  cases,
  expenses,
  invoiceLineItems,
  invoices,
  notifications,
  payments,
  timeEntries,
  trustTransactions,
} from "@/server/db/schema";
import type {
  ExpenseApproveInput,
  ExpenseCreateInput,
  ExpenseListInput,
  InitiateGatewayInput,
  InvoiceFromTimeInput,
  InvoiceListInput,
  InvoiceStatusUpdateInput,
  PayInvoiceInput,
  TimeEntryCreateInput,
  TimeEntryListInput,
  TrustCreateInput,
  TrustListInput,
} from "@/shared/contracts/financial";
import { AppError } from "@/shared/errors/api-error";

const database = getDatabase();

function money(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toDto<T extends Record<string, unknown>>(row: T): T & { _id: string } {
  const output: Record<string, unknown> = { ...row, _id: row.id };
  for (const [key, value] of Object.entries(output)) {
    if (value instanceof Date) output[key] = value.toISOString();
  }
  for (const key of [
    "subtotal",
    "vatAmount",
    "total",
    "amount",
    "quantity",
    "unitPrice",
    "ratePerHour",
    "balance",
  ]) {
    if (key in output && output[key] != null) output[key] = money(output[key]);
  }
  delete output.firmId;
  delete output.legacyConvexId;
  delete output.deletedAt;
  return output as T & { _id: string };
}

function toTimeDto(row: typeof timeEntries.$inferSelect) {
  const dto = toDto(row as unknown as Record<string, unknown>);
  return { ...dto, date: row.entryDate };
}

function toExpenseDto(row: typeof expenses.$inferSelect) {
  const dto = toDto(row as unknown as Record<string, unknown>);
  return { ...dto, date: row.expenseDate };
}

function toTrustDto(row: typeof trustTransactions.$inferSelect) {
  const dto = toDto(row as unknown as Record<string, unknown>);
  return { ...dto, date: row.transactionDate };
}

async function writeAudit(
  tx: Parameters<Parameters<typeof database.transaction>[0]>[0],
  audit: AuditContext,
  action: string,
  resource: string,
  resourceId: string | null,
  details: string | null,
) {
  await tx.insert(auditLog).values({
    firmId: audit.firmId,
    userId: audit.actorId,
    action,
    resource,
    resourceId,
    details,
    ipAddress: audit.ipAddress,
    requestId: audit.requestId,
    createdAt: audit.occurredAt,
    updatedAt: audit.occurredAt,
  });
}

export class PostgresFinancialRepository {
  async listInvoices(firmId: string, filters: InvoiceListInput = {}) {
    const predicates = [eq(invoices.firmId, firmId), isNull(invoices.deletedAt)];
    if (filters.clientId) predicates.push(eq(invoices.clientId, filters.clientId));
    if (filters.caseId) predicates.push(eq(invoices.caseId, filters.caseId));
    if (filters.status) predicates.push(eq(invoices.status, filters.status));
    const rows = await database
      .select()
      .from(invoices)
      .where(and(...predicates))
      .orderBy(desc(invoices.createdAt));
    return rows.map((row) => toDto(row as unknown as Record<string, unknown>));
  }

  async getInvoice(firmId: string, invoiceId: string) {
    const [row] = await database
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.firmId, firmId), isNull(invoices.deletedAt)))
      .limit(1);
    return row ? toDto(row as unknown as Record<string, unknown>) : null;
  }

  async listTimeEntries(firmId: string, filters: TimeEntryListInput = {}) {
    const predicates = [eq(timeEntries.firmId, firmId), isNull(timeEntries.deletedAt)];
    if (filters.caseId) predicates.push(eq(timeEntries.caseId, filters.caseId));
    if (filters.userId) predicates.push(eq(timeEntries.userId, filters.userId));
    const rows = await database
      .select()
      .from(timeEntries)
      .where(and(...predicates))
      .orderBy(desc(timeEntries.createdAt));
    return rows.map(toTimeDto);
  }

  async listTrustTransactions(firmId: string, filters: TrustListInput = {}) {
    const predicates = [eq(trustTransactions.firmId, firmId), isNull(trustTransactions.deletedAt)];
    if (filters.clientId) predicates.push(eq(trustTransactions.clientId, filters.clientId));
    if (filters.caseId) predicates.push(eq(trustTransactions.caseId, filters.caseId));
    const rows = await database
      .select()
      .from(trustTransactions)
      .where(and(...predicates))
      .orderBy(desc(trustTransactions.createdAt));
    return rows.map(toTrustDto);
  }

  async listExpenses(firmId: string, filters: ExpenseListInput = {}) {
    const predicates = [eq(expenses.firmId, firmId), isNull(expenses.deletedAt)];
    if (filters.caseId) predicates.push(eq(expenses.caseId, filters.caseId));
    if (filters.category && filters.category !== "all") {
      predicates.push(eq(expenses.category, filters.category));
    }
    if (filters.status && filters.status !== "all") {
      predicates.push(eq(expenses.status, filters.status));
    }
    const rows = await database
      .select()
      .from(expenses)
      .where(and(...predicates))
      .orderBy(desc(expenses.expenseDate));
    return rows.map(toExpenseDto);
  }

  async getExpenseStats(firmId: string) {
    const rows = await this.listExpenses(firmId, {});
    const total = rows.reduce((sum, row) => sum + money(row.amount), 0);
    const approved = rows
      .filter((row) => row.status === "approved")
      .reduce((sum, row) => sum + money(row.amount), 0);
    const pending = rows
      .filter((row) => row.status === "pending")
      .reduce((sum, row) => sum + money(row.amount), 0);
    const caseLinked = rows
      .filter((row) => Boolean(row.caseId))
      .reduce((sum, row) => sum + money(row.amount), 0);
    const byCategory: Record<string, number> = {};
    for (const row of rows) {
      const key = String(row.category);
      byCategory[key] = (byCategory[key] ?? 0) + money(row.amount);
    }
    return {
      total,
      approved,
      pending,
      caseLinked,
      byCategory,
      count: rows.length,
      pendingCount: rows.filter((row) => row.status === "pending").length,
    };
  }

  async createTimeEntry(
    firmId: string,
    userId: string,
    input: TimeEntryCreateInput,
    audit: AuditContext,
  ) {
    return runFinancialTransaction(database, async (tx) => {
      const [row] = await tx
        .insert(timeEntries)
        .values({
          firmId,
          caseId: input.caseId,
          userId,
          description: input.description,
          minutes: input.minutes,
          isBillable: input.isBillable,
          entryDate: input.date,
          ratePerHour: String(input.ratePerHour),
        })
        .returning();
      await writeAudit(tx, audit, "time_entry.created", "time_entries", row.id, row.description);
      return toTimeDto(row);
    });
  }

  async deleteTimeEntry(firmId: string, entryId: string, audit: AuditContext) {
    return runFinancialTransaction(database, async (tx) => {
      const [existing] = await tx
        .select()
        .from(timeEntries)
        .where(
          and(eq(timeEntries.id, entryId), eq(timeEntries.firmId, firmId), isNull(timeEntries.deletedAt)),
        )
        .limit(1);
      if (!existing) throw new AppError("NOT_FOUND", "Time entry was not found", 404);
      if (existing.invoiceId) {
        throw new AppError("CONFLICT", "Billed time entries cannot be deleted", 409);
      }
      await tx
        .update(timeEntries)
        .set({ deletedAt: audit.occurredAt, updatedAt: audit.occurredAt })
        .where(eq(timeEntries.id, entryId));
      await writeAudit(tx, audit, "time_entry.deleted", "time_entries", existing.id, null);
      return { success: true };
    });
  }

  async createInvoiceFromTimeEntries(
    firmId: string,
    input: InvoiceFromTimeInput,
    audit: AuditContext,
  ) {
    return runFinancialTransaction(database, async (tx) => {
      const predicates = [
        eq(timeEntries.firmId, firmId),
        eq(timeEntries.caseId, input.caseId),
        eq(timeEntries.isBillable, true),
        isNull(timeEntries.invoiceId),
        isNull(timeEntries.deletedAt),
      ];
      let entries = await tx.select().from(timeEntries).where(and(...predicates));
      if (input.timeEntryIds?.length) {
        const allowed = new Set(input.timeEntryIds);
        entries = entries.filter((entry) => allowed.has(entry.id));
      }
      if (entries.length === 0) {
        throw new AppError("VALIDATION_FAILED", "No unbilled billable time entries found", 400);
      }

      const subtotal =
        Math.round(
          entries.reduce((sum, entry) => sum + (entry.minutes / 60) * money(entry.ratePerHour), 0) *
            100,
        ) / 100;
      const vatAmount = Math.round(subtotal * 0.13 * 100) / 100;
      const total = Math.round((subtotal + vatAmount) * 100) / 100;
      const issuedDate = audit.occurredAt.toISOString().slice(0, 10);
      const invoiceNumber = `INV-${String(Date.now()).slice(-6)}`;

      const [invoice] = await tx
        .insert(invoices)
        .values({
          firmId,
          invoiceNumber,
          caseId: input.caseId,
          clientId: input.clientId,
          status: "draft",
          subtotal: String(subtotal),
          vatAmount: String(vatAmount),
          total: String(total),
          issuedDate,
          dueDate: input.dueDate,
          notes: input.notes ?? null,
        })
        .returning();

      for (const entry of entries) {
        const quantity = Math.round((entry.minutes / 60) * 100) / 100;
        const amount = Math.round(quantity * money(entry.ratePerHour) * 100) / 100;
        await tx.insert(invoiceLineItems).values({
          firmId,
          invoiceId: invoice.id,
          description: entry.description,
          quantity: String(quantity),
          unitPrice: String(entry.ratePerHour),
          amount: String(amount),
          type: "time",
        });
        await tx
          .update(timeEntries)
          .set({ invoiceId: invoice.id, updatedAt: audit.occurredAt })
          .where(eq(timeEntries.id, entry.id));
      }

      await writeAudit(tx, audit, "invoice.created", "invoices", invoice.id, invoice.invoiceNumber);
      return toDto(invoice as unknown as Record<string, unknown>);
    });
  }

  async updateInvoiceStatus(
    firmId: string,
    invoiceId: string,
    input: InvoiceStatusUpdateInput,
    audit: AuditContext,
  ) {
    return runFinancialTransaction(database, async (tx) => {
      const [row] = await tx
        .update(invoices)
        .set({
          status: input.status,
          paidDate: input.paidDate ?? (input.status === "paid" ? audit.occurredAt.toISOString().slice(0, 10) : null),
          updatedAt: audit.occurredAt,
        })
        .where(and(eq(invoices.id, invoiceId), eq(invoices.firmId, firmId), isNull(invoices.deletedAt)))
        .returning();
      if (!row) throw new AppError("NOT_FOUND", "Invoice was not found", 404);
      await writeAudit(tx, audit, "invoice.status_updated", "invoices", row.id, row.status);
      return toDto(row as unknown as Record<string, unknown>);
    });
  }

  async payInvoice(firmId: string, invoiceId: string, input: PayInvoiceInput, audit: AuditContext) {
    return runFinancialTransaction(database, async (tx) => {
      const [invoice] = await tx
        .select()
        .from(invoices)
        .where(and(eq(invoices.id, invoiceId), eq(invoices.firmId, firmId), isNull(invoices.deletedAt)))
        .limit(1);
      if (!invoice) throw new AppError("NOT_FOUND", "Invoice was not found", 404);
      if (invoice.status === "cancelled") {
        throw new AppError("CONFLICT", "Cancelled invoices cannot be paid", 409);
      }

      const paidDate = audit.occurredAt.toISOString().slice(0, 10);
      const amount = input.amount ?? money(invoice.total);
      const gateway = input.gateway ?? "bank_transfer";
      const referenceNumber =
        input.referenceNumber ?? `PAY-${String(Date.now()).slice(-8)}`;

      const [payment] = await tx
        .insert(payments)
        .values({
          firmId,
          invoiceId: invoice.id,
          clientId: invoice.clientId,
          amount: String(amount),
          gateway,
          referenceNumber,
          status: "completed",
          paidAt: audit.occurredAt,
        })
        .returning();

      await tx
        .update(invoices)
        .set({ status: "paid", paidDate, updatedAt: audit.occurredAt })
        .where(eq(invoices.id, invoice.id));

      const [matter] = await tx
        .select({ assignedLawyerId: cases.assignedLawyerId })
        .from(cases)
        .where(and(eq(cases.id, invoice.caseId), eq(cases.firmId, firmId)))
        .limit(1);
      if (matter?.assignedLawyerId) {
        await tx.insert(notifications).values({
          firmId,
          userId: matter.assignedLawyerId,
          title: "Payment received",
          body: `Invoice ${invoice.invoiceNumber} marked paid (${gateway}).`,
          type: "payment_received",
          relatedId: invoice.id,
          link: `/admin/finance`,
        });
      }

      await writeAudit(tx, audit, "invoice.paid", "invoices", invoice.id, referenceNumber);
      return {
        success: true,
        paymentId: payment.id,
        _id: payment.id,
      };
    });
  }

  async initiateGatewayPayment(
    firmId: string,
    invoiceId: string,
    input: InitiateGatewayInput,
    audit: AuditContext,
  ) {
    return runFinancialTransaction(database, async (tx) => {
      const [invoice] = await tx
        .select()
        .from(invoices)
        .where(and(eq(invoices.id, invoiceId), eq(invoices.firmId, firmId), isNull(invoices.deletedAt)))
        .limit(1);
      if (!invoice) throw new AppError("NOT_FOUND", "Invoice was not found", 404);

      const referenceNumber = `PEND-${Date.now()}`;
      const [payment] = await tx
        .insert(payments)
        .values({
          firmId,
          invoiceId: invoice.id,
          clientId: invoice.clientId,
          amount: String(invoice.total),
          gateway: input.gateway,
          status: "pending",
          referenceNumber,
        })
        .returning();

      await writeAudit(tx, audit, "payment.initiated", "payments", payment.id, input.gateway);
      return {
        paymentId: payment.id,
        _id: payment.id,
        gateway: input.gateway,
        amount: money(invoice.total),
        invoiceNumber: invoice.invoiceNumber,
        nextStep: "redirect_or_confirm",
      };
    });
  }

  async createTrustTransaction(
    firmId: string,
    approvedBy: string,
    input: TrustCreateInput,
    audit: AuditContext,
  ) {
    return runFinancialTransaction(database, async (tx) => {
      const [row] = await tx
        .insert(trustTransactions)
        .values({
          firmId,
          clientId: input.clientId,
          caseId: input.caseId ?? null,
          type: input.type,
          amount: String(input.amount),
          description: input.description,
          transactionDate: input.date,
          balance: String(input.balance),
          approvedBy,
        })
        .returning();
      await writeAudit(tx, audit, "trust.created", "trust_transactions", row.id, row.type);
      return toTrustDto(row);
    });
  }

  async createExpense(
    firmId: string,
    submittedBy: string,
    input: ExpenseCreateInput,
    audit: AuditContext,
  ) {
    return runFinancialTransaction(database, async (tx) => {
      const [row] = await tx
        .insert(expenses)
        .values({
          firmId,
          description: input.description,
          category: input.category,
          amount: String(input.amount),
          caseId: input.caseId ?? null,
          receiptId: input.receiptId ?? null,
          expenseDate: input.date,
          submittedBy,
          status: "pending",
        })
        .returning();
      await writeAudit(tx, audit, "expense.created", "expenses", row.id, row.description);
      return toExpenseDto(row);
    });
  }

  async approveExpense(
    firmId: string,
    expenseId: string,
    approvedBy: string,
    input: ExpenseApproveInput,
    audit: AuditContext,
  ) {
    return runFinancialTransaction(database, async (tx) => {
      const [row] = await tx
        .update(expenses)
        .set({
          status: input.status,
          approvedBy,
          updatedAt: audit.occurredAt,
        })
        .where(and(eq(expenses.id, expenseId), eq(expenses.firmId, firmId), isNull(expenses.deletedAt)))
        .returning();
      if (!row) throw new AppError("NOT_FOUND", "Expense was not found", 404);
      await writeAudit(tx, audit, "expense.reviewed", "expenses", row.id, input.status);
      return toExpenseDto(row);
    });
  }

  async deleteExpense(firmId: string, expenseId: string, audit: AuditContext) {
    return runFinancialTransaction(database, async (tx) => {
      const [row] = await tx
        .update(expenses)
        .set({ deletedAt: audit.occurredAt, updatedAt: audit.occurredAt })
        .where(and(eq(expenses.id, expenseId), eq(expenses.firmId, firmId), isNull(expenses.deletedAt)))
        .returning();
      if (!row) throw new AppError("NOT_FOUND", "Expense was not found", 404);
      await writeAudit(tx, audit, "expense.deleted", "expenses", row.id, null);
      return { success: true };
    });
  }
}
