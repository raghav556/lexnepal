# Staff Home — Session 04 engineering report

Date: 14 October 2026 (Asia/Katmandu). Scope: the actual Staff Dashboard Home,
Staff Home-scoped presentation, offline component QA and owner preview.
Implementation/fixture-preview gates are satisfied. Product-owner design approval
and authenticated production acceptance remain separate and pending.

## 1. Starting Git state and constraints

- Worktree: `D:/lexnepal/.local/worktrees/ui-staff-admin-upgrade`.
- Branch: `ui/staff-admin-upgrade`.
- Starting HEAD: `d705db7a805996a99539b6af67407b2d95afbc2f`, as requested.
- Starting status: clean. Sessions 01–03 are in that checkpoint commit.
- No reset, stash, discard, rebase, branch switch, commit, push, merge or deployment.
  Session 04 files remain uncommitted for technical and owner review.
- Read AGENTS.md, installed Next.js CSS/accessibility/Client Component guidance,
  all three session reports, the authoritative Client DOCX and its companion,
  reference README and freeze/checkpoint documentation. Client acceptance is not
  upgraded by this session.
- No worktree `.env.local` or process `DATABASE_URL`. No database, owner environment,
  seeder, migration, live authenticated server or shared data was used.
- Starting StaffDashboard and CSS copies are in ignored `.local/qa/session-04/starting/`.

## 2. Source-verified problems and design choices

The original hero repeated hearing, task and unread-message counts already carried
by the four metrics. Its gradient, ornaments, glass chips and secondary hearing
CTA competed with the schedule. Quick actions appeared before operational content.
The markup placed My Cases before Priority Tasks in the linear reading order.
Matter/client names and operational list text were truncated. At phone widths the
table required local horizontal scrolling. Timeline times could wrap. The task
description claimed due-date ordering although its comparator sorts only priority.

Home now has a calm panel greeting with the existing personalized day-part and dual
date, a CMS-brand accent and one primary task-board CTA. The four metrics use an
aligned two-column phone/compact grid and four columns on wide screens. My Day and
Priority Tasks lead the workspace; My Cases and Upcoming Hearings follow; team
updates, documents and workload form a supporting row. All six quick workspaces
remain available at the end. No count, trend, capacity percentage or live indicator
was added.

Overdue information remains in the task KPI helper and individual task badges.
The former hero health warning is represented explicitly in Priority Tasks, using
the same `urgentPending`/`overdueCount` values; high-priority work remains indicated
when no task is overdue. The priority description now states the actual ordering.
Creation-sounding Home links are labelled as workspace navigation: their unchanged
destinations do not immediately open creation dialogs.

The first dark browser audit found an incorrect new accent-token name. It was
corrected to the existing `--dashboard-control-selected-foreground`. An expanded
content audit then found low contrast in hearing month/year text at 80% opacity;
Home now uses opaque readable text and displays the year as well as the month.
Neither issue was suppressed in tests.

Screenshot inspection also confirmed the same inherited 768px topbar collision in
before and after captures: the search flex item could not shrink and clipped other
controls. A Home-mounted Staff-only selector permits shrinking. It also hides the
decorative, unverified “Live Enterprise” chip on Home. Shared topbar source and
other Staff/Admin/Client page behavior were not changed.

## 3. Content and interaction preservation inventory

