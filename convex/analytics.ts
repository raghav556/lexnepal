import { query } from "./_generated/server";
import { requireRole } from "./lib/roles";

export const getDashboardData = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin", "partner"]);

    const cases = await ctx.db.query("cases").collect();
    const invoices = await ctx.db.query("invoices").collect();
    const clients = await ctx.db.query("clients").collect();
    const timeEntries = await ctx.db.query("timeEntries").collect();
    const leads = await ctx.db.query("leads").collect();
    const expenses = await ctx.db.query("expenses").collect();
    const users = await ctx.db.query("users").collect();

    const paidInvoices = invoices.filter((i) => i.status === "paid");
    const totalRevenue = paidInvoices.reduce((s, i) => s + i.total, 0);
    const billed = invoices
      .filter((i) => i.status !== "cancelled" && i.status !== "draft")
      .reduce((s, i) => s + i.total, 0);
    const realizationRate = billed > 0 ? Math.round((totalRevenue / billed) * 100) : 0;
    const totalCases = cases.length;
    const avgCaseValue = totalCases > 0 ? Math.round(totalRevenue / totalCases) : 0;

    const revenueByPractice: Record<string, number> = {};
    for (const inv of paidInvoices) {
      const matter = cases.find((c) => c._id === inv.caseId);
      const key = matter?.practiceArea || "Other";
      revenueByPractice[key] = (revenueByPractice[key] || 0) + inv.total;
    }

    const hoursByAssociate: Record<string, number> = {};
    for (const t of timeEntries) {
      const u = users.find((x) => x._id === t.userId);
      const name = u?.name || "Unknown";
      hoursByAssociate[name] = (hoursByAssociate[name] || 0) + t.minutes / 60;
    }
    for (const k of Object.keys(hoursByAssociate)) {
      hoursByAssociate[k] = Math.round(hoursByAssociate[k] * 10) / 10;
    }

    const monthMap: Record<string, number> = {};
    for (const inv of paidInvoices) {
      const key = (inv.paidDate || inv.issuedDate || "").slice(0, 7);
      if (!key) continue;
      monthMap[key] = (monthMap[key] || 0) + inv.total;
    }
    const monthlyRevenue = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, revenue]) => ({ month, revenue }));

    const casesByStatus: Record<string, number> = {};
    for (const c of cases) {
      casesByStatus[c.status] = (casesByStatus[c.status] || 0) + 1;
    }

    const outstanding = invoices
      .filter((i) => i.status === "sent" || i.status === "overdue")
      .reduce((s, i) => s + i.total, 0);
    const totalExpenses = expenses
      .filter((e) => e.status === "approved")
      .reduce((s, e) => s + e.amount, 0);

    return {
      totalRevenue,
      realizationRate,
      avgCaseValue,
      totalCases,
      totalClients: clients.filter((c) => c.isActive).length,
      outstanding,
      totalExpenses,
      openLeads: leads.filter((l) => l.status === "new" || l.status === "contacted").length,
      revenueByPractice,
      hoursByAssociate,
      monthlyRevenue,
      casesByStatus,
      kpis: {
        activeCases: cases.filter((c) => c.status === "active").length,
        totalClients: clients.filter((c) => c.isActive).length,
        revenue: totalRevenue,
        outstanding,
        totalExpenses,
      },
    };
  },
});
