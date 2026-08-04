import { eq } from "drizzle-orm";
import { getDatabase } from "../db/client";
import { cases, invoices, clients, timeEntries, leads, expenses, users } from "../db/schema";

export class AnalyticsRepository {
  static async getDashboardData(firmId: string) {
    const db = await getDatabase();

    const [
      allCases,
      allInvoices,
      allClients,
      allTimeEntries,
      allLeads,
      allExpenses,
      allUsers,
    ] = await Promise.all([
      db.select().from(cases).where(eq(cases.firmId, firmId)),
      db.select().from(invoices).where(eq(invoices.firmId, firmId)),
      db.select().from(clients).where(eq(clients.firmId, firmId)),
      db.select().from(timeEntries).where(eq(timeEntries.firmId, firmId)),
      db.select().from(leads).where(eq(leads.firmId, firmId)),
      db.select().from(expenses).where(eq(expenses.firmId, firmId)),
      db.select().from(users).where(eq(users.firmId, firmId)),
    ]);

    const paidInvoices = allInvoices.filter((i) => i.status === "paid");
    const totalRevenue = paidInvoices.reduce((s, i) => s + Number(i.total || 0), 0);
    const billed = allInvoices
      .filter((i) => i.status !== "cancelled" && i.status !== "draft")
      .reduce((s, i) => s + Number(i.total || 0), 0);
    
    const realizationRate = billed > 0 ? Math.round((totalRevenue / billed) * 100) : 0;
    const totalCases = allCases.length;
    const avgCaseValue = totalCases > 0 ? Math.round(totalRevenue / totalCases) : 0;

    const revenueByPractice: Record<string, number> = {};
    for (const inv of paidInvoices) {
      const matter = allCases.find((c) => c.id === inv.caseId);
      const key = matter?.practiceArea || "Other";
      revenueByPractice[key] = (revenueByPractice[key] || 0) + Number(inv.total || 0);
    }

    const hoursByAssociate: Record<string, number> = {};
    for (const t of allTimeEntries) {
      const u = allUsers.find((x) => x.id === t.userId);
      const name = u?.name || "Unknown";
      hoursByAssociate[name] = (hoursByAssociate[name] || 0) + (t.minutes || 0) / 60;
    }
    for (const k of Object.keys(hoursByAssociate)) {
      hoursByAssociate[k] = Math.round(hoursByAssociate[k] * 10) / 10;
    }

    const monthMap: Record<string, number> = {};
    for (const inv of paidInvoices) {
      // Check if dates exist, they are strings or Dates in postgres?
      // Assuming strings for migration parity, or Date objects. If Date, use .toISOString()
      let dateStr = "";
      if (inv.paidDate) {
        dateStr = typeof inv.paidDate === "string" ? inv.paidDate : (inv.paidDate as Date).toISOString();
      } else if (inv.issuedDate) {
        dateStr = typeof inv.issuedDate === "string" ? inv.issuedDate : (inv.issuedDate as Date).toISOString();
      }

      const key = dateStr.slice(0, 7);
      if (!key) continue;
      monthMap[key] = (monthMap[key] || 0) + Number(inv.total || 0);
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
      .reduce((s, i) => s + Number(i.total || 0), 0);
    const totalExpenses = allExpenses
      .filter((e) => e.status === "approved")
      .reduce((s, e) => s + Number(e.amount || 0), 0);

    return {
      totalRevenue,
      realizationRate,
      avgCaseValue,
      totalCases,
      totalClients: allClients.filter((c) => c.isActive).length,
      outstanding,
      totalExpenses,
      openLeads: allLeads.filter((l) => l.status === "new" || l.status === "contacted").length,
      revenueByPractice,
      hoursByAssociate,
      monthlyRevenue,
      casesByStatus,
      kpis: {
        activeCases: allCases.filter((c) => c.status === "active").length,
        totalClients: allClients.filter((c) => c.isActive).length,
        revenue: totalRevenue,
        outstanding,
        totalExpenses,
      },
    };
  }
}
