# ADR-0022: Locale-aware Nepal operational dates

- Status: final locale policy explicitly owner-authorized; implementation pending owner/TL visual review
- Date: 2026-10-21
- Scope: Staff, Admin, Client, applicable Public forms, human-readable exports and notifications

## Decision

Use `src/lib/nepali-calendar.ts` as the sole B.S./A.D. converter and calendar table. `bs-calendar.ts` remains a compatibility facade, not another converter. The global `useI18n` language selects presentation: **English uses Gregorian/A.D. entry, month boundaries, headings and days; Nepali uses genuine B.S. entry, month boundaries, Nepali headings and digits.** B.S. retains its Nepal legal relevance and verified equivalent. Existing API/database Gregorian civil dates and ISO timestamps remain authoritative and unchanged. This owner correction supersedes the initial unconditional B.S.-first UI policy.

Reuse the compatibility-named `BsDateField` for editable civil dates. Its calendar icon opens an interactive locale-specific picker with month/year controls, real weekday alignment, selection, keyboard navigation, Escape and focus recovery. English accepts A.D. YYYY-MM-DD; Nepali accepts B.S. YYYY-MM-DD in Latin/Nepali digits. A **separate labelled read-only conversion box** immediately shows the opposite calendar. The callback and named form data remain A.D. A language switch changes representation without calling `onDateChange` or changing the real selected date. Invalid drafts block submission; non-form Save handlers call `reportBsDateValidity`. Retain unsupported historical A.D. values with an explicit conversion-unavailable notice.

Use `DualDateDisplay` / `formatDualDate` for locale-primary dates, `formatNepalTimestamp` for full instants, and `formatNepalClock` for clocks. Pure formatters default to English; pass the active language for localized UI, or use `DualDateDisplay`, which reads it. English presents A.D. before optional B.S.; Nepali presents B.S. before optional A.D. No month cell may show both systems. Counterparts belong to the selected-date summary/details or the field's read-only box. Reuse canonical Nepali month/digit maps; do not create route-specific conversion math or hard-code converted dates.

The editable date/picker and read-only counterpart share one horizontal grid row, with associated labels above and matched control heights. Give the primary column modest additional space for its integrated 44px calendar button. Let the date pair span its parent form row when a half-column would squeeze it; keep appointment Start Slot as a separate field in the original order. Reflow the pair only below its measured 17rem readable container threshold, including enlarged text. Use the shared container query, not route-specific copies or viewport-only assumptions. Do not shrink date text, hide the picker or change source values to force a fit.

### Civil dates, timestamps and view coordinates

- A Gregorian `YYYY-MM-DD` is a civil date: preserve its day independently of the browser/server timezone. Do not parse it as local midnight and then serialize it to UTC.
- An instant must have an explicit offset/Z. Derive its business day/clock in `Asia/Kathmandu`, while preserving the stored ISO timestamp and any time-bearing edit that was not changed. Offset-free datetime strings are labelled unverified; their source timezone cannot be guessed.
- `Date` objects used by existing calendar grids are view coordinates. Use `viewDateIso` only for those coordinates, never as an instant serializer. `nepalDateOnly(new Date())` supplies the current business date.
- The compatibility `bsToGregorian` return value is a UTC-midnight civil-date carrier, not a selected court/reminder instant. Prefer `bsToIsoDate` when passing a converted date into an existing civil-date API field.
- Month views use `calendarMonthBounds` / `shiftCalendarMonth` with the active language. Nepali delegates to the verified `bsMonthBounds` / `shiftBsMonth`; English uses Gregorian month ends, including leap years. `calendarMonthLabel`, `calendarDayLabel` and `calendarWeekdays` keep one visible calendar system per grid. Cell identity, event matching and API selection remain A.D. civil keys in both languages. Switching locale retains the selected real day. B.S. navigation outside the table is disabled; no invented years. Ordinary day/week navigation remains civil day arithmetic.
- Task date-only inputs retain the existing contract's UTC-midnight normalization. This is interoperability with an existing timestamp contract, not a claim that a user entered an exact reminder time. Existing reminder instants are preserved when another field is edited.

### Data and independently verified references

