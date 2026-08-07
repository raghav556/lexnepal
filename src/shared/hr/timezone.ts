/** Firm HR clock strings use Nepal Standard Time (UTC+05:45, no DST). */
export const HR_TIMEZONE = "Asia/Kathmandu";
export const HR_UTC_OFFSET = "+05:45";

export function formatHrClock(value: Date): string {
  return value.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: HR_TIMEZONE,
  });
}

export function nowHrClockLabel(): string {
  return formatHrClock(new Date());
}

/** Parse a wall-clock string as Asia/Kathmandu on the given YYYY-MM-DD date. */
export function parseHrClock(date: string, clock?: string | null): Date | null {
  if (!clock?.trim()) return null;
  const trimmed = clock.trim();
  if (trimmed.includes("T") && !Number.isNaN(Date.parse(trimmed))) {
    return new Date(trimmed);
  }

  const ampm = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let hours = Number(ampm[1]);
    const minutes = Number(ampm[2]);
    const period = ampm[3]!.toUpperCase();
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return nptDate(date, hours, minutes);
  }

  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    return nptDate(date, Number(match[1]), Number(match[2]));
  }

  const combined = Date.parse(`${date} ${trimmed}`);
  if (!Number.isNaN(combined)) return new Date(combined);
  return null;
}

function nptDate(date: string, hours: number, minutes: number): Date | null {
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  const iso = `${date}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00${HR_UTC_OFFSET}`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}
