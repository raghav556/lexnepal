/** Appointment calendar dates use Nepal Standard Time (Asia/Kathmandu). */
export const APPOINTMENT_TIMEZONE = "Asia/Kathmandu";

/** Today's firm calendar date as YYYY-MM-DD. */
export function todayIsoInFirmTz(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APPOINTMENT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
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
): string {
  const d = new Date(`${dateIso}T12:00:00+05:45`);
  if (Number.isNaN(d.valueOf())) return dateIso;
  return d.toLocaleDateString("en-US", {
    timeZone: APPOINTMENT_TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  });
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