| Content                 | Existing calculation/source retained                                                                                                         | Existing destination/behavior retained                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Active cases KPI        | `useCases({})`, status exactly `active`                                                                                                      | `/staff/cases`; helper “Matters in progress”                                                                               |
| Hearings this week KPI  | `useHearings({})`, scheduled, inclusive today through today + seven days; same today's count                                                 | `/staff/hearings`; today/next-seven-days helper                                                                            |
| Tasks due today KPI     | `useTasks({})`, todo/in_progress and local date; overdue calculation and danger tone                                                         | `/staff/tasks`; overdue/On track helper                                                                                    |
| Unread messages KPI     | `useUnreadMessageCounts(caseIds)`, numeric sum across the same case IDs                                                                      | `/staff/messages`; “From client matters”, separate from DMs                                                                |
| My Day                  | Today's scheduled hearings and non-cancelled/non-completed appointments from `useAppointments({})`; same clock parser and chronological sort | Hearing entries → hearings; appointments → appointments; section and empty actions → appointments                          |
| Priority Tasks          | Same pending tasks, priority comparator, stable source order for ties, first five, due-today/overdue/priority badges                         | Task-board section/empty links retained; original rows had no individual task links                                        |
| My Cases                | Same first five active cases, case numbers, titles, client company/full-name fallback and first scheduled hearing map                        | Each `/staff/cases/:id`; cases section/empty links retained; native table columns remain, with labelled stacked phone rows |
| Upcoming Hearings       | Same first four scheduled hearings in source order, BS dates, court/time and purpose-containing-final urgency                                | Hearing workspace section/empty links; original rows had no individual hearing links                                       |
| Messages & Team Updates | `useDmThreads()`, first five peers, initials, last message/time and internal unread badges                                                   | `/staff/team-chat`; no merging with client-matter unread counts                                                            |
| Recent Documents        | `useRecentDocuments(5)`, all returned rows, MIME label, matter association and relative updated/created time                                 | `/staff/documents`; original document rows had no direct open/download action                                              |
| Team Workload           | `useTaskWorkload()` and `useStaffDirectory()`; same first six assignments, names/roles, total/urgent/overdue and tone                        | `/staff/tasks`; existing `min(max(total * 12, 12), 100)` bar width retained, with no new capacity interpretation           |
| Quick workspaces        | All six original destinations                                                                                                                | Tasks, hearings, documents, clients, appointments and research; navigation labels corrected                                |
| Loading/empty           | Same complete-query loading condition and seven existing empty-state explanations                                                            | Loading remains labelled busy, without invented values; skeleton groups now mirror the new composition                     |

Source comparison proves the entire function's data/hook/calculation/memo block,
from `export default function` through the quick-action declaration, matches HEAD
after line-ending normalization. Helpers remain unchanged. Browser before/after
inventories retain the same 13 unique Home destinations in populated data and the
same workspace destinations in empty data. No permission, mutation, validation,
API, backend, schema, route or production query adapter was altered.

## 4. File-level change report

| File                                                            | Purpose                                                                                                                                                                                                         |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/views/staff/StaffDashboard.tsx`                            | Recompose existing sections/metrics; remove redundant hero presentation; preserve warning; honest navigation labels; wrapping matter references, labelled table cells/full hearing year; layout-shaped skeleton |
| `src/index.css`                                                 | Append one Staff Home block using existing semantic tokens; calm header/cards, readable typography, responsive grids/table/timeline, focus and reduced motion; Home-only topbar shrink/live-chip presentation   |
| `tests/staff-home/adapters.tsx`                                 | Extend retained offline navigation/Client adapters with deterministic, test-only Staff data, loading/empty states and CMS branding; commands remain disabled                                                    |
| `tests/staff-home/fixture.tsx`                                  | Mount actual StaffLayout and StaffDashboard with the real shared components and I18nProvider; expose test-only state/language rendering                                                                         |
| `scripts/qa/verify-staff-home.mjs`                              | Reuse existing esbuild/Tailwind/Chromium/Axe fixture architecture for content, destinations, responsive, keyboard, theme and CMS-paint checks/captures                                                          |
| `scripts/qa/preview-staff-home.mjs`                             | Loopback-only static actual-component preview and before/after gallery; explicit identity endpoint and generated-asset allowlist; no application/API/database server                                            |
| `doc/ui-reference/staff-admin/SESSION-04-ENGINEERING-REPORT.md` | This preservation, verification and owner-review record                                                                                                                                                         |

No shared primitive, layout, other Staff view, Admin view or Client source was
edited. Every new application CSS selector requires Staff ownership and the Home
class, or a Staff root containing that mounted class. Existing CSS is unchanged
outside the appended block. No dependency, product feature or UI framework added.

## 5. Visual evidence and owner preview

**Preview label: Isolated actual-component fixture preview.** This is the real
StaffDashboard/layout/presentation tree with offline synthetic hooks. It is not
authenticated application behavior, real API routing or a replacement HTML dashboard.

Owner review: **http://127.0.0.1:3414/**. The gallery provides theme/width/state
selectors and comparable before/after images. Interactive views:

- Light: `http://127.0.0.1:3414/preview?theme=light&state=populated`
- Dark: `http://127.0.0.1:3414/preview?theme=dark&state=populated`
- Change `state` to `loading` or `empty`; resize the browser for responsive review.

