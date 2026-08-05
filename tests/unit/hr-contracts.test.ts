import { describe, expect, it } from "vitest";
import {
  attendanceListSchema,
  attendanceUpsertSchema,
  leaveCreateSchema,
  leaveReviewSchema,
  setBaseSalarySchema,
} from "../../src/shared/contracts/hr";

const userId = "123e4567-e89b-12d3-a456-426614174000";
const leaveRequestId = "123e4567-e89b-12d3-a456-426614174001";

describe("HR input contracts", () => {
  it("validates attendance list and upsert date-only formats", () => {
    expect(attendanceListSchema.safeParse({ userId, date: "2026-08-05" }).success).toBe(true);
    expect(attendanceListSchema.safeParse({ date: "05-08-2026" }).success).toBe(false);

    expect(
      attendanceUpsertSchema.safeParse({
        userId,
        date: "2026-08-05",
        clockIn: "09:00 AM",
        status: "present",
      }).success,
    ).toBe(true);
    expect(
      attendanceUpsertSchema.safeParse({
        userId,
        date: "2026-08-05",
        status: "late",
      }).success,
    ).toBe(false);
    expect(
      attendanceUpsertSchema.safeParse({
        userId,
        date: "2026/08/05",
        status: "present",
      }).success,
    ).toBe(false);
  });

  it("validates leave create types and date-only bounds", () => {
    expect(
      leaveCreateSchema.safeParse({
        type: "annual",
        fromDate: "2026-08-20",
        toDate: "2026-08-22",
        reason: "Family visit",
      }).success,
    ).toBe(true);
    expect(
      leaveCreateSchema.safeParse({
        type: "vacation",
        fromDate: "2026-08-20",
        toDate: "2026-08-22",
      }).success,
    ).toBe(false);
    expect(
      leaveCreateSchema.safeParse({
        type: "sick",
        fromDate: "20-08-2026",
        toDate: "2026-08-22",
      }).success,
    ).toBe(false);
  });

  it("validates leave review statuses (no pending)", () => {
    expect(
      leaveReviewSchema.safeParse({ leaveRequestId, status: "approved" }).success,
    ).toBe(true);
    expect(
      leaveReviewSchema.safeParse({ leaveRequestId, status: "rejected" }).success,
    ).toBe(true);
    expect(
      leaveReviewSchema.safeParse({ leaveRequestId, status: "pending" }).success,
    ).toBe(false);
  });

  it("validates base salary nonnegative and max", () => {
    expect(setBaseSalarySchema.safeParse({ userId, baseSalary: 0 }).success).toBe(true);
    expect(setBaseSalarySchema.safeParse({ userId, baseSalary: 75_000 }).success).toBe(true);
    expect(setBaseSalarySchema.safeParse({ userId, baseSalary: -1 }).success).toBe(false);
    expect(
      setBaseSalarySchema.safeParse({ userId, baseSalary: 100_000_001 }).success,
    ).toBe(false);
  });
});
