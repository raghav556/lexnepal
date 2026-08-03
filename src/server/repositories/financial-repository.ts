/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDatabase } from "../db/client";
import {
  expenses,
  invoices,
  timeEntries,
  trustTransactions,
} from "../db/schema";

export class FinancialRepository {
  async listInvoices(firmId: string, filters?: { clientId?: string; caseId?: string }) {
    const db = getDatabase();
    let query = db.select().from(invoices).where(eq(invoices.firmId, firmId));
    if (filters?.clientId) {
      query = db.select().from(invoices).where(and(eq(invoices.firmId, firmId), eq(invoices.clientId, filters.clientId)));
    }
    if (filters?.caseId) {
      query = db.select().from(invoices).where(and(eq(invoices.firmId, firmId), eq(invoices.caseId, filters.caseId)));
    }
    return query.orderBy(desc(invoices.createdAt));
  }

  async listTimeEntries(firmId: string, filters?: { caseId?: string; userId?: string }) {
    const db = getDatabase();
    let query = db.select().from(timeEntries).where(eq(timeEntries.firmId, firmId));
    if (filters?.caseId) {
       query = db.select().from(timeEntries).where(and(eq(timeEntries.firmId, firmId), eq(timeEntries.caseId, filters.caseId)));
    }
    if (filters?.userId) {
       query = db.select().from(timeEntries).where(and(eq(timeEntries.firmId, firmId), eq(timeEntries.userId, filters.userId)));
    }
    return query.orderBy(desc(timeEntries.createdAt));
  }

  async listTrustTransactions(firmId: string, filters?: { clientId?: string; caseId?: string }) {
    const db = getDatabase();
    let query = db.select().from(trustTransactions).where(eq(trustTransactions.firmId, firmId));
    if (filters?.clientId) {
      query = db.select().from(trustTransactions).where(and(eq(trustTransactions.firmId, firmId), eq(trustTransactions.clientId, filters.clientId)));
    }
    if (filters?.caseId) {
      query = db.select().from(trustTransactions).where(and(eq(trustTransactions.firmId, firmId), eq(trustTransactions.caseId, filters.caseId)));
    }
    return query.orderBy(desc(trustTransactions.createdAt));
  }

  async listExpenses(firmId: string, filters?: { caseId?: string; category?: any; status?: any }) {
    const db = getDatabase();
    let query = db.select().from(expenses).where(eq(expenses.firmId, firmId));
    if (filters?.caseId) {
      query = db.select().from(expenses).where(and(eq(expenses.firmId, firmId), eq(expenses.caseId, filters.caseId)));
    }
    return query.orderBy(desc(expenses.createdAt));
  }

  // Mutations
  async createTimeEntry(data: typeof timeEntries.$inferInsert) {
    const db = getDatabase();
    return db.transaction(async (tx) => {
      const [entry] = await tx.insert(timeEntries).values(data).returning();
      return entry;
    });
  }
  
  async deleteTimeEntry(id: string, firmId: string) {
    const db = getDatabase();
    return db.transaction(async (tx) => {
      await tx.delete(timeEntries).where(and(eq(timeEntries.id, id), eq(timeEntries.firmId, firmId)));
    });
  }

  async createExpense(data: typeof expenses.$inferInsert) {
    const db = getDatabase();
    return db.transaction(async (tx) => {
      const [entry] = await tx.insert(expenses).values(data).returning();
      return entry;
    });
  }
  
  async approveExpense(id: string, firmId: string, approvedBy: string) {
    const db = getDatabase();
    return db.transaction(async (tx) => {
      await tx.update(expenses).set({ status: 'approved', approvedBy }).where(and(eq(expenses.id, id), eq(expenses.firmId, firmId)));
    });
  }
  
  async deleteExpense(id: string, firmId: string) {
    const db = getDatabase();
    return db.transaction(async (tx) => {
      await tx.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.firmId, firmId)));
    });
  }

  async createTrustTransaction(data: typeof trustTransactions.$inferInsert) {
    const db = getDatabase();
    return db.transaction(async (tx) => {
      const [entry] = await tx.insert(trustTransactions).values(data).returning();
      return entry;
    });
  }
}
