/** Appointment calendar dates use Nepal Standard Time (Asia/Kathmandu). */
import {
  NEPAL_TIMEZONE,
  calendarMonthLabel,
  formatDualDate,
  nepalDateOnly,
  type DateLanguage,
} from "@/lib/nepali-calendar";
export const APPOINTMENT_TIMEZONE: "Asia/Kathmandu" = NEPAL_TIMEZONE;

/** Today's firm calendar date as YYYY-MM-DD. */
export function todayIsoInFirmTz(now = new Date()): string {
  return nepalDateOnly(now);
}

/** Add/subtract whole calendar days on a YYYY-MM-DD wall date (no UTC day-shift). */
export function addCalendarDaysIso(dateIso: string, delta: number): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  if (!y || !m || !d) return dateIso;
  const utc = new Date(Date.UTC(y, m - 1, d + delta));
  return utc.toISOString().slice(0, 10);
}

/** Display a YYYY-MM-DD appointment date in firm timezone. */
export function formatAppointmentDate(
  dateIso: string,
  options?: Intl.DateTimeFormatOptions,
  language: DateLanguage = "en",
): string {
  if (options && Object.hasOwn(options, "day") && options.day === undefined && options.month) {
    try {
      return calendarMonthLabel(dateIso, language);
    } catch {
      return formatDualDate(dateIso, language);
    }
  }
  return formatDualDate(dateIso, language);
}

export function isValidMeetingUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const u = new URL(trimmed);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export type MeetingPlatformPreference = "manual" | "google_meet" | "zoom";

/** Paste hints for staff meeting-link dialog — no auto-generated rooms. */
export function meetingPlatformHint(platform?: string | null): {
  label: string;
  placeholder: string;
  description: string;
} {
  switch (platform) {
    case "google_meet":
      return {
        label: "Google Meet",
        placeholder: "https://meet.google.com/…",
        description: "Paste a Google Meet link. Rooms are not auto-created from Settings.",
      };
    case "zoom":
      return {
        label: "Zoom",
        placeholder: "https://zoom.us/j/…",
        description: "Paste a Zoom meeting URL. OAuth auto-create is not connected.",
      };
    default:
      return {
        label: "Meeting",
        placeholder: "https://…",
        description: "Paste any https meeting URL, or leave blank.",
      };
  }
}
