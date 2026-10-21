/**
 * BS (Bikram Sambat) <-> Gregorian calendar conversion utility.
 * Covers BS years 2000-2090; one canonical converter for all portals.
 * Month data: subeshb1/Nepali-Date, revision 2183c30ada24a7fe678a24d58a5aa61ce8cdfa85.
 * See doc/migration/architecture-decisions/0022-nepali-date-system.md for policy,
 * independent government fixtures and the inherited data's verification limits.
 *
 * Month-data license: MIT, Copyright (c) 2020 Subesh Bhandari.
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

const BS_MONTH_DAYS: Record<number, number[]> = {
  2000: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2001: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2002: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2003: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2004: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2005: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2006: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2007: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2008: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2009: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2010: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2011: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2012: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2013: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2014: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2015: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2016: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2017: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2018: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2019: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2020: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2021: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2022: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2023: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2024: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2025: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2026: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2027: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2028: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2029: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2030: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2031: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2032: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2033: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2034: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2035: [30, 32, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2036: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2037: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2038: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2039: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2040: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2041: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2042: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2043: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2044: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2045: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2046: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2047: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2048: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2049: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2050: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2051: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2052: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2053: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2054: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2055: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2056: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2057: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2058: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2059: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2060: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2061: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2062: [30, 32, 31, 32, 31, 31, 29, 30, 29, 30, 29, 31],
  2063: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2064: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2065: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2066: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2067: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2068: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2069: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2070: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2071: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2072: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2073: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2074: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2075: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2077: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2081: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2082: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2083: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2084: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2085: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2086: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2087: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
  2088: [30, 31, 32, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2089: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2090: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
};

export const BS_START_YEAR = 2000;
export const BS_END_YEAR = 2090;
export const NEPAL_TIMEZONE = "Asia/Kathmandu";
const DAY_MS = 86400000;
const AD_START_DAY = Date.UTC(1943, 3, 14) / DAY_MS;
const TOTAL_DAYS = Object.values(BS_MONTH_DAYS).reduce((sum, months) => sum + months.reduce((a, b) => a + b, 0), 0);
export const AD_MIN_DATE = "1943-04-14";
export const AD_MAX_DATE = new Date((AD_START_DAY + TOTAL_DAYS - 1) * DAY_MS).toISOString().slice(0, 10);

export type BsDate = { year: number; month: number; day: number };

/** Validate a civil Gregorian date without browser-local parsing or rollover. */
export function isIsoDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

/** Date-only strings retain their civil day. Instants use the Nepal business day.
 * Offset-free date-times are deliberately rejected: their source zone is unknown.
 */
