# CUI-08 — Hearings & Court Diary

## Route

`/client/hearings` → `src/views/client/ClientHearingsPage.tsx`

## Authority

- Body: `doc/ui-reference/client/references/04-hearings.jpg` (SHA `8B87859A…`, 1400×933)
- Shell: published dark Client shell (CUI-05/06/07)
- Active nav: **My Matters** via `resolveClientDesktopNav` (`/client/hearings` → `my-matters`)
- Appointments must remain inactive

## Data

- Hook: `useHearings({})` → `GET /api/v1/hearings`
- Matters: `useClientCases({ clientId })` for titles / Matter numbers / filters
- Tasks: `useTasks({})` filtered to `clientVisible` open actions for preparation rail
- DTO: `HearingDto` (`dateGregorian`, `dateBs`, `time`, `court`, `purpose`, `status`, `caseId`)
- No `room` / `judge` / fake preparation copy

## Views

- Upcoming = `status === "scheduled"` and Gregorian date ≥ today
- Past = not upcoming
- All = upcoming then past
- Matter filter + search over real title / case number / court / purpose

## Actions

- View Matter → `/client/cases/:id`
- Message Legal Team → `/client/messages?caseId=:id`
- Add to Calendar → same ICS helper pattern as Home / Matter Details
- Checklist link → `/client/checklist`

## QA note

Playwright `page.clock.setFixedTime` before load prevents React Query from scheduling
`useHearings` / `useTasks` (they start `enabled: false` until `useMyClient` resolves).
Capture/E2E therefore do not freeze the clock; seeded upcoming dates remain future
relative to both `UI_PREVIEW_NOW` and the current system date.

## Freeze

Unchanged: CUI-05 Home, CUI-06 My Matters, CUI-07 Matter Details, Staff/Admin hearing pages.
CSS scoped to `.client-hearings*` only.
