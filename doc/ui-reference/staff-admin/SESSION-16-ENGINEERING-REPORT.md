# Session 16 — Premium Staff HR

2026-10-20, Asia/Kathmandu. Implemented; awaiting Technical Lead and owner visual/functional approval. Nothing staged or committed.

## Safety

Worktree `D:\lexnepal\.local\worktrees\ui-staff-admin-upgrade`, branch `ui/staff-admin-upgrade`, HEAD `c98c55055ee8f0ae9acd2c5deb3d8f96587e8754`. Origin is `https://github.com/raghav556/lexnepal.git`. Verified worktree, branch, HEAD, status and remote before continuing. Read AGENTS.md and the installed Next.js client-component guide.

The unrelated Session 08 report remains unchanged and unstaged; SHA-256 `1ACEB9535586A43197F561057EEC9DB9409CAB5F12994629C43F86F5FE7BC78E`. No original-checkout edits, dependency changes, database operations, staging, commits, pushes, merges or deployments. Reused the existing preview on port 3001; no new server or production build.

## Existing functionality and authoritative boundaries

- Route: `src/app/(staff)/staff/hr/page.tsx`; workspace: `src/views/staff/StaffHRPage.tsx`.
- Existing integration: `useAttendance`, `useLeaveRequests`, `useLeaveBalances`, `useHrCommands` in `src/client/queries/hr.ts`. Successful commands invalidate the existing HR query family. No public fallback.
- `src/shared/contracts/hr.ts` defines attendance statuses present/absent/half_day/leave; leave types annual/sick/maternity/paternity/unpaid; request statuses pending/approved/rejected; optional reason maximum 2,000 characters. Contracts remain unchanged.
- HR API route handlers require a session and validate inputs. `src/server/services/hr-service.ts` validates firm context, forces non-management reads to the principal, permits self attendance, assigns leave to the principal, and reserves reviews/balance adjustments for `hr.manage`. Focused tests exercise this actual service with mocked repositories/notifications.
- `src/server/repositories/hr-repository.ts` remains authoritative for firm-scoped persistence, leave date ordering, configured leave-day rules and balances. Remaining days are server values; the UI never subtracts pending days twice or invents entitlement/charged-day estimates.
- `src/shared/hr/timezone.ts` supplies Kathmandu time and clock parsing. The prior Staff UTC ISO date/year calculation could select yesterday or the wrong year near Nepal midnight. The Staff model now derives the business date and balance year explicitly in Asia/Kathmandu.

## Implemented design and behavior

Navy/gold Nepal hero, compact horizontal KPI cards, Attendance / Leave & Requests / Leave Balance tabs, attendance workspace, seven real calendar dates, paginated histories, request form, upcoming requests, real balance panels and working shortcuts. Wide desktop places Today and the seven-date summary together; narrower layouts stack cleanly. Mobile history uses labelled cards. Staff shell, corrected footer and floating Scroll-to-Top are untouched.

- Hours Today shows valid completed recorded duration; open attendance says In progress, with no invented elapsed timer. Missing or invalid duration remains unavailable.
- Days Recorded counts distinct returned dates this month through Kathmandu today, including all recorded statuses; its final helper says “Recorded dates this month.” Pending Leave counts actual pending requests. Annual Leave Remaining uses the returned annual balance in days. Read failures/missing balance never become a fabricated zero.
- Clock In and confirmed Clock Out use the existing attendance upsert, the signed-in staff ID and actual Kathmandu date/time. Clock Out preserves the recorded start. Invalid/future/prior-day starts cannot be closed. Same-minute/nonpositive durations are rejected. A synchronous mutation lock prevents repeated submissions within this workspace. Success refreshes real queries; failures remain visible and retryable.
- The leave form uses the actual Zod contract plus valid calendar/date-order checks. All five supported types are available. Failed submissions preserve input; success refreshes histories, pending count and balances. Status filters and eight-record pagination remain functional.
- Independent loading/error/retry states prevent one failed resource from blocking the rest. Queries wait for Staff identity and explicitly request self data. Defensive user filtering adds no authorization rights. No approval, deletion, management or balance-adjustment controls are exposed.
- Dialogs have explicit accessible names, confirmation, Escape/focus recovery and trapped keyboard focus. Tabs support keyboard navigation. Shortcuts focus/scroll actual sections and respect reduced motion.
- Date-only values retain their civil AD date when passed to the existing DualDateDisplay. Unsupported BS table dates use an explicit AD / BS unavailable fallback. The shared browser-local hero date is suppressed only within HR; the Today panel displays the Kathmandu business date.