export function nepalDateOnly(value: Date | string = new Date()): string {
  if (typeof value === "string" && isIsoDateOnly(value)) return value;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && !isIsoDateOnly(value.slice(0, 10))) {
    throw new RangeError("Invalid Gregorian timestamp date.");
  }
  if (typeof value === "string" && !/T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    throw new RangeError("Use a valid YYYY-MM-DD date or a timestamp with an explicit timezone.");
  }
  const instant = typeof value === "string" ? new Date(value) : value;
  if (!Number.isFinite(instant.valueOf())) throw new RangeError("Invalid Gregorian date.");
  return new Intl.DateTimeFormat("en-CA", { timeZone: NEPAL_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit", numberingSystem: "latn" }).format(instant);
}

export function bsMonthLength(year: number, month: number): number {
  if (!Number.isInteger(year) || year < BS_START_YEAR || year > BS_END_YEAR) throw new RangeError(`Supported B.S. years: ${BS_START_YEAR}–${BS_END_YEAR}.`);
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new RangeError("B.S. month must be between 1 and 12.");
  return BS_MONTH_DAYS[year][month - 1];
}

export function validateBsDate(bs: BsDate): void {
  const lastDay = bsMonthLength(bs.year, bs.month);
  if (!Number.isInteger(bs.day) || bs.day < 1 || bs.day > lastDay) throw new RangeError(`This B.S. month has ${lastDay} days.`);
}

export function gregorianToBs(value: Date | string): BsDate {
  const civil = nepalDateOnly(value);
  let remaining = (Date.parse(`${civil}T00:00:00Z`) / DAY_MS) - AD_START_DAY;
  if (remaining < 0 || remaining >= TOTAL_DAYS) throw new RangeError(`B.S. conversion supports A.D. ${AD_MIN_DATE} through ${AD_MAX_DATE}.`);
  for (let year = BS_START_YEAR; year <= BS_END_YEAR; year++) {
    for (let month = 1; month <= 12; month++) {
      const days = BS_MONTH_DAYS[year][month - 1];
      if (remaining < days) return { year, month, day: remaining + 1 };
      remaining -= days;
    }
  }
  throw new RangeError("Unsupported calendar date.");
}

/** Compatibility Date result is UTC midnight; use bsToIsoDate for storage/forms. */
export function bsToGregorian(bs: BsDate): Date {
  validateBsDate(bs);
  let days = 0;
  for (let year = BS_START_YEAR; year < bs.year; year++) days += BS_MONTH_DAYS[year].reduce((a, b) => a + b, 0);
  for (let month = 1; month < bs.month; month++) days += BS_MONTH_DAYS[bs.year][month - 1];
  return new Date((AD_START_DAY + days + bs.day - 1) * DAY_MS);
}

export function bsToIsoDate(bs: BsDate): string {
  return bsToGregorian(bs).toISOString().slice(0, 10);
}

export function supportsBsConversion(value: string): boolean {
  try { gregorianToBs(value); return true; } catch { return false; }
}

const BS_MONTHS_EN = [
  "Baisakh",
  "Jestha",
  "Ashadh",
  "Shrawan",
  "Bhadra",
  "Ashwin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
];
const BS_MONTHS_NE = [
  "बैशाख",
  "जेठ",
  "असार",
  "श्रावण",
  "भदौ",
  "असोज",
  "कार्तिक",
  "मंसिर",
  "पुष",
  "माघ",
  "फागुन",
  "चैत",
];
const NEPALI_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];

export function toNepaliDigits(num: number | string): string {
  return String(num).replace(/\d/g, (d) => NEPALI_DIGITS[Number(d)] ?? d);
}

export function formatBs(bs: BsDate, lang: "ne" | "en" = "en"): string {
  validateBsDate(bs);
  if (lang === "ne") {
    const month = BS_MONTHS_NE[bs.month - 1] || "";
    return `${toNepaliDigits(bs.day)} ${month} ${toNepaliDigits(bs.year)}`;
  }
  return `${bs.day} ${BS_MONTHS_EN[bs.month - 1]} ${bs.year}`;
}

export function bsToString(bs: BsDate): string {
  validateBsDate(bs);
  return `${bs.year}-${String(bs.month).padStart(2, "0")}-${String(bs.day).padStart(2, "0")}`;
}

export function parseBsString(str: string): BsDate {
  const normalized = str.trim().replace(/[०-९]/g, (digit) => String(NEPALI_DIGITS.indexOf(digit)));
  const match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(normalized);
  if (!match) throw new RangeError("Enter a B.S. date as YYYY-MM-DD.");
  const bs = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  validateBsDate(bs);
  return bs;
}

export function todayBs(): BsDate {
  return gregorianToBs(new Date());
}

