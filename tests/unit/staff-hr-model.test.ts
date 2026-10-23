import { describe, expect, it } from "vitest";
import {
  attendanceState,
  daysRecorded,
  hrClock,
  hrDuration,
  HR_ATTENDANCE_STATUSES,
  HR_LEAVE_STATUSES,
  HR_LEAVE_TYPES,
  kathmanduDate,
  recentHrWeek,
  recordedDuration,
  shiftHrDate,
  upcomingHrLeaves,
  validateHrLeave,
  validHrDate,
  supportsHrDualDate,
} from "../../src/views/staff/staff-hr-model";
import type { AttendanceDto, LeaveRequestDto } from "../../src/shared/contracts/hr";

const now = new Date("2026-10-20T08:15:00Z");
const row = (extra: Partial<AttendanceDto> = {}): AttendanceDto => ({
  id: "record",
  _id: "record",
  userId: "staff",
  firmId: "firm",
  date: "2026-10-20",
  status: "present",
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
  ...extra,
});
const leave = (extra: Partial<LeaveRequestDto> = {}): LeaveRequestDto => ({
  id: "leave",
  _id: "leave",
  userId: "staff",
  firmId: "firm",
  type: "annual",
  status: "pending",
  fromDate: "2026-10-21",
  toDate: "2026-10-22",
  reason: null,
  reviewedBy: null,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
  ...extra,
});

