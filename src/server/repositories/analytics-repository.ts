import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { getDatabase } from "../db/client";
import { cases, invoices, clients, timeEntries, leads, expenses, users } from "../db/schema";
import type { AnalyticsDashboardDto } from "@/shared/contracts/analytics";

function money(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function dateKey(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 7);
  if (value instanceof Date) return value.toISOString().slice(0, 7);
  return "";
}

export class AnalyticsRepository {
  static async getDashboardData(firmId: string): Promise<AnalyticsDashboardDto> {
    const db = getDatabase();

    const [
      allCases,
      allInvoices,
      allClients,
      allTimeEntries,
      allLeads,
      allExpenses,
      allUsers,
    ] = await Promise.all([
      db.select().from(cases).where(and(eq(cases.firmId, firmId), isNull(cases.deletedAt))),
      db.select().from(invoices).where(and(eq(invoices.firmId, firmId), isNull(invoices.deletedAt))),
      db.select().from(clients).where(and(eq(clients.firmId, firmId), isNull(clients.deletedAt))),
      db
        .select()
        .from(timeEntries)
        .where(and(eq(timeEntries.firmId, firmId), isNull(timeEntries.deletedAt))),
      db.select().from(leads).where(and(eq(leads.firmId, firmId), isNull(leads.deletedAt))),
      db.select().from(expenses).where(and(eq(expenses.firmId, firmId), isNull(expenses.deletedAt))),
      db.select().from(users).where(and(eq(users.firmId, firmId), isNull(users.deletedAt))),
    ]);

    const paidInvoices = allInvoices.filter((i) => i.status === "paid");
    const totalRevenue = paidInvoices.reduce((s, i) => s + money(i.total), 0);
    const billed = allInvoices
      .filter((i) => i.status !== "cancelled" && i.status !== "draft")
      .reduce((s, i) => s + money(i.total), 0);

    const realizationRate = billed > 0 ? Math.round((totalRevenue / billed) * 100) : 0;
    const totalCases = allCases.length;
    const avgCaseValue = totalCases > 0 ? Math.round(totalRevenue / totalCases) : 0;
    const activeClients = allClients.filter((c) => c.isActive).length;
    const retentionRate =
      allClients.length > 0 ? Math.round((activeClients / allClients.length) * 100) : 0;

    const revenueByPractice: Record<string, number> = {};
    for (const inv of paidInvoices) {
      const matter = allCases.find((c) => c.id === inv.caseId);
      const key = matter?.practiceArea || "Other";
      revenueByPractice[key] = (revenueByPractice[key] || 0) + money(inv.total);
    }

    const hoursByAssociate: Record<string, number> = {};
    for (const t of allTimeEntries) {
      const u = allUsers.find((x) => x.id === t.userId);
      const name = u?.name || "Unknown";
      hoursByAssociate[name] = (hoursByAssociate[name] || 0) + (t.minutes || 0) / 60;
    }
    for (const k of Object.keys(hoursByAssociate)) {
      hoursByAssociate[k] = Math.round(hoursByAssociate[k]! * 10) / 10;
    }

    const monthMap: Record<string, number> = {};
    for (const inv of paidInvoices) {
      const key = dateKey(inv.paidDate) || dateKey(inv.issuedDate);
      if (!key) continue;
      monthMap[key] = (monthMap[key] || 0) + money(inv.total);
    }
    const monthlyRevenue = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, revenue]) => ({ month, revenue }));

    const casesByStatus: Record<string, number> = {};
    for (const c of allCases) {
      const status = c.status || "open";
      casesByStatus[status] = (casesByStatus[status] || 0) + 1;
    }

    const outstanding = allInvoices
      .filter((i) => i.status === "sent" || i.status === "overdue")
      .reduce((s, i) => s + money(i.total), 0);
    const totalExpenses = allExpenses
      .filter((e) => e.status === "approved")
      .reduce((s, e) => s + money(e.amount), 0);

    return {
      totalRevenue,
      realizationRate,
      avgCaseValue,
      totalCases,
      totalClients: activeClients,
      retentionRate,
      outstanding,
      totalExpenses,
      openLeads: allLeads.filter((l) => l.status === "new" || l.status === "contacted").length,
      revenueByPractice,
      hoursByAssociate,
      monthlyRevenue,
      casesByStatus,
      kpis: {
        activeCases: allCases.filter((c) => c.status === "active").length,
        totalClients: activeClients,
        revenue: totalRevenue,
        outstanding,
        totalExpenses,
      },
    };
  }
}