export function formatDualDate(isoDate: string | number | Date, lang: "ne" | "en" = "en"): string {
  let civil: string;
  try { civil = nepalDateOnly(typeof isoDate === "number" ? new Date(isoDate) : isoDate); } catch { return `${isoDate} (${lang === "ne" ? "मिति अप्रमाणित" : "date unverified"})`; }
  const adStr = new Date(`${civil}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" });
  try {
    const bsStr = formatBs(gregorianToBs(civil), lang);
    return lang === "ne" ? `${bsStr} वि.सं. (${adStr} A.D.)` : `${adStr} A.D. (${bsStr} B.S.)`;
  } catch {
    return `${adStr} A.D. (${lang === "ne" ? "वि.सं. उपलब्ध छैन" : "B.S. unavailable"})`;
  }
}

/** Display an instant without dropping its time or changing the stored value. */
export function formatNepalTimestamp(value: string | number | Date, lang: "ne" | "en" = "en"): string {
  if (typeof value === "string") {
    if (isIsoDateOnly(value)) return formatDualDate(value, lang);
    try { nepalDateOnly(value); } catch { return `${value} (timezone unverified)`; }
  }
  const instant = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(instant.valueOf())) return String(value);
  const clock = instant.toLocaleTimeString(lang === "ne" ? "ne-NP" : "en-GB", { timeZone: NEPAL_TIMEZONE, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return `${formatDualDate(instant.toISOString(), lang)} · ${clock} NPT`;
}

export function bsMonthBounds(value: string): { start: string; end: string } {
  const bs = gregorianToBs(value);
  return { start: bsToIsoDate({ ...bs, day: 1 }), end: bsToIsoDate({ ...bs, day: bsMonthLength(bs.year, bs.month) }) };
}

export function shiftBsMonth(value: string, delta: number): string {
  if (!Number.isInteger(delta)) throw new RangeError("Month movement must use whole months.");
  const bs = gregorianToBs(value);
  const index = bs.year * 12 + bs.month - 1 + delta;
  const year = Math.floor(index / 12), month = ((index % 12) + 12) % 12 + 1;
  return bsToIsoDate({ year, month, day: Math.min(bs.day, bsMonthLength(year, month)) });
}

export function bsMonthLabel(value: string, lang: "ne" | "en" = "en"): string {
  const bs = gregorianToBs(value);
  return lang === "ne" ? `${BS_MONTHS_NE[bs.month - 1]} ${toNepaliDigits(bs.year)} वि.सं.` : `${BS_MONTHS_EN[bs.month - 1]} ${bs.year} B.S.`;
}

/** Existing date-badge slots share the converter; no independent calendar math. */
export function bsDateParts(value?: string | null, lang: "en" | "ne" = "en"): { day: string; month: string; year: string } | null {
  if (!value) return null;
  if (lang === "en") {
    try { const civil = nepalDateOnly(value); return { day: String(Number(civil.slice(8))), month: new Date(`${civil}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", month: "short" }).toUpperCase(), year: `${civil.slice(0, 4)} A.D.` }; } catch { return null; }
  }
  try { const bs = gregorianToBs(value); return lang === "ne"
    ? { day: toNepaliDigits(bs.day), month: BS_MONTHS_NE[bs.month - 1], year: `${toNepaliDigits(bs.year)} वि.सं.` }
    : { day: String(bs.day), month: BS_MONTHS_EN[bs.month - 1].toUpperCase(), year: `${bs.year} B.S.` }; }
  catch {
    try { const civil = nepalDateOnly(value); return { day: civil.slice(8), month: new Date(`${civil}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", month: "short" }).toUpperCase(), year: `${civil.slice(0, 4)} A.D.` }; }
    catch { return null; }
  }
}

/** UI calendar Date objects are civil view coordinates, never stored instants. */
export function viewDateIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function startOfBsMonthDate(date: Date): Date { return new Date(`${bsMonthBounds(viewDateIso(date)).start}T12:00:00`); }
export function endOfBsMonthDate(date: Date): Date { return new Date(`${bsMonthBounds(viewDateIso(date)).end}T12:00:00`); }
export function addBsMonthsDate(date: Date, amount: number): Date { return new Date(`${shiftBsMonth(viewDateIso(date), amount)}T12:00:00`); }
export function subBsMonthsDate(date: Date, amount: number): Date { return addBsMonthsDate(date, -amount); }
export function sameBsMonth(a: string, b: string): boolean {
  try { const first = gregorianToBs(a), second = gregorianToBs(b); return first.year === second.year && first.month === second.month; } catch { return false; }
}
export function canShiftBsMonth(value: string, amount: number): boolean { try { shiftBsMonth(value, amount); return true; } catch { return false; } }

export type DateLanguage = "en" | "ne";
export function calendarMonthBounds(value: string, language: DateLanguage = "en") {
  if (language === "ne") return bsMonthBounds(value);
  if (!isIsoDateOnly(value)) throw new RangeError("Invalid Gregorian date.");
  const date = new Date(`${value}T12:00:00Z`);
  return { start: `${value.slice(0, 7)}-01`, end: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).toISOString().slice(0, 10) };
}
export function shiftCalendarMonth(value: string, amount: number, language: DateLanguage = "en") {
  if (language === "ne") return shiftBsMonth(value, amount);
  if (!isIsoDateOnly(value) || !Number.isInteger(amount)) throw new RangeError("Invalid calendar month movement.");
  const date = new Date(`${value}T12:00:00Z`);
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
  const end = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(date.getUTCDate(), end));
  return target.toISOString().slice(0, 10);
}
export function canShiftCalendarMonth(value: string, amount: number, language: DateLanguage = "en") {
  try { return supportsBsConversion(shiftCalendarMonth(value, amount, language)); } catch { return false; }
}
export function calendarMonthLabel(value: string, language: DateLanguage = "en") {
  return language === "ne" ? bsMonthLabel(value, language) : new Date(`${value}T12:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", month: "long", year: "numeric" });
}
export function calendarDayLabel(value: string, language: DateLanguage = "en") {
  return language === "ne" ? toNepaliDigits(gregorianToBs(value).day) : String(Number(value.slice(8, 10)));
}
export function calendarWeekdays(language: DateLanguage = "en", mondayFirst = false) {
  const days = language === "ne" ? ["आइत", "सोम", "मङ्गल", "बुध", "बिहि", "शुक्र", "शनि"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return mondayFirst ? [...days.slice(1), days[0]] : days;
}
export function calendarDateLabel(value: string, language: DateLanguage = "en") {
  if (language === "ne" && !supportsBsConversion(value)) return `${value} A.D. (वि.सं. उपलब्ध छैन)`;
  return language === "ne" ? `${formatBs(gregorianToBs(value), "ne")} वि.सं.` : `${new Date(`${value}T12:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" })} A.D.`;
}
export function calendarMonthOptions(language: DateLanguage = "en") {
  return language === "ne" ? BS_MONTHS_NE : Array.from({ length: 12 }, (_, month) => new Date(Date.UTC(2020, month, 1)).toLocaleDateString("en-GB", { timeZone: "UTC", month: "long" }));
}

export function formatOperationalDate(ad?: string | null, recordedBs?: string | null, lang: "ne" | "en" = "en"): string {
  if (ad) return formatDualDate(ad, lang);
  return recordedBs ? `${recordedBs} B.S. (A.D. unavailable)` : "—";
}

export function formatNepalClock(value: string | number | Date): string {
  const instant = value instanceof Date ? value : new Date(value);
  return Number.isFinite(instant.valueOf()) ? instant.toLocaleTimeString("en-US", { timeZone: NEPAL_TIMEZONE, hour: "2-digit", minute: "2-digit" }) : "—";
}

export function relativeNepalDay(value: string | Date, now = new Date()): string {
  try {
    const date = nepalDateOnly(value), today = nepalDateOnly(now);
    const difference = (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / DAY_MS;
    if (difference === 0) return "Today";
    if (difference === 1) return "Yesterday";
    return formatDualDate(value);
  } catch { return "Date unverified"; }
}
