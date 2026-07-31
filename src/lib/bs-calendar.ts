/**
 * BS calendar helpers — prefer nepali-calendar for accurate conversions.
 * Kept for backward-compatible imports used across staff pages.
 */
import { gregorianToBs, formatBs } from "./nepali-calendar.ts";

export { gregorianToBs, formatBs, formatDualDate, bsToGregorian, todayBs } from "./nepali-calendar.ts";

const NEPALI_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];

export function toNepaliNumeral(num: number | string): string {
  return num.toString().split("").map((digit) => {
    if (/[0-9]/.test(digit)) return NEPALI_DIGITS[parseInt(digit, 10)];
    return digit;
  }).join("");
}

/** Convert an AD date string to a display BS date using nepali-calendar. */
export function getBSDate(adDateString: string, inNepali: boolean = false): string {
  if (!adDateString) return "";
  try {
    const d = new Date(adDateString);
    if (isNaN(d.getTime())) return adDateString;
    const bs = gregorianToBs(d);
    const formatted = formatBs(bs);
    if (!inNepali) return formatted;
    return formatted
      .split("")
      .map((ch) => (/[0-9]/.test(ch) ? NEPALI_DIGITS[parseInt(ch, 10)] : ch))
      .join("");
  } catch {
    return adDateString;
  }
}