describe("Staff HR Kathmandu dates", () => {
  it("only displays BS dates supported by the existing conversion table", () => {
    expect(supportsHrDualDate("2026-10-20")).toBe(true);
    expect(supportsHrDualDate("1940-01-01")).toBe(false);
    expect(supportsHrDualDate("2040-01-01")).toBe(false);
    expect(supportsHrDualDate("2026-02-30")).toBe(false);
  });
  it.each([
    ["2026-10-19T18:14:59Z", "2026-10-19"],
    ["2026-10-19T18:15:00Z", "2026-10-20"],
    ["2026-12-31T18:15:00Z", "2027-01-01"],
  ])("uses the actual Nepal boundary for %s", (date, expected) =>
    expect(kathmanduDate(new Date(date))).toBe(expected),
  );
  it("shifts calendar dates safely across month and leap-year boundaries", () => {
    expect(shiftHrDate("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftHrDate("2028-03-01", -1)).toBe("2028-02-29");
  });
  it("rejects normalized impossible dates", () => {
    expect(validHrDate("2026-02-30")).toBe(false);
    expect(validHrDate("2026-13-01")).toBe(false);
    expect(validHrDate("2028-02-29")).toBe(true);
  });
  it("produces seven actual calendar dates ending today", () =>
    expect(recentHrWeek("2026-01-03")).toEqual([
      "2025-12-28",
      "2025-12-29",
      "2025-12-30",
      "2025-12-31",
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
    ]));
});
describe("Staff attendance states and recorded hours", () => {
  it("has no invented duration before clock-in", () => {
    expect(attendanceState(undefined, now)).toMatchObject({
      canClockIn: true,
      canClockOut: false,
      hours: "—",
      minutes: null,
    });
  });
  it("moves from not recorded to open to completed without a live total", () => {
    const open = row({ clockIn: "09:00 AM" });
    expect(attendanceState(open, now)).toMatchObject({
      canClockIn: false,
      canClockOut: true,
      hours: "In progress",
    });
    expect(attendanceState({ ...open, clockOut: "01:15 PM" }, now)).toMatchObject({
      canClockIn: false,
      canClockOut: false,
      hours: "4h 15m",
      minutes: 255,
    });
  });
  it.each(["leave", "half_day"] as const)("does not overwrite a %s record", (status) => {
    expect(attendanceState(row({ status }), now)).toMatchObject({
      canClockIn: false,
      canClockOut: false,
    });
  });
  it("allows an absent record without clocks to be clocked in", () =>
    expect(attendanceState(row({ status: "absent" }), now).canClockIn).toBe(true));
  it("does not erase clocks on an absent record", () =>
    expect(attendanceState(row({ status: "absent", clockIn: "09:00 AM" }), now).canClockIn).toBe(
      false,
    ));
  it("does not clock out old, invalid or future starts", () => {
    for (const entry of [
      row({ date: "2026-10-19", clockIn: "09:00 AM" }),
      row({ clockIn: "invalid" }),
      row({ clockIn: "11:00 PM" }),
    ])
      expect(attendanceState(entry, now).canClockOut).toBe(false);
  });
  it.each([
    ["09:00 AM", undefined],
    ["09:00 AM", "09:00 AM"],
    ["05:00 PM", "09:00 AM"],
    ["00:30 AM", "01:30 AM"],
    ["99:00", "10:00"],
    ["09:00 AM", "invalid"],
  ])("rejects missing/invalid duration %s to %s", (clockIn, clockOut) =>
    expect(recordedDuration(row({ clockIn, clockOut }))).toBeNull(),
  );
  it("keeps the canonical NPT clock parser and display", () => {
    expect(recordedDuration(row({ clockIn: "09:00", clockOut: "17:30" }))).toBe(510);
    expect(hrClock("2026-10-20", "bad")).toBe("—");
    expect(hrDuration(60)).toBe("1h 0m");
  });
  it("counts unique returned calendar dates this month through today, including absent records", () =>
    expect(
      daysRecorded(
        [
          row(),
          row(),
          row({ date: "2026-10-19", status: "absent" }),
          row({ date: "2026-10-21" }),
          row({ date: "2026-09-30" }),
        ],
        "2026-10-20",
      ),
    ).toBe(2));
  it("keeps known zero distinct from unavailable hours", () => {
    expect(daysRecorded([], "2026-10-20")).toBe(0);
    expect(recordedDuration()).toBeNull();
  });
});
describe("Staff leave contracts and history", () => {
  it("uses only real leave and attendance states", () => {
    expect(Object.keys(HR_LEAVE_TYPES)).toEqual([
      "annual",
      "sick",
      "maternity",
      "paternity",
      "unpaid",
    ]);
    expect(Object.keys(HR_LEAVE_STATUSES)).toEqual(["pending", "approved", "rejected"]);
    expect(Object.keys(HR_ATTENDANCE_STATUSES)).toEqual(["present", "absent", "half_day", "leave"]);
  });
  it("accepts the existing schema and trims an optional reason", () =>
    expect(
      validateHrLeave({
        type: "unpaid",
        fromDate: "2026-10-20",
        toDate: "2026-10-20",
        reason: " Test ",
      }).data?.reason,
    ).toBe("Test"));
  it.each([
    { fromDate: "2026-10-22", toDate: "2026-10-21" },
    { fromDate: "2026-02-30", toDate: "2026-03-01" },
    { fromDate: "", toDate: "2026-03-01" },
  ])("rejects invalid date range %o", (dates) =>
    expect(validateHrLeave({ type: "annual", ...dates }).error).toBeTruthy(),
  );
  it("rejects an overlong reason through the actual Zod contract", () =>
    expect(
      validateHrLeave({
        type: "sick",
        fromDate: "2026-10-20",
        toDate: "2026-10-20",
        reason: "x".repeat(2001),
      }).error,
    ).toBeTruthy());
  it("shows only real pending/approved upcoming requests", () =>
    expect(
      upcomingHrLeaves(
        [
          leave(),
          leave({ id: "rejected", status: "rejected" }),
          leave({ id: "past", toDate: "2026-10-19" }),
          leave({
            id: "ongoing",
            status: "approved",
            fromDate: "2026-10-18",
            toDate: "2026-10-20",
          }),
        ],
        "2026-10-20",
      ).map((r) => r.id),
    ).toEqual(["ongoing", "leave"]));
});