Reused PortalPageShell, MetricCard, DashboardSection, DashboardButton, StatusBadge, DualDateDisplay, EmptyState, branding, Dialog/Input/Label/Textarea/Select/Tabs/Pagination, Lucide icons and dashboard tokens. Two small Staff-only modules are new: the tested HR model and a query-cache state adapter. The adapter observes the original data-only hooks' existing cache entries to expose errors/retry without changing shared hooks or Admin. No new generic visual component was necessary.

Intentionally omitted unsupported reference features: Break, GPS, shifts, overtime, holiday/weekend inference, payroll/payslips/money, personal leave, trends, HR policy links without a verified destination, staff-wide management, Staff Team Chat and Staff Command Center. Missing dates say No record.

## API paths verified

| UI flow | Existing authenticated integration | Verification |
| --- | --- | --- |
| Attendance read/retry | GET `/api/v1/hr/attendance?userId=…` | Actual hook/API client, intercepted responses |
| Clock In / confirmed Clock Out | POST `/api/v1/hr/attendance` | Payload, duplicate guard, failure/retry and refreshed duration |
| Request history/filter | GET `/api/v1/hr/leave-requests?userId=…` | Real hook and UI states |
| Leave submission | POST `/api/v1/hr/leave-requests` | Validation, 403 draft retention, success and refreshed count/balance |
| Leave balances | GET `/api/v1/hr/leave-balances?userId=…&year=…` | Actual server-shaped days, missing data and Kathmandu year rollover |

Browser responses are synthetic; server authorization is independently tested at the service boundary. These are complementary checks, not a claim of real authenticated persistence or notification delivery.

## QA

- Focused ESLint: changed Staff HR TS/TSX, focused tests, existing HR E2E and QA script, zero warnings/errors.
- `npx tsc --noEmit`: passed, exit 0; `.local/qa/session-16/tsc.log` is empty.
- `npx vitest run tests/unit/staff-hr-model.test.ts tests/unit/staff-hr-authorization.test.ts tests/unit/hr-timezone.test.ts tests/unit/hr-contracts.test.ts tests/unit/leave-days.test.ts --maxWorkers=1`: **5 files, 47 tests passed**.
- `node scripts/qa/verify-staff-hr.mjs --final-polish`: **28 grouped browser checks, 24 axe WCAG A/AA scans without reported violations**, seven intercepted HR mutation attempts; zero live writes or browser exceptions. Confirmed directly from `final-polish/browser.log` and `final-polish/evidence.json`. The earlier parent-directory run had 18 checks and is historical evidence.
- `git diff --check`: passed. Existing CRLF normalization notices are not whitespace failures.

Browser coverage uses actual Next.js routes, production components/hooks/API client and synthetic authenticated identity. All browser API requests are intercepted. Checks cover 1440/1280/768/390/360 widths, light/dark, all three tabs, accurate KPIs, footer boundary and zero outer/body double scroll, no horizontal overflow, Scroll-to-Top, mobile navigation clearance, clock-in/out and confirmation, errors and duplicate prevention, leave validation/retained drafts/cache refresh, balances, independent loading/empty/error/retry states, 401/403 handling, malformed clocks, Kathmandu midnight/year boundaries, unsupported BS dates, pagination, keyboard tabs, focus recovery and reduced motion. Desktop route entry uses actual sidebar navigation from Dashboard to guard against the earlier footer regression.

The existing HR E2E smoke source was updated to the current heading/form and intercepted HR writes, replacing its previous persistent leave submission. It was not executed through real seeded authentication. The standalone browser harness supplies the full safe UI workflow coverage.

## Screenshots and evidence

Final ignored evidence directory: `.local/qa/session-16/final-polish/` (**49 PNG captures**). The original 33 captures in `.local/qa/session-16/` are preserved as pre-polish comparisons. The filenames below refer to the final-polish directory unless explicitly described as original.

