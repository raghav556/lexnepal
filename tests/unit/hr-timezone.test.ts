import { describe, expect, it } from "vitest";
import {
  formatHrClock,
  HR_TIMEZONE,
  HR_UTC_OFFSET,
  parseHrClock,
} from "../../src/shared/hr/timezone";

describe("hr timezone", () => {
  it("uses Asia/Kathmandu constants", () => {
    expect(HR_TIMEZONE).toBe("Asia/Kathmandu");
    expect(HR_UTC_OFFSET).toBe("+05:45");
  });

  it("parses AM/PM wall clocks as NPT", () => {
    const morning = parseHrClock("2026-08-07", "10:00 AM");
    expect(morning?.toISOString()).toBe("2026-08-07T04:15:00.000Z");
    const afternoon = parseHrClock("2026-08-07", "2:30 PM");
    expect(afternoon?.toISOString()).toBe("2026-08-07T08:45:00.000Z");
  });

  it("round-trips format through NPT", () => {
    const stored = parseHrClock("2026-08-07", "09:15 AM");
    expect(stored).toBeTruthy();
    expect(formatHrClock(stored!)).toMatch(/9:15/);
  });
});