The server identity was positively verified via `/__identity`: expected absolute
worktree, feature branch, checkpoint SHA, database none. Chromium exercised four
HTTP preview combinations, Ctrl+K/Escape, and all six Home shortcuts through
keyboard Enter/history back in desktop light and mobile dark. Requests stayed on
the generated loopback origin. Source/env paths return 404. Fixture links model
history while retaining Home; they do not load other application pages or persist
records. Use the gallery to return to the review. The server was left running for
owner inspection; if stopped, run `node scripts/qa/preview-staff-home.mjs` from this
worktree. It binds only `127.0.0.1:3414` and fails if the port is occupied.

Screenshots are ignored local artifacts, never approved goldens or production assets:

| Inventory                                | Path pattern/count                                                                                                    |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Before, normal viewport and full content | `.local/qa/session-04/before/staff-{light,dark}-{1440,1024,768,390,360}-{populated,loading,empty}[-content].png` — 60 |
| After, same data/widths/modes/states     | Same pattern under `after/` — 60                                                                                      |
| Nepali date companions                   | `after/staff-{light,dark}-390-nepali-content.png` — 2                                                                 |
| HTTP preview verification                | `.local/qa/session-04/live-preview-{light,dark}-*.png` — 4                                                            |
| Gallery and browser results              | `.local/qa/session-04/owner-review.html`, `before/results.json`, `after/results.json`, `preview-verification.json`    |

Minimum owner images are `after/staff-light-1440-populated-content.png`,
`after/staff-light-768-populated-content.png` and
`after/staff-light-390-populated-content.png`, with corresponding dark/before files.
The normal screenshots preserve actual shell sizing, scrolling and fixed controls.
Supplementary full-content images expand only shell scroll containers and hide the
fixed mobile bottom bar so it cannot obscure the agenda. Interactive preview and
normal captures retain that bar. Before/after use matching capture rules.

Fixed clock: 18 September 2026, 04:15 UTC; browser Asia/Kathmandu, en-GB. Synthetic
dates are coherent with the existing calendar formatter. The retained installed
offline Geist font pins comparisons; it substitutes for external production font
downloads. Final images were visually inspected for desktop light/dark, tablet,
narrow populated content, loading and empty layouts. These are design-review
evidence, not a claim of production font/CMS-asset approval.

## 6. Responsive, accessibility and regression results