- `attendance-1440-light-top.png`, `attendance-1440-dark-top.png` — desktop hero/KPIs/attendance.
- `leave-1440-light.png`, `balances-1440-dark.png` — request and balance workspaces.
- `attendance-768-light-top.png` — tablet.
- `attendance-390-light-top.png`, `attendance-360-dark-top.png` — mobile.
- `leave-360-dark.png`, `balances-390-light.png` — mobile secondary tabs.
- `clock-out-confirmation.png`, `leave-permission-error-draft-retained.png`, `empty-balances.png` — functional states.
- All ten width/theme combinations have matching attendance/leave/balance captures. `final-polish/evidence.json` records checks, geometry, intercepted requests/writes, axe results and browser version. `final-polish/{browser,unit,eslint,tsc}.log` record the latest command results. The unit log confirms 47 passing tests across five files; ESLint/TypeScript logs contain no diagnostics, consistent with the previously recorded exit-0 runs.

## Exact changed/new paths

Changed:

1. `src/views/staff/StaffHRPage.tsx` — premium functional Staff self-service workspace.
2. `src/index.css` — appended `.dashboard-staff .staff-hr-*` scoped rules only.
3. `tests/e2e/staff-hr.spec.ts` — updated selectors and safe intercepted HR commands.

New:

4. `src/views/staff/staff-hr-model.ts` — date, KPI, clock, leave and display-range helpers.
5. `src/views/staff/use-staff-hr-data.ts` — observes existing query states without shared-hook changes.
6. `tests/unit/staff-hr-model.test.ts` — focused calculation/validation/state regressions.
7. `tests/unit/staff-hr-authorization.test.ts` — actual service authorization with mocked dependencies.
8. `scripts/qa/verify-staff-hr.mjs` — repeatable fully intercepted browser QA.
9. `doc/ui-reference/staff-admin/SESSION-16-ENGINEERING-REPORT.md` — this report.

## Limitations and final Git state

Real authenticated persistence, notification delivery and external integrations remain **unverified**. No real attendance or leave was created. No production build or full-suite pass is claimed. Axe supplements visual/keyboard checks rather than certifying accessibility. The shared BS converter is reused within its supported table; it was not rewritten or independently certified. Duplicate prevention is local to this workspace; no new cross-tab/server concurrency guarantee is claimed.

Shared shell, Admin/Client UI, HR hooks/contracts/API/service/repository and other Staff module sources have no Session 16 changes. Isolation is based on the scoped diff and actual HR route checks; no new exhaustive Admin/Client browser run is claimed. The previously documented Client shell contract failure expecting removed Staff `onOpenCommandCenter` is outside this scope and was not altered or represented as passing.

Tracked diff after final polish: three implementation/test files, 1,131 additions / 596 deletions; untracked model/adapter/tests/script/report are excluded from that Git statistic. No staged files. Final status:

```text
 M doc/ui-reference/staff-admin/SESSION-08-ENGINEERING-REPORT.md
 M src/index.css
 M src/views/staff/StaffHRPage.tsx
 M tests/e2e/staff-hr.spec.ts
?? doc/ui-reference/staff-admin/SESSION-16-ENGINEERING-REPORT.md
?? scripts/qa/verify-staff-hr.mjs
?? src/views/staff/staff-hr-model.ts
?? src/views/staff/use-staff-hr-data.ts
?? tests/unit/staff-hr-authorization.test.ts
?? tests/unit/staff-hr-model.test.ts
```

Session 08 remains excluded. HEAD/branch remain unchanged. Stop for Technical Lead and product-owner visual/functional review; no Git checkpoint is authorized.

## TL-approved final polish — 2026-10-20

Only three refinements were made; the approved design and business behavior remain intact:

1. At widths through 640px, equal-width 44px-high tabs use Attendance / Leave / Balances in one row. Leave tabs retain their full accessible names, Leave & Requests / Leave Balance. Desktop labels/icons are unchanged. Existing Radix keyboard, selection and focus behavior is preserved.
2. Confirmed that completed attendance already disables Clock In and Clock Out. No attendance-state/handler changes were needed. HR disabled buttons now use neutral background, muted readable text, border and a disabled cursor instead of a faded purple primary appearance. Busy locking, confirmation, validation, errors and retry remain unchanged.
3. Days Recorded now says **Recorded dates this month**. The existing distinct-date calculation, recorded-status inclusion and Kathmandu boundaries are unchanged.

