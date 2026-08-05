import { describe, expect, it } from "vitest";
import {
  PERFORMANCE_SMOKE_BUDGETS_MS,
  PERFORMANCE_SMOKE_VOLUME,
  performanceSmokeBudgetsSchema,
  performanceSmokeResultSchema,
  performanceSmokeVolumeSchema,
} from "../../src/shared/contracts/performance";

describe("Performance smoke contracts", () => {
  it("keeps representative volume within smoke bounds", () => {
    const parsed = performanceSmokeVolumeSchema.safeParse(PERFORMANCE_SMOKE_VOLUME);
    expect(parsed.success).toBe(true);
    expect(PERFORMANCE_SMOKE_VOLUME.documents).toBeGreaterThanOrEqual(
      PERFORMANCE_SMOKE_VOLUME.cases,
    );
  });

  it("requires positive per-endpoint budgets under 30s", () => {
    expect(performanceSmokeBudgetsSchema.safeParse(PERFORMANCE_SMOKE_BUDGETS_MS).success).toBe(
      true,
    );
    expect(
      performanceSmokeBudgetsSchema.safeParse({
        ...PERFORMANCE_SMOKE_BUDGETS_MS,
        documentsSearch: 0,
      }).success,
    ).toBe(false);
    expect(
      performanceSmokeBudgetsSchema.safeParse({
        ...PERFORMANCE_SMOKE_BUDGETS_MS,
        casesList: 60_000,
      }).success,
    ).toBe(false);
  });

  it("validates smoke result rows", () => {
    expect(
      performanceSmokeResultSchema.safeParse({
        name: "documentsSearch",
        ms: 120.5,
        budgetMs: 2000,
        passed: true,
        rows: 12,
      }).success,
    ).toBe(true);
    expect(
      performanceSmokeResultSchema.safeParse({
        name: "documentsSearch",
        ms: -1,
        budgetMs: 2000,
        passed: false,
      }).success,
    ).toBe(false);
  });
});