Supported conversion range: **2000-01-01 through 2090-12-30 B.S.**, corresponding to **1943-04-14 through 2034-04-13 A.D.** The inclusive table contains 33,238 days. Unsupported values display their authoritative A.D. date with B.S. unavailable; entering an unsupported B.S. year produces an error. Extending the range needs separately verified data and owner authorization.

The table is pinned to the MIT-licensed [Nepali-Date maintainer dataset, revision 2183c30ada24a7fe678a24d58a5aa61ce8cdfa85](https://github.com/subeshb1/Nepali-Date/blob/2183c30ada24a7fe678a24d58a5aa61ce8cdfa85/src/date-config.ts). Its license notice is retained in the converter. No runtime dependency or downloaded executable was installed.

Nineteen independent date pairs are transcribed in `tests/unit/nepali-calendar.test.ts` from government publications: [Consulate General, Chengdu holidays](https://ctu.nepalconsulate.gov.np/pages/holidays-of-the-conscience-7/) and [Embassy of Nepal, London holidays](https://uk.nepalembassy.gov.np/pages/embassy-holidays/). Examples: 14 April 2025 = 1 Baisakh 2082; 14 April 2026 = 1 Baisakh 2083; 20 October 2026 = 3 Kartik 2083; 15 January 2027 = 1 Magh 2083. The Chengdu table's inconsistent 2 June 2025 / 2081 year entry is deliberately excluded.

These government fixtures independently verify selected current dates. Exhaustive supported-day round trips verify table/arithmetic consistency, not independent historical/astronomical accuracy for every year. The full table is published reference data; future official calendars may require updates. Do not present conversion as certification of a court deadline or historical record.

### Explicit exceptions

- ISO/Gregorian API contracts, database values, cursor keys, chronological sorting, JSON exports, RFC/ICS payloads, logging, audit records, signature/storage expiry and migration imports retain their existing machine formats. A human-readable PDF/signature summary can show B.S./A.D.; its source instant remains unchanged. A `today_gregorian` template placeholder stays A.D.; `today_bs` is calculated from the same Nepal civil day.
- Existing Gregorian analytics/reporting periods and HR entitlement years retain their calculations and are labelled A.D. They must not silently become B.S. months/years.
- Document retention's existing update contract accepts a policy name, not a retention-until date. Keep policy editing and show any returned retention date read-only in the active locale, with its counterpart and exact Nepal timestamp. Never suggest a date is editable or send an ignored date argument. This exception was explicitly owner-authorized during the correction.
- Relative labels such as Today, Yesterday, minutes ago and clock-only chat messages remain useful; day boundaries use Nepal time and older dates use the shared dual formatter.
- Legacy B.S.-only text is identified as recorded text with A.D. unavailable. Prefer recalculating display from authoritative A.D. when available; do not backfill or migrate stored records implicitly.
- Court working days, public holidays, limitation periods and binding deadline extensions require separately verified legal rules. Conversion/month navigation establishes none of those rules. Existing configured HR leave-day policy is unchanged.

## Verification and future changes

Run independent fixtures in both directions, all month ends and supported endpoints, invalid dates, leap years, Nepal-midnight boundaries, cross-timezone tests and actual form/payload browser checks. Self-round-tripping alone is insufficient. Test real global EN/NE switching, opened pickers, month/year navigation, the separate conversion box, unchanged selection/event placement, keyboard/native validity, mobile layout and scoped accessibility. Intercept all QA writes. Public fields inherit the existing application language preference; do not invent a separate preference store or extra language control.

A date change must not add schema/API contracts, guess unknown timezones, rewrite stored dates, alter permissions or lose time information. Record reference provenance and limits when updating the table. The Session 17E report holds the surface inventory, evidence and implementation limitations; this ADR owns the permanent policy.

Session 17D is **deferred**, not completed or cancelled. Its five retrieval groups remain open: Documents, Case Misl, document-derived case history, profile audit history and notifications. Date presentation cannot establish completeness of capped retrieval.

## Rollback

Review this implementation as an uncommitted checkpoint. A later rollback must preserve stored Gregorian values and original timestamps; there is no schema/data migration to reverse. Never restore a known inaccurate calendar table without clearly disabling unsupported conversion claims.
