import {
  leaveCreateSchema,
  type AttendanceDto,
  type LeaveCreateInput,
  type LeaveRequestDto,
} from "@/shared/contracts/hr";
import { HR_TIMEZONE, formatHrClock, parseHrClock } from "@/shared/hr/timezone";
import { bsToGregorian } from "@/lib/nepali-calendar";

export const HR_LEAVE_TYPES = {
  annual: "Annual leave",
  sick: "Sick leave",
  maternity: "Maternity leave",
  paternity: "Paternity leave",
  unpaid: "Unpaid leave",
} as const;
export const HR_ATTENDANCE_STATUSES = {
  present: "Present",
  absent: "Absent",
  half_day: "Half day",
  leave: "On leave",
} as const;
export const HR_LEAVE_STATUSES = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
} as const;

export function kathmanduDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: HR_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (key: string) => parts.find((p) => p.type === key)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function validHrDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === date;
}

export function shiftHrDate(date: string, days: number): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function supportsHrDualDate(date: string): boolean {
  if (!validHrDate(date)) return false;
  const localDate = new Date(`${date}T12:00:00`);
  // The shared table covers BS 2000–2090; conversion outside it is unsupported.
  const start = bsToGregorian({ year: 2000, month: 1, day: 1 });
  const end = bsToGregorian({ year: 2091, month: 1, day: 1 });
  return localDate >= start && localDate < end;
}

function recordedClock(date: string, value?: string | null): Date | null {
  if (!validHrDate(date) || !value) return null;
  const twelve = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelve && (Number(twelve[1]) < 1 || Number(twelve[1]) > 12 || Number(twelve[2]) > 59))
    return null;
  const parsed = parseHrClock(date, value);
  return parsed && Number.isFinite(parsed.valueOf()) && kathmanduDate(parsed) === date
    ? parsed
    : null;
}

export function recordedDuration(
  row?: Pick<AttendanceDto, "date" | "clockIn" | "clockOut">,
): number | null {
  if (!row) return null;
  const start = recordedClock(row.date, row.clockIn),
    end = recordedClock(row.date, row.clockOut);
  return start && end && end > start ? Math.round((end.valueOf() - start.valueOf()) / 60000) : null;
}

export function hrDuration(minutes: number): string {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function hrClock(date: string, value?: string | null): string {
  const parsed = recordedClock(date, value);
  return parsed ? formatHrClock(parsed) : "—";
}

export function attendanceState(row: AttendanceDto | undefined, now = new Date()) {
  const today = kathmanduDate(now);
  const start = row ? recordedClock(row.date, row.clockIn) : null;
  const minutes = recordedDuration(row);
  const validStart = Boolean(start && start <= now);
  return {
    minutes,
    canClockIn:
      !row || (row.date === today && row.status === "absent" && !row.clockIn && !row.clockOut),
    canClockOut: Boolean(
      row?.date === today && row.status === "present" && validStart && !row.clockOut,
    ),
    label: !row
      ? "Not recorded"
      : minutes !== null
        ? "Day closed"
        : row.status === "present" && validStart && !row.clockOut
          ? "Clocked in"
          : HR_ATTENDANCE_STATUSES[row.status],
    hours:
      minutes !== null
        ? hrDuration(minutes)
        : row?.status === "present" && validStart && !row.clockOut
          ? "In progress"
          : "—",
  };
}

export function daysRecorded(rows: AttendanceDto[], today: string): number {
  return new Set(
    rows
      .filter((r) => validHrDate(r.date) && r.date >= `${today.slice(0, 7)}-01` && r.date <= today)
      .map((r) => r.date),
  ).size;
}

export function recentHrWeek(today: string): string[] {
  // Seven calendar dates ending today; missing dates remain explicitly unrecorded.
  return Array.from({ length: 7 }, (_, i) => shiftHrDate(today, i - 6));
}

export function upcomingHrLeaves(rows: LeaveRequestDto[], today: string): LeaveRequestDto[] {
  return rows
    .filter(
      (r) =>
        r.status !== "rejected" &&
        validHrDate(r.fromDate) &&
        validHrDate(r.toDate) &&
        r.toDate >= today,
    )
    .sort((a, b) => a.fromDate.localeCompare(b.fromDate));
}

export function validateHrLeave(
  input: LeaveCreateInput,
): { data: LeaveCreateInput; error?: never } | { error: string; data?: never } {
  const result = leaveCreateSchema.safeParse(input);
  if (!result.success)
    return { error: result.error.issues[0]?.message ?? "Check the leave fields." };
  if (!validHrDate(input.fromDate) || !validHrDate(input.toDate))
    return { error: "Choose valid From and To dates." };
  if (input.toDate < input.fromDate) return { error: "To date must be on or after From date." };
  return { data: result.data };
}