Exact paths touched in this polish: `src/views/staff/StaffHRPage.tsx` (labels/helper only), `src/index.css` (scoped compact tabs/disabled appearance), `scripts/qa/verify-staff-hr.mjs` (extend existing safe browser harness), and this report. No new source file, shared shell, API, hook, permission or other module change.

Final evidence is separate from the original screenshots under `.local/qa/session-16/final-polish/`. Run `node scripts/qa/verify-staff-hr.mjs --final-polish` to reproduce. The existing workflow suite is retained, with added per-width/theme assertions for single-row mobile geometry, unclipped tab labels, minimum 44px mobile tab height, keyboard focus/selection, helper wording and both closed controls disabled. It records disabled computed styles, plus an explicit in-flight disabled state; all API writes remain intercepted.

Review images: `tabs-360-light.png`, `tabs-360-dark.png`, `tabs-390-light.png`, `tabs-390-dark.png`; `attendance-1440-light-top.png` compares directly with the original capture of that name in the parent evidence directory. `day-closed-disabled-{width}-{theme}.png` shows both disabled controls at every required width/theme; `clock-in-busy-disabled.png`, `clocked-in-controls.png` and `clock-out-confirmation.png` show other attendance states. Original screenshots are preserved.

Explicit final review paths:

- `.local/qa/session-16/final-polish/tabs-360-light.png` and `tabs-360-dark.png`.
- `.local/qa/session-16/final-polish/tabs-390-light.png` and `tabs-390-dark.png`.
- `.local/qa/session-16/final-polish/attendance-1440-light-top.png` — desktop comparison.
- `.local/qa/session-16/final-polish/day-closed-disabled-360-dark.png` — neutral closed-state controls.
- `.local/qa/session-16/final-polish/clock-in-busy-disabled.png` — in-flight disabled state.

Report consistency review independently confirmed the 28 check entries, 24 scan entries with zero violations, empty browser-error array, seven intercepted writes and zero live mutations in JSON; the 47-test total is supported by the unit log. Required screenshots exist, mobile tabs measure 44px high, and representative mobile-dark/desktop-light captures were visually inspected. Only this report was edited during that review; no tests or production code were rerun or changed.

Focused checks and final Git status are recorded below. Existing persistence/notification/build limitations and the separately documented baseline Client contract failure remain unchanged. No real records were written; no staging, commit, push, merge, deployment or Session 17 work.

Final polish checks:

- `npx vitest run tests/unit/staff-hr-model.test.ts tests/unit/staff-hr-authorization.test.ts tests/unit/hr-timezone.test.ts tests/unit/hr-contracts.test.ts tests/unit/leave-days.test.ts --maxWorkers=1`: **47 tests passed, five files**.
- `npx eslint src/views/staff/StaffHRPage.tsx scripts/qa/verify-staff-hr.mjs --max-warnings=0`: passed, exit 0.
- `npx tsc --noEmit`: passed, exit 0.
- `node scripts/qa/verify-staff-hr.mjs --final-polish`: **28 grouped checks, 24 axe scans with zero violations, seven intercepted mutation attempts, zero browser exceptions and zero live mutations**. All 1440/1280/768/390/360 light/dark combinations passed. Existing clock-in/out, confirmation/Escape/focus, validation, failed-request retry, duplicate prevention, leave form/cache refresh, balances, dates and permissions coverage remains green.
- `git diff --check`: passed; original CRLF normalization notices remain informational. Logs and measured tab/disabled-control evidence are in `final-polish/{unit,eslint,tsc,browser}.log` and `evidence.json`.

Final Git status remains exactly the ten entries shown above: the same nine Session 16 paths plus the preserved Session 08 modification. HEAD remains `c98c55055ee8f0ae9acd2c5deb3d8f96587e8754` on `ui/staff-admin-upgrade`; the index is empty. Session 08 SHA-256 remains `1ACEB9535586A43197F561057EEC9DB9409CAB5F12994629C43F86F5FE7BC78E`. No new limitations or blockers. Stop for TL review.
