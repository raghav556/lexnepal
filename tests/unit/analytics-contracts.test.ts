import { describe, expect, it } from "vitest";
import { analyticsDashboardSchema } from "../../src/shared/contracts/analytics";

const dashboardFixture = {
  totalRevenue: 1_130_000,
  realizationRate: 0.82,
  avgCaseValue: 250_000,
  totalCases: 12,
  totalClients: 8,
  retentionRate: 0.9,
  outstanding: 45_000,
  totalExpenses: 12_500,
  openLeads: 3,
  revenueByPractice: { Corporate: 700_000, Litigation: 430_000 },
  hoursByAssociate: { "Ada Lovelace": 120 },
  monthlyRevenue: [
    { month: "2026-07", revenue: 500_000 },
    { month: "2026-08", revenue: 630_000 },
  ],
  casesByStatus: { open: 7, closed: 5 },
  kpis: {
    activeCases: 7,
    totalClients: 8,
    revenue: 1_130_000,
    outstanding: 45_000,
    totalExpenses: 12_500,
  },
};

describe("Analytics response contracts", () => {
  it("accepts a representative dashboard fixture", () => {
    const parsed = analyticsDashboardSchema.safeParse(dashboardFixture);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.kpis.activeCases).toBe(7);
      expect(parsed.data.monthlyRevenue).toHaveLength(2);
    }
  });

  it("rejects missing KPI fields or wrong types", () => {
    const { kpis, ...withoutKpis } = dashboardFixture;
    expect(analyticsDashboardSchema.safeParse(withoutKpis).success).toBe(false);

    expect(
      analyticsDashboardSchema.safeParse({
        ...dashboardFixture,
        kpis: { ...kpis, activeCases: "seven" },
      }).success,
    ).toBe(false);

    expect(
      analyticsDashboardSchema.safeParse({
        ...dashboardFixture,
        monthlyRevenue: [{ month: "2026-08" }],
      }).success,
    ).toBe(false);
  });
});
