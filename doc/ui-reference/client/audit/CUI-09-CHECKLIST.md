# CUI-09 — Action Checklist

## Route

`/client/checklist` → `src/views/client/ClientChecklistPage.tsx`

## Authority

- Body: `doc/ui-reference/client/references/05-checklist.jpg` (SHA `77E9D05F…`, 1400×933)
- Shell: published dark Client shell (CUI-05 onward)
- Active nav: **My Matters** via `resolveClientDesktopNav` (`/client/checklist` → `my-matters`)
- Appointments must remain inactive

## Data

- Hook: `useTasks({})` → `GET /api/v1/tasks` (client-scoped by service)
- Matters: `useClientCases({ clientId })`
- Filter (preserved exactly):
  - `task.clientVisible`
  - `task.caseId` in client's matter ids
  - `!task.archivedAt`
  - `!task.parentTaskId`
- Persisted statuses: `todo` | `in_progress` | `done` | `cancelled`
- Read-only: no mutation hooks / no interactive completion toggles

## Presentation buckets (UI-only — never persisted)

Deterministic local calendar-day classification using `localDateIso(new Date())` and existing `isTaskOverdue()`:

| Bucket    | Rule                                                                                |
| --------- | ----------------------------------------------------------------------------------- |
| Completed | `status === "done"`                                                                 |
| Overdue   | not done/cancelled AND `isTaskOverdue(task)`                                        |
| Due Soon  | not done/cancelled, not overdue, valid dueDate from today through today+7 inclusive |
| Upcoming  | not done/cancelled, valid dueDate more than 7 calendar days ahead                   |

Incomplete tasks with **no valid dueDate**: remain in **All** only; never Overdue / Due Soon / Upcoming.

Cancelled: never treated as Completed; remain visible under All with truthful status label.

Preview/E2E clock (when harness supports it): `2026-09-18T05:30:00.000Z` (`UI_PREVIEW_NOW`). Production uses wall-clock date.

## Progress

- total / completed / open / `round(completed/total*100)`
- Zero tasks: show honest empty copy and `0` fill — do **not** celebrate 100%

## Filters / controls

- Tabs: All · Overdue · Due Soon · Upcoming · Completed (real counts)
- Matter select from `useClientCases`
- Search: title, description, Matter title, Matter number
- One filter state source; All view groups by bucket heading

## Permitted next actions

Only existing routes:

- View Matter → `/client/cases/:id`
- Message Legal Team → `/client/messages?caseId=:id`

No title-text heuristics. No Upload / Sign / Book inventing.

## Visual

- Scoped CSS: `.client-checklist*` only
- Solid progress fill (no `bg-gradient-*`)
- Compact rows; Priority Summary + Next Due Item + Need Assistance rail

## Freeze

- Do not modify ClientDashboard / Cases / CaseDetail / Hearings
- Do not alter `.client-home*` / `.client-matters*` / `.client-matter-detail*` / `.client-hearings*`
- Staff/Admin task pages untouched
