/**
 * BS calendar helpers — prefer nepali-calendar for accurate conversions.
 * Kept for backward-compatible imports used across staff pages.
 */
import { gregorianToBs, formatBs, toNepaliDigits } from "./nepali-calendar.ts";

export {
  gregorianToBs,
  formatBs,
  formatDualDate,
  bsToGregorian,
  todayBs,
} from "./nepali-calendar.ts";

export function toNepaliNumeral(num: number | string): string {
  return toNepaliDigits(num);
}

/** Convert an AD date string to a display BS date using nepali-calendar. */
export function getBSDate(adDateString: string, inNepali: boolean = false): string {
  if (!adDateString) return "";
  try {
    return formatBs(gregorianToBs(adDateString), inNepali ? "ne" : "en");
  } catch {
    return `${adDateString} A.D. (B.S. unavailable)`;
  }
}
