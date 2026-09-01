import { describe, expect, it } from "vitest";
import { analyticsDashboardSchema } from "../../src/shared/contracts/analytics";

const dashboardFixture = {
  activeCases: 7,
  totalCases: 12,
  activeClients: 8,
  activeStaff: 5,
  openLeads: 3,
  openTasks: 6,
  upcomingHearings: 2,
  mattersByPractice: { Corporate: 7, Litigation: 5 },
  casesByStatus: { active: 7, closed: 5 },
  tasksByStatus: { todo: 4, in_progress: 2, done: 8 },
  hearingsByMonth: [
    { month: "2026-09", count: 2 },
    { month: "2026-10", count: 1 },
  ],
};

describe("Analytics response contracts", () => {
  it("accepts a representative operational dashboard fixture", () => {
    const parsed = analyticsDashboardSchema.safeParse(dashboardFixture);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.activeCases).toBe(7);
      expect(parsed.data.hearingsByMonth).toHaveLength(2);
    }
  });

  it("rejects missing operational fields or wrong types", () => {
    const { activeCases, ...withoutActiveCases } = dashboardFixture;
    expect(activeCases).toBe(7);
    expect(analyticsDashboardSchema.safeParse(withoutActiveCases).success).toBe(false);
    expect(
      analyticsDashboardSchema.safeParse({ ...dashboardFixture, openTasks: "six" }).success,
    ).toBe(false);
    expect(
      analyticsDashboardSchema.safeParse({
        ...dashboardFixture,
        hearingsByMonth: [{ month: "2026-09" }],
      }).success,
    ).toBe(false);
  });
});
