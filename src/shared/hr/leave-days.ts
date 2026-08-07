import type { LeaveType } from "@/shared/contracts/hr";

/** Inclusive YYYY-MM-DD range as date strings. */
export function eachDateInclusive(fromDate: string, toDate: string): string[] {
  if (toDate < fromDate) return [];
  const out: string[] = [];
  const cursor = new Date(`${fromDate}T12:00:00Z`);
  const end = new Date(`${toDate}T12:00:00Z`);
  while (cursor.getTime() <= end.getTime()) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

export function isWeekendIsoDate(isoDate: string): boolean {
  const day = new Date(`${isoDate}T12:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

export function leaveChargeDays(
  fromDate: string,
  toDate: string,
  options: { skipWeekends: boolean },
): string[] {
  const dates = eachDateInclusive(fromDate, toDate);
  if (!options.skipWeekends) return dates;
  return dates.filter((d) => !isWeekendIsoDate(d));
}

export function countLeaveChargeDays(
  fromDate: string,
  toDate: string,
  options: { skipWeekends: boolean },
): number {
  return leaveChargeDays(fromDate, toDate, options).length;
}

export const BALANCED_LEAVE_TYPES: readonly LeaveType[] = [
  "annual",
  "sick",
  "maternity",
  "paternity",
] as const;

export function isBalanceTrackedType(type: LeaveType): boolean {
  return type !== "unpaid";
}
