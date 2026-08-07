import { describe, expect, it } from "vitest";
import {
  countLeaveChargeDays,
  eachDateInclusive,
  leaveChargeDays,
} from "../../src/shared/hr/leave-days";

describe("leave charge days", () => {
  it("lists inclusive dates", () => {
    expect(eachDateInclusive("2026-08-10", "2026-08-12")).toEqual([
      "2026-08-10",
      "2026-08-11",
      "2026-08-12",
    ]);
  });

  it("skips weekends when configured", () => {
    // Fri 7 Aug 2026 – Mon 10 Aug 2026
    expect(leaveChargeDays("2026-08-07", "2026-08-10", { skipWeekends: true })).toEqual([
      "2026-08-07",
      "2026-08-10",
    ]);
    expect(countLeaveChargeDays("2026-08-07", "2026-08-10", { skipWeekends: true })).toBe(2);
    expect(countLeaveChargeDays("2026-08-07", "2026-08-10", { skipWeekends: false })).toBe(4);
  });
});