| Check                               | Before/checkpoint                                    | Session 04 outcome                                                                                                                                                                                                          |
| ----------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint                                | Pass                                                 | `npm run lint` exit 0; latest changed scripts also checked directly                                                                                                                                                         |
| Typecheck/route generation          | Pass                                                 | `npm run typecheck` exit 0                                                                                                                                                                                                  |
| Full constrained unit suite         | 631 pass / 5 fail / 636 tests                        | Same 631/5/636; exact failure names match, assertions unmodified                                                                                                                                                            |
| Staff Home browser matrix           | 30 baseline captures/content cells                   | 30 after cells pass: five widths × two themes × populated/loading/empty                                                                                                                                                     |
| Home content/navigation             | Existing four metrics/seven sections/13 destinations | Values/helpers/hrefs, filters/time order, priority order, section sequence, all empty states and destination inventories preserved                                                                                          |
| Keyboard/focus                      | Existing interactions traced                         | Real Tab traversal, visible outline/ring, metric Enter, browser back; HTTP preview also selects all six shortcuts and Ctrl+K/Escape                                                                                         |
| Responsive boundaries               | Original locally scrolling table/topbar collision    | No horizontal viewport overflow or clipped Home links in tested cells; all desktop topbar controls fit and search does not overlap breadcrumbs                                                                              |
| Loading/reduced motion              | Existing complete-query gate                         | Same gate, four skeleton metrics/seven skeleton sections using the same responsive grids; no skeleton values; reduced-motion fixture/CSS exercised                                                                          |
| Dates                               | Existing dual-date helper                            | English and Nepali digits with Gregorian companion exercised at 390px in both modes; underlying conversion unchanged                                                                                                        |
| Scoped Axe                          | No earlier Home-specific acceptance                  | Zero violations in tested Home scopes; full-content populated/empty audits at 1440px also zero. This excludes the unchanged whole shell/footer and arbitrary CMS combinations                                               |
| CMS computed paints                 | Resolver already contrast-bounded                    | 14 samples: two CSS modes × default/white/black/yellow/purple/cobalt/green, using Staff layout's actual fixed light branding appearance. Minimum action 4.715:1, accent 4.742:1, muted 6.553:1, focus against panel 3.905:1 |
| Shared navigation                   | 20 checkpoint cells pass                             | Existing script: 20 cells pass, two roles/themes/five widths; drawers/focus/history/grouping unchanged                                                                                                                      |
| Client functional                   | 104 pass                                             | 104 pass, including shared Staff/Admin Profile/security and Staff chat                                                                                                                                                      |
| Client pixels                       | Existing locked comparisons                          | 24 historical healthy captures identical; 24 fresh standards-mode before/after pairs identical, all 12 Client screens at 1440/360; final Home-only topbar CSS included in refreshed candidate pixel comparison              |
| Client approved references          | Acceptance NOT VERIFIED                              | Existing diagnostic execution: 1 test passes, all 12 compared. Approval remains NOT VERIFIED; approved references not regenerated/replaced                                                                                  |
| Source protection                   | Frozen Client/shared backend contracts               | 236 protected tracked blobs unchanged; existing CSS outside appended Home block unchanged; no other application source diff                                                                                                 |
| Build/integration/authenticated E2E | Missing isolated DATABASE_URL                        | Not run against unverified resources; previous build page-data/integration-setup limitations remain                                                                                                                         |

The five inherited unit failures remain explicitly enabled:

| File                                       | Exact assertion                                                         | Inherited disposition                                                    |
| ------------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `cases-r7-client.test.ts`                  | consumes useClientCases / useClientCase, not Staff CaseDto hooks        | Obsolete source-hook expectation, untouched                              |
| `cases-r7-client.test.ts`                  | does not change Client shell, KYC, booking, or STAFF_ROLES              | Older Staff-hook composition expectation, untouched                      |
| `cui-09-client-checklist-contract.test.ts` | uses solid progress fill and freezes prior Client phases                | Unbounded CSS regex, untouched                                           |
| `dashboard-contrast.test.ts`               | client light keeps boundaries, focus, and chart series distinguishable  | Frozen Client boundary versus generic contract, unresolved and untouched |
| `dashboard-contrast.test.ts`               | rejects pure black and unapproved one-off colors in dashboard UI source | Inherited raw palette/source debt elsewhere, untouched                   |

No Vitest test-count change or baseline-defect-fix claim. Added browser coverage is
reported separately from the unchanged unit count. No assertion/golden was weakened.

## 7. Commands executed

From the upgrade worktree; direct Node CLIs avoid the earlier Windows npm forwarding issue:

```powershell
node node_modules/vitest/vitest.mjs run tests/unit --maxWorkers=2 --reporter=json --outputFile=.local/qa/session-04/baseline-unit.json
node scripts/qa/verify-staff-home.mjs before
node scripts/qa/verify-staff-home.mjs after
npm run lint
npm run typecheck
node node_modules/vitest/vitest.mjs run tests/unit --maxWorkers=2 --reporter=json --outputFile=.local/qa/session-04/final-unit.json

$env:STAFF_ADMIN_NAV_ARTIFACT_DIR=Join-Path (Get-Location) '.local/qa/session-04/navigation'
node scripts/qa/verify-staff-admin-navigation.mjs after
$env:CUI20_ARTIFACT_DIR=Join-Path (Get-Location) '.local/qa/cui-20/session4-after'
node node_modules/@playwright/test/cli.js test --config playwright.functional.config.ts
$env:CUI19_ARTIFACT_DIR=Join-Path (Get-Location) '.local/qa/cui-19/session4-after'
node scripts/qa/build-client-visual-fixture.mjs
node .local/qa/session-04/client-preservation.mjs
$env:CUI19_ARTIFACT_DIR=Join-Path (Get-Location) '.local/qa/cui-19/session4-reference'
node node_modules/@playwright/test/cli.js test --config playwright.visual.config.ts --grep 'approved references'

node scripts/qa/preview-staff-home.mjs
Invoke-RestMethod -Uri http://127.0.0.1:3414/__identity
node .local/qa/session-04/verify-preview.mjs
node .local/qa/session-04/recapture-content.mjs
node .local/qa/session-04/prepare-evidence.mjs
node .local/qa/session-04/summary.mjs
node .local/qa/session-04/final-review.mjs
node node_modules/eslint/bin/eslint.js src/views/staff/StaffDashboard.tsx tests/staff-home scripts/qa/verify-staff-home.mjs scripts/qa/preview-staff-home.mjs --max-warnings=0
node node_modules/prettier/bin/prettier.cjs --check src/views/staff/StaffDashboard.tsx tests/staff-home/adapters.tsx tests/staff-home/fixture.tsx scripts/qa/verify-staff-home.mjs scripts/qa/preview-staff-home.mjs doc/ui-reference/staff-admin/SESSION-04-ENGINEERING-REPORT.md
git diff --check
```

Navigation uses copied checkpoint before-inventory evidence, not recaptured approved
goldens. Home before runs preserve the actual starting component/CSS. The offline
Client comparison helper reuses the retained historical and standards-mode method.
Local helpers/results stay ignored. Changed TSX/MJS/report and appended CSS formatting
were checked; the complete legacy CSS formatting debt was not rewritten.

Early fixture bundling lacked an explicit default Link re-export; it was corrected
before application edits. An HTTP mobile preview probe initially tried the desktop
search button; it was corrected to the existing Ctrl+K interaction. These were
fixture/probe defects, not changes to application behavior. The two actual contrast
defects found during redesign were fixed and their original thresholds retained.

## 8. Open risks and next phase

No disposable database/session/storage/mail environment has been established. Use
the isolation/grant/empty-schema/identity plan in Session 03 before migrating,
seeding or running authenticated E2E. Do not use owner backups, implicit localhost
server reuse, first-firm seed behavior or production/shared credentials. Existing
three integration setup failures and build collection blocker remain unverified
here. API ownership/authorization, actual Next server routing, persistence and real
authenticated workflow acceptance are not established by offline adapters.

Five inherited units, whole-shell/footer/popup/raw-color debt, arbitrary branding
assets, production fonts and approved Client reference acceptance remain open.
Only Chromium was exercised; screen-reader/browser-engine acceptance is separate.
The existing source-order upcoming-hearing selection and workload-bar scaling were
preserved deliberately; this visual session does not repair business calculations.

Owner approval is required for the quiet welcome surface, operational-first order,
two-column phone KPIs, wrapped/stacked case metadata and lower-priority shortcut
placement. The owner can inspect populated/loading/empty light/dark actual-component
previews now. Stop here: do not propagate the design across other screens yet.

After owner approval, recommend a bounded **Staff My Cases visual session**, using
this visual hierarchy and the existing case workspace workflows. Provision the
documented disposable authenticated environment first where feasible; otherwise
extend the same clearly labelled actual-component fixture for review and keep
authenticated acceptance explicitly blocked. No Session 04 commit or push created.
