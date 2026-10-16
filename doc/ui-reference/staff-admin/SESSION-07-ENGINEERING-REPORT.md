# Session 07 — Premium Staff Tasks and Task Details

16 October 2026, Asia/Katmandu. The Technical Lead has approved the completed Staff
Tasks and Task Details UI, including final scrolling and action placement, for a
GitHub development checkpoint. No new task route, module, API, schema, permission,
dependency or production fixture was introduced. This report preserves the
implementation and verification history; earlier pending-approval/uncommitted
statements describe the state when those checks were recorded. The documented
release-QA limitations remain open.

**Current review screenshots:** `.local/qa/session-07/final-scroll-verification/`,
with unique `session07-SCROLL-VERIFIED-` filenames. Earlier `after/` and
`final-polish/after/` inventories below are historical; see the final scrolling
verification section for the current evidence.

## Starting state and controlling sources

- Worktree: `D:\lexnepal\.local\worktrees\ui-staff-admin-upgrade`.
- Branch: `ui/staff-admin-upgrade`; clean worktree and index at starting HEAD
  `ba3309acf7677f86a2ee9749245fbdd4f046cbb0`.
- Read `AGENTS.md`, installed Next.js Client Component, CSS, Fast Refresh and local
  development guidance; approved Home, Cases/filter and seven-tab Case Details
  reports/source; Client authoritative DOCX, companion and freeze/preservation
  requirements; task routes, consumers, query hooks, constants, pagination,
  calendar/date helpers, dialog controls and existing work-management tests.
- Reviewed both supplied images individually: Tasks & Workflow for the workspace,
  Task Management for the details hierarchy. Existing Staff shell/CMS branding
  takes precedence over the concepts' alternate navigation and invented content.
- Recorded tracked-file hashes and the original checkout's existing dirty state.
  The original checkout is read-only. The supported Webpack application and local
  MySQL remain available; no manual application restart, provisioning, migration,
  seed, account change or database reset was performed in Session 07.

## Architecture and exact files

`/staff/tasks/page.tsx` already mounts `StaffTasksPage` as a Client Component. There
is no task-detail route. Its existing selected task, dialog state, queries and
command handlers remain authoritative. `TaskCard`, `TaskCalendarView` and
`TaskWorkloadView` have only this Staff page as production consumer. Admin and
Client task/checklist implementations do not consume them.

| File | Change and rationale |
| --- | --- |
| `src/views/staff/StaffTasksPage.tsx` | Staff scope, CMS/Nepal hero, four existing metrics, List initial presentation, readable view/scope controls, existing secondary flags in More Filters, native field groups and actual-data Task Details summary. Local focus recovery handles removed openers. Four existing Select menus receive a Tasks-only class/collision padding. Loading has status semantics and a list-shaped skeleton. Existing handlers and payloads retained. |
| `src/components/tasks/TaskCard.tsx` | Compact seven-column record layout that becomes labelled mobile cards; real assignee/case/status/priority/due metadata, visible View and title actions. Separate native controls avoid the previous nested button semantics/keyboard bubbling. Existing card-body opening, completion and drag callbacks retained. Metadata labels remain available to screen readers on desktop. |
| `src/components/tasks/TaskCalendarView.tsx` | Names for month arrows, keyboard-scrollable calendar region and explicit overdue presentation attribute. Date generation, placement, month logic and event opening unchanged. |
| `src/components/tasks/TaskWorkloadView.tsx` | Keyboard equivalent for existing assignee navigation and semantic warning text. Existing API rows, calculations and click behavior retained. |
| `src/app/(staff)/layout.tsx` | Extend the existing flow-footer/Top pattern only to exact `/staff/tasks`; reserve its Top slot. All approved Home/Cases/Case Details branches retain their rendered decisions. |
| `src/index.css` | Append Tasks-only navy/gold hero, compact metrics/records, filter, board/calendar, dialog and mobile/reduced-motion rules. Dedicated body-portalled Tasks menus are bounded by the viewport, with wrapping options, only while the Tasks root is mounted. Every prior CSS byte and Client token/selector is preserved. |
| `tests/staff-tasks/adapters.tsx` | Synthetic, reactive offline tasks/queries/commands, failure/retry and capability states. Reuses existing navigation/portal adapters; no network/database access. |
| `tests/staff-tasks/fixture.tsx` | Mount actual Staff layout and Tasks page with existing providers and the isolated adapters. |
| `scripts/qa/verify-staff-tasks.mjs` | Retained offline actual-component approach; responsive four-view/filter/pagination/command, accessibility and CMS-contrast checks. Writes generated evidence only below ignored `.local/qa/`. |
| `doc/ui-reference/staff-admin/SESSION-07-ENGINEERING-REPORT.md` | This scope, preservation and verification record. |

No shared UI primitive, query hook, backend, authentication, permission or domain
contract was changed. No approved Staff Home, Cases/filter, Case Details, Admin or
Client page source was redesigned. No image asset changed.

## Reference adaptations and design decisions

Reuse the existing Nepal image with CMS hero image precedence, navy surface, gold
heading/actions, compact operational typography and quiet semantic cards. Hero
counts are removed because the same four concepts remain in the KPI row. Overdue
information remains visible in Due today's helper and on actual overdue records.
Metrics use the original accessible collection and calculations; they are not
invented totals, trends or filtered-page counts. The open helper now explicitly
says accessible tasks. Workload has its own truthful team-member context.

List is initially selected, as permitted. The original Kanban, List, Calendar and
permission-gated Workload labels/translations remain. A coordinated two-row
toolbar keeps primary filters visible; existing Overdue, Cancelled and Archived
toggles sit in the labelled More Filters dialog. Mobile view labels remain visible.
The task rows retain API order and twelve-record pagination. No sorting control,
new due-date filter, extra scope, Today/Insights module or fake task number is added.

Details remains one real edit dialog rather than duplicating edit logic in a new
master/detail workflow. Its actual selected title, status/priority, case, assignee
and preferred BS/AD due date precede the grouped existing form. Existing subtasks
and comments follow it. No fake activity/documents tabs, client contacts,
created-by information or attachments are copied from the concept.

## Functionality-preservation inventory

| Existing capability | Preserved behavior |
| --- | --- |
| My Tasks / All Tasks | Original assigned-to scope, default My Tasks and existing session identity. |
| Search | Original case-insensitive title, description, case number/title search. No new endpoint or advertised unsupported client search. |
| Assignee / Case / Priority / Status | Original predicates, fetched options and AND composition; exact `todo`, `in_progress`, `done`, `cancelled` and `low`, `medium`, `high`, `urgent` values. |
| Overdue / Cancelled / Archived | Original helpers, cancelled-column behavior, archived-only filtering and `includeArchived` query loading. Reset still restores the original default scope. |
| List / pagination | Original order and twelve-record page model; filter/view changes reset pagination. View/title controls open the same selected-task dialog. |
| Board | Original drag data, drop status update and cancelled restrictions; complete/reopen callbacks retained. Editing Status and saving is the keyboard equivalent of a drop. |
| Calendar | Actual AD date placement, existing BS labels, month navigation, Today and event opening; internal horizontal scrolling at phone widths. |
| Workload | Existing `cases.view_all` gate, backend rows/proportions and assignee-to-list navigation. No permission expansion. |
| Create / edit | Existing required fields, validation, loading, error/toast/retry and original command payloads. |
| Detail fields | Title/description, assignee/case, hearing/document, priority/status, AD→BS due conversion, category/recurrence, client visibility, reminder and watchers all retained. |
| Subtasks / comments | Existing creation, completion, author/date/content, Enter handling and loading/disabled controls. |
| Complete / reopen | Original `done` and `in_progress` transition; cancelled completion remains disabled. |
| Archive / restore / delete | Original commands and native confirmations; cancelled confirmation submits no command. No live-owner mutation test. |
| Due scan | Original reminder command/button retained. Only synthetic adapters execute it in QA. |

The source guard compares tokenized original/current initializers for queries,
permissions, filters, calculations and all task handlers. Eighteen existing field
contracts are compared separately; formatting does not conceal payload changes.

## Screenshots and actual preview

Real authenticated application: **http://localhost:3001/staff/tasks**.

Generated evidence is ignored under:

```text
D:\lexnepal\.local\worktrees\ui-staff-admin-upgrade\.local\qa\session-07\
```

`before/` contains authenticated 1440/390 light workspace/details captures from the
starting source. `after/` contains authenticated application captures, not fixtures:

| View | Desktop / mobile naming |
| --- | --- |
| Page top / list | `staff-light-1440-list-top.png`, `staff-light-390-list-top.png` |
| List records and View controls | `staff-light-1440-list-content.png`, `staff-light-390-list-content.png` |
| Page final bottom / footer | `staff-light-1440-list-bottom.png`, `staff-light-390-list-bottom.png` |
| More Filters / applied filters | `staff-light-{1440,390}-filters-open.png`, `staff-light-{1440,390}-filters-applied.png` |
| Case filter dropdown | `staff-light-{1440,390}-cases-open.png` |
| Board | `staff-light-{1440,390}-board.png`, `staff-light-390-board-scroll.png` |
| Calendar | `staff-light-{1440,390}-calendar.png` |
| Task Details | `staff-light-{1440,390}-details-top.png`, `-details-subtasks.png`, `-details-comments.png`, `-details-bottom.png` |
| New Task | `staff-light-{1440,390}-new-task.png` |

Dark counterparts use `staff-dark-`. The local normal Staff account is not
authorized for Workload, so no real Workload capture is fabricated. Clearly named
`component/fixture-light-{1440,390}-workload.png` captures exercise the authorized
synthetic capability. That directory also contains populated synthetic detail,
subtask/comment, long-label, empty and loading evidence. Fixture captures are not
authenticated application behavior.

Real records include some assignee IDs absent from the permitted directory and
some missing descriptions/dates. The UI truthfully shows Name unavailable/Not set;
accounts, assignments and records were not invented or repaired for screenshots.
Real before/after captures are not deterministic pixel goldens. Protected-page
comparisons below use equal synthetic data, font and clock instead.

## Verification results

These are checks executed in this session, not carried-forward passes. Browser
and test workers were bounded. This is a development UI review, not release
certification.

| Check | Executed result |
| --- | --- |
| `git diff --check` | PASS, exit 0. |
| `npm run lint` | PASS, exit 0 on final application/QA source. No rule disabled. |
| `npm run typecheck` | PASS, exit 0, including Next route type generation. |
| Focused work/Cases/filter units | 60 passed, ten suites, one worker. |
| Full units | 641 passed / five inherited failures / 646 total; expected exit 1. Exact failure names match the approved starting checkpoint. No unit assertion/count changed. |
| Retained Tasks actual-component suite | PASS: 28 cells, all four views, pagination/filter combinations, rare states and fourteen CMS/theme samples; 68 Axe scans with zero violations, zero external requests and zero page errors. |
| Final-source command rerun | PASS: 13 isolated command attempts covering create, edit, failure/retry, complete/reopen, AD/BS fields, subtasks, comments, archive/restore/delete, drag/drop and reminders. Validation and cancelled confirmations submit no command. |
| Actual authenticated application | PASS: ten width/theme cells at 1440, 1024, 768, 390 and 360px; the three permitted views, filters, scope, empty results, dialog opening/dismissal and final scroll position. Twenty list/detail Axe scans clear. No page-wide/main horizontal overflow or page errors. |
| Affected menu/calendar/touch recheck | PASS: ten actual width/theme cells after the final scoped menu fix; dropdown bounds and long-label wrapping, genuine Done + High filtering, ten Calendar Axe scans, and trusted board/calendar swipes at 390/360 in both modes. Two additional populated fixture screenshot cells are explicitly synthetic. |
| Details/mobile focus and clearance | PASS: named checkbox controls, view/title/card-body opening, modal field labels, Escape/focus return, focus fallback after removal, reachable dialog actions and bottom footer/Top above navigation. No owner-domain writes. |
| Staff Home | 30 exact image pairs unchanged, five widths/both modes/top-middle-bottom. |
| Staff Cases | 30 exact image pairs unchanged, including List, Board and New Case dialog. |
| Case Details | 28 Staff and fourteen bounded Admin exact geometry/content/image pairs unchanged across all seven tabs. Both-role isolated command checks pass. This does not resolve Session 06's separate intermittent strict Admin dialog raster issue. |
| Client functional | 104 passed, one worker, no retries. |
| Client visual | 24 exact image-hash pairs unchanged across twelve screens at 1440/360px with equal fixture data/font/clock. Approved references were not regenerated. |
| Fast Refresh | Actual application edit/restore passed in the same browser document, with exact source restoration. Final preview captures separately assert the current helper text and bounded dropdown. |
| Source and original checkout | 1,148 protected upgrade files and 1,028 tracked original-checkout files unchanged; original dirty state/HEAD preserved. Thirty-three original query/calculation/permission/handler initializers and eighteen field contracts unchanged. Prior CSS byte-identical; index empty, branch/HEAD unchanged. |

The full actual-component run preceded the last menu-class/collision-padding and
menu-only CSS correction. The final-source command, lint, typecheck, units and
source guard were rerun; the affected rendered menus were checked in all ten
actual width/theme cells. This sequence is not represented as a second complete
28-cell run after that last narrow correction.

Across fourteen CMS/theme samples, measured selected-text contrast was at least
**16.7825:1** and focus contrast at least **3.7326:1**, exceeding 4.5:1 and 3:1
respectively. The 68 fixture and 30 actual Axe scans cover executed states rather
than claiming universal accessibility certification. Touch targets and visible
keyboard focus were also checked directly. Both CSS presentations and reduced
motion are supported without altering shared Client defaults.

The five full-unit failures remain enabled and unchanged:

1. `CUI-09 client checklist contract uses solid progress fill and freezes prior Client phases`.
2. `R7 Client Case portal consumes useClientCases / useClientCase, not Staff CaseDto hooks`.
3. `R7 Client Case portal does not change Client shell, KYC, booking, or STAFF_ROLES`.
4. `dashboard WCAG contrast contract client light keeps boundaries, focus, and chart series distinguishable`.
5. `dashboard WCAG contrast contract rejects pure black and unapproved one-off colors in dashboard UI source`.

### Diagnostics and corrections

- Initial isolated checks passed all four views, filters and original command
  workflows. Expanded scans found genuine contrast issues in the inherited Ghost
  Reset text in dark mode and the translucent overdue Calendar treatment. Scoped
  semantic foreground/surface rules correct them; no assertion was suppressed.
- Archived query changes could unmount the original More Filters trigger. Its
  stable local close callback now restores focus to the current trigger, or the
  main region during loading. Shared Dialog defaults remain unchanged.
- Archive/delete can remove a Task Details opener. A local post-close focus
  fallback returns to New Task only when normal focus return has no surviving
  target. The original archive/delete handlers are unchanged.
- The opened Cases menu genuinely exceeded the phone viewport. Only the four
  Tasks selects now receive collision padding and a dedicated portal class;
  scoped width bounds and wrapping labels fix it. Final checks cover all ten
  width/theme cells without changing the shared Select primitive.
- Expanded rare-state scans caught an accessible-name attribute on a generic
  loading container. It now has `role="status"` and `aria-busy`; the loading
  skeleton also follows the initial List layout.
- New fixture typing and stable reactive snapshots resolved initial lint
  diagnostics without exceptions or suppressed rules.
- One initial view locator used a Lucide alias class instead of the accessible
  view name. The QA locator was corrected; production view logic was not changed.
- Early bottom captures had not settled inherited CSS smooth scrolling. Final
  captures explicitly settle scroll position and verify the bottom. Tasks also
  respects reduced motion on its outer main scroll region.
- Next automatically recycled its server child during verification. One native
  run timed out; a fresh authenticated render had no page/API errors and the exact
  upgrade worktree/Webpack ancestry was reverified. No manual restart or config
  change was used as a shortcut. Diagnostic logs remain local.

### Commands and reproducibility

Executed from the upgrade worktree:

```powershell
git diff --check
npm run lint
npm run typecheck
node node_modules/vitest/vitest.mjs run tests/unit/work-contracts.test.ts tests/unit/staff-case-filters.test.ts tests/unit/cases-r2-domain.test.ts tests/unit/cases-r4-ui.test.ts tests/unit/cases-r5-staff.test.ts tests/unit/cases-r6-admin.test.ts tests/unit/cases-r8-integrations.test.ts tests/unit/cases-r9-a11y.test.ts tests/unit/cases-r11-verification.test.ts tests/unit/cases-r12-qa.test.ts --maxWorkers=1
node node_modules/vitest/vitest.mjs run tests/unit --maxWorkers=1 --reporter=json --outputFile=.local/qa/session-07/unit-signoff.json
$env:STAFF_TASKS_ARTIFACT_DIR = Join-Path (Get-Location) '.local/qa/session-07/component'
node scripts/qa/verify-staff-tasks.mjs
$env:STAFF_TASKS_ARTIFACT_DIR = Join-Path (Get-Location) '.local/qa/session-07/commands-final'
node scripts/qa/verify-staff-tasks.mjs --commands-only
node .local/qa/session-07/live.mjs
node .local/qa/session-07/supplement.mjs
node .local/qa/session-07/refresh.mjs
node .local/qa/session-07/capture-final.mjs
$env:CASE_DETAIL_ARTIFACT_DIR = Join-Path (Get-Location) '.local/qa/session-07/detail-commands'
node scripts/qa/verify-case-detail.mjs --commands-only
node .local/qa/session-07/protected-pages.mjs home
node .local/qa/session-07/protected-pages.mjs listing
node .local/qa/session-07/protected-details.mjs
$env:CUI20_ARTIFACT_DIR = Join-Path (Get-Location) '.local/qa/cui-20/session07'
node node_modules/@playwright/test/cli.js test --config playwright.functional.config.ts --workers=1
$env:CUI19_ARTIFACT_DIR = Join-Path (Get-Location) '.local/qa/cui-19/session07'
node scripts/qa/build-client-visual-fixture.mjs
node .local/qa/session-07/client-pixels.mjs
node .local/qa/session-07/preserve.mjs
```

Evidence manifests: `final-checks.json`, `unit-summary.json`, `unit-signoff.json`,
`component/results.json`, `commands-final/results.json`, `after/results.json`,
`supplement.json`, `capture-final.json`, `refresh.json`, `preservation.json`,
`protected-home/results.json`, `protected-listing/results.json`,
`protected-details/results.json` and `client/results.json`. Logs and generated
screenshots remain ignored local evidence. `before/` has four actual captures;
the final `after/` set has 54 actual images, including four new opened-case-menu
captures. `component/` contains thirteen clearly synthetic captures.

The retained Tasks runner is self-contained for current offline component
contracts. Local before/current comparison helpers additionally require the
ignored snapshots exported from starting HEAD; they are not approved goldens.
Do not reuse the local authenticated storage state as a committed test fixture.

For normal development, continue the existing supported Webpack server. If a
future restart is necessary, first verify port ownership and ancestry, then use
the upgrade worktree and its existing ignored local configuration:

```powershell
$env:LEXNEPAL_DEV_WARMUP = 'off'
npm run dev -- --webpack
```

This session did not restart that server or change its launch configuration.
Existing local MySQL and Mailpit services/data are retained; no isolated QA
database is required merely to preview these UI changes normally.

## Protected areas and limits

Client source, tokens, authoritative documents and approved reference files are
protected. New styles are Tasks-scoped; pre-existing CSS is byte-identical. The
Staff layout change applies only to the exact Tasks route. Protected functional
and visual comparisons use the existing isolated actual-component architecture;
approved Client goldens are not regenerated. Such comparisons prove checkpoint
preservation, not new DOCX/reference acceptance or release certification.

The five inherited failures remain the accepted baseline: two `cases-r7-client`
hook/shell assertions, the `cui-09-client-checklist-contract` freeze/progress regex
assertion, and the two `dashboard-contrast` Client-boundary/source-color assertions.
Exact names and fresh counts are recorded in the verification section. No accepted
failure is hidden by changing a test or replacing its baseline.

Session 06's intermittent strict Admin rounded-corner raster comparison and its
historical touch automation rerun remain documented limitations; a bounded passing
comparison here would not prove those issues universally resolved. Authenticated
mutation/database integration, worker/scanner and build/release QA require a
verified isolated QA environment and are not run against owner data. Actual
application QA allows read-only domain requests; commands run only in fixtures.
The previously documented missing CMS image remains outside this upgrade.

## Review status and next step

Implementation and the executed development checks are complete; owner/Technical
Lead visual approval is pending. The real Tasks preview and Fast Refresh remain
available. Only the ten intended source/fixture/QA/report files differ. No
commit, push, merge, deployment or next-page implementation is authorized here.
After approval, the next bounded visual upgrade can be the existing Staff Hearings
page, retaining real localhost preview and isolated commands for writes.

## Final Task Details polish — 16 October 2026

The Technical Lead approved the workspace, filters, views, Create dialog and
mobile layout. This follow-up changes only the remaining Task Details hierarchy;
the earlier verification tables describe the initial Session 07 implementation.
Fresh results for this final pass are recorded here separately.

### Starting state and exact files

The correct upgrade worktree, `ui/staff-admin-upgrade` and unchanged HEAD
`ba3309acf7677f86a2ee9749245fbdd4f046cbb0` were verified. All ten existing
uncommitted Session 07 files were preserved. No branch/index change, commit,
push, deployment, server restart, environment edit or owner-data mutation.
Port 3001's listener and its existing Webpack CLI/launcher ancestry were verified
in the upgrade worktree. Installed Next.js Client Component, scoped CSS and Fast
Refresh guidance and the second approved Task Management image were reviewed.

Only these five already-intended Session 07 files changed in this pass:

| File | Final-polish change |
| --- | --- |
| `src/views/staff/StaffTasksPage.tsx` | Move the existing record/edit actions below Comments; associate Save with the original task form using native `form`; expose Watchers as a fieldset; explicitly retain independent Add/Post buttons. |
| `src/index.css` | Append detail-dialog-only dividers and bottom action-area styles, including a full-width mobile Close/Save row. All preceding CSS bytes remain identical. |
| `scripts/qa/verify-staff-tasks.mjs` | Verify action order, external form association, native required-field validation, unsent subtask/comment drafts on Save, and independent Add/Post buttons as well as Enter submission. Existing command/confirmation checks retained. |
| `tests/staff-tasks/fixture.tsx` | Match the actual application's existing `<Toaster richColors position="top-right" />`; no production notification behavior changes. |
| `doc/ui-reference/staff-admin/SESSION-07-ENGINEERING-REPORT.md` | Append this refinement and fresh evidence without replacing prior results or limitations. |

### Action and command semantics

The source verified three independent operations: `handleSaveEdit` updates the
task; `handleAddSubtask` creates a child task immediately; `handleAddComment`
posts a comment immediately. Subtasks/comments were already outside the edit
form and remain outside it. They are not queued for Save.

The dialog now follows: title/summary, Task information, Linked records,
Schedule & visibility, Watchers, Subtasks, Comments, existing completion metadata,
then final actions. Archive/Restore and Delete retain their original conditions,
callbacks and native confirmations in a separate record-action group. Close/Save
are the last controls. Save's native `form="staff-task-edit-form"` points to the
same form and unchanged `onSubmit={handleSaveEdit}`, preserving browser validation
and the original payload/disabled state. Footer guidance explicitly distinguishes
Save from Add/Post.

The action area stays in normal dialog scroll flow. It cannot cover form fields
or the composer controls as a sticky overlay. Desktop uses separated action groups;
phones receive a separate, equal-width Close/Save row. Existing dialog height and
safe-area clearance remain in use. No extra route, tab, command or record added.

### Fresh screenshots and preview

Evidence root (ignored local files):

```text
D:\lexnepal\.local\worktrees\ui-staff-admin-upgrade\.local\qa\session-07\final-polish\
```

`before/` contains four newly captured authenticated desktop/mobile comparison
images. `after/` contains twelve fresh authenticated images: top/bottom at
1440, 390 and 360px in light/dark presentations. They are real application captures,
not copied old screenshots or fixtures.

| Review capture | Filename under `after/` |
| --- | --- |
| Desktop top | `staff-light-1440-details-top.png` |
| Desktop bottom/final actions | `staff-light-1440-details-bottom.png` |
| Mobile top | `staff-light-390-details-top.png` |
| Mobile bottom/final actions | `staff-light-390-details-bottom.png` |

360px counterparts replace `390` with `360`; dark counterparts replace
`staff-light-` with `staff-dark-`. Use the real preview at
**http://localhost:3001/staff/tasks**, then select an existing task's View action.
The existing Webpack server remains running. No owner-domain write was used to
prepare screenshots or test actions.

### Fresh verification and remaining limits

| Check | Final-polish result |
| --- | --- |
| Lint / typecheck | Both PASS, exit 0. Application/fixture/QA JavaScript and TypeScript remained unchanged after this pair; the final follow-up was one detail-only mobile CSS grid property. |
| Focused work/Cases/filter units | 60 passed, ten suites, one worker. |
| Full units | 641 passed, the same five inherited failures, 646 total. Exit 1 is expected; failure names were compared directly against the earlier Session 07 manifest. No unit assertion/count changed. |
| Task command suite | PASS on final source: fifteen synthetic command attempts, zero external requests and zero page errors. Includes exact edit payload, validation, failure/retry, independent Add/Post and Enter operations, unsent drafts on Save, archive/restore/delete confirmations and existing completion/drag/reminder flows. |
| Actual Task Details | Six unique final-CSS cells: 1440, 390 and 360px, light/dark. Seven completed dialog Axe scans including the repeated desktop cell, zero violations. All existing fields and the independent inputs reachable by focus; final actions remain in the viewport and above phone navigation, without horizontal overflow. |
| Keyboard / dialog | PASS: external Save form association, field reachability, bottom scrolling, Save-to-close-button Tab wrap, Escape and return to the real View opener. Save was focused, not submitted, against owner data. Phone Close/Save groups fill the footer's content width. |
| Approved Tasks presentation | Six exact image-hash pairs unchanged: List, More Filters and Create at 1440 light / 390 dark with identical synthetic data/font/clock and pre-polish versus current CSS. No approved golden regenerated. |
| Source / protected portals | 1,153 files outside this five-file refinement unchanged from the final-polish snapshot. The complete page source before Task Details—including listing, toolbar, four views and Create—is identical. All preceding CSS is byte-identical; added selectors require the Task Details dialog. The original Session 07 guard also passes: 1,148 protected upgrade files, 1,028 original-checkout files, 33 business initializers and eighteen field contracts preserved. |
| Preview / Git / data | Correct upgrade Webpack server retained on 3001; current Task Details rendered from the edited source. HEAD/branch and empty index unchanged. No database, account, environment, permission, API or production notification change. |

The broad 104-case Client functional run, 24 Client visual pairs and the complete
Home/Cases/Case Details screenshot matrices above are previous Session 07 evidence;
they were not repeated for this dialog-only polish. Fresh source/isolation guards
and the six affected Tasks comparisons protect those areas without another
unrelated screenshot sweep. Session 06's intermittent strict Admin raster issue,
five inherited units and isolated authenticated mutation/release-QA prerequisites
remain open. This is not release certification.

Two verification diagnostics were corrected transparently:

- The first isolated retry was obstructed by the fixture's default bottom-right
  toast. The actual app's `src/app/providers.tsx` already uses rich top-right
  notifications. Matching that existing configuration in the fixture resolved
  the mismatch without changing production toasts, hiding errors or forcing clicks.
- An initial mobile image showed the new action grid using a content-sized
  column. An explicit `minmax(0,1fr)` column fixes it; final browser checks assert
  the Close/Save group fills the footer. Final command/comparison checks were rerun.

The final-CSS native run passed three light cells, then timed out waiting for the
Tasks view in a new desktop context. A separate fresh probe confirmed session API
200, an existing identity, the real Tasks headings and no page errors. A bounded
remaining-cell rerun passed desktop light and all three dark cells. Their combined
six-cell coverage is recorded in `verified-results.json`; the interrupted run/log
is retained rather than reported as an uninterrupted six-cell pass. A desktop
capture also preceded the dependent directory data; the final desktop capture
waits for actual assignee options, without inserting names or altering any query.
The complete cause of the readiness timeout was not established. No server restart,
credential change or data modification was used to clear it.

Executed final-polish commands (one worker / sequential browsers):

```powershell
npm run lint
npm run typecheck
# Same ten focused unit files listed in the original command inventory:
node node_modules/vitest/vitest.mjs run tests/unit/work-contracts.test.ts tests/unit/staff-case-filters.test.ts tests/unit/cases-r2-domain.test.ts tests/unit/cases-r4-ui.test.ts tests/unit/cases-r5-staff.test.ts tests/unit/cases-r6-admin.test.ts tests/unit/cases-r8-integrations.test.ts tests/unit/cases-r9-a11y.test.ts tests/unit/cases-r11-verification.test.ts tests/unit/cases-r12-qa.test.ts --maxWorkers=1
node node_modules/vitest/vitest.mjs run tests/unit --maxWorkers=1 --reporter=json --outputFile=.local/qa/session-07/final-polish/units.json
$env:STAFF_TASKS_ARTIFACT_DIR = Join-Path (Get-Location) '.local/qa/session-07/final-polish/commands'
node scripts/qa/verify-staff-tasks.mjs --commands-only
node .local/qa/session-07/final-polish/protected-tasks.mjs
node .local/qa/session-07/final-polish/live.mjs before
node .local/qa/session-07/final-polish/live.mjs after
node .local/qa/session-07/final-polish/readiness.mjs
node .local/qa/session-07/final-polish/live.mjs after --remaining
node .local/qa/session-07/final-polish/preserve.mjs
node .local/qa/session-07/preserve.mjs
git diff --check
```

Final local manifests: `checks.json`, `unit-summary.json`, `commands/results.json`,
`protected-tasks.json`, `after/results.json`, `after/remaining-results.json`,
`verified-results.json`, `readiness.json` and `preservation.json`. The original
owner/source guard output is `original-preservation.log`. An initial check launcher
used a nonexistent project-local npm CLI; it was corrected to the installed npm
launcher before the recorded passing lint/typecheck commands. This was a tooling
startup error, not a product test failure.

Task Details final polish is ready for Technical Lead review. The approved Tasks
workspace remains unchanged. All Session 07 work is still uncommitted and unpushed;
no Session 08, other page, database action or deployment has started.

## Final scrolling and action-placement verification — 16 October 2026

### Verified cause and correction

Fresh authenticated inspection confirmed the latest source is running in the
upgrade worktree on port 3001, with the existing Webpack process. HEAD is still
`ba3309acf7677f86a2ee9749245fbdd4f046cbb0`; all existing uncommitted work is retained.

The dialog already scrolled: the pre-correction desktop probe measured a 1,135px
scroll range within an 852px-high window, and Page Up moved it. The usability
defects were its inherited nearly-white scrollbar colors
(`rgba(255,255,255,.22)` / `rgba(255,255,255,.03)`), no reserved gutter or scroll
containment, and three additional scroll containers in Watchers/Subtasks/Comments.
Watchers alone had a separate 14px scroll range in the real record. These made
the intended scroll surface difficult to discover and gestures less predictable.

Task Details now uses one primary modal scroll surface. The three related lists
flow normally; native textarea editing remains native. Details and Create Task
receive a stable scrollbar gutter, opaque semantic thumb/track colors, scroll
containment and explicit scroll guidance. Their existing dynamic viewport height
limits remain intact. The Staff canvas is explicitly locked while either modal
is open, in addition to the existing body lock. The before probe did not reproduce
background movement, so that additional lock is not described as a reproduced
background-scroll defect. No shared Dialog primitive was changed.

The live DOM **already placed all four final actions after Subtasks and Comments**
before this correction. That source/keyboard order is preserved, not simulated
with CSS ordering. The older `.local/qa/session-07/after/` captures predate the
`final-polish/after/` captures and represent the earlier layout. The precise files
used in the latest submission were not supplied, so their identity cannot be
proven; the fresh uniquely named images remove that ambiguity. Current DOM checks,
Tab traversal and screenshots all show Comments followed by Archive/Delete and
Close/Save. Native form association and independent Add/Post commands are unchanged.

Only four existing Session 07 files changed in this correction:

- `src/views/staff/StaffTasksPage.tsx`: remove the three nested list scroll limits;
  clarify scroll guidance in Details/Create descriptions. Final action markup,
  form controls, handlers and permissions remain unchanged.
- `src/index.css`: append styles limited to those two Staff Tasks modals and the
  Staff canvas while either is open. All preceding CSS bytes remain identical.
- `scripts/qa/verify-staff-tasks.mjs`: retain command tests and assert the primary
  scroll surface, stable gutter, containment and non-scrolling related lists.
- This engineering report: current evidence pointer and this concise follow-up.

Create Task shares the corrected scrollbar/containment pattern because it inherited
the same colors. Its form, design hierarchy, validation and submission handler are
unchanged. The accepted listing, filters, Kanban, Calendar and Workload source is
untouched. No dependency, API, schema, authentication, permission or database change.

### Current authenticated screenshots

Folder opened in File Explorer:

```text
D:\lexnepal\.local\worktrees\ui-staff-admin-upgrade\.local\qa\session-07\final-scroll-verification\
```

| Fresh actual capture | Filename |
| --- | --- |
| Desktop top | `session07-SCROLL-VERIFIED-light-1440-900-details-top.png` |
| Desktop Comments followed by final actions | `session07-SCROLL-VERIFIED-light-1440-900-comments-final-actions.png` |
| Mobile top | `session07-SCROLL-VERIFIED-light-390-844-details-top.png` |
| Mobile Comments followed by final actions | `session07-SCROLL-VERIFIED-light-390-844-comments-final-actions.png` |
| Mobile Create top | `session07-SCROLL-VERIFIED-light-390-844-create-top.png` |
| Mobile Create bottom | `session07-SCROLL-VERIFIED-light-390-844-create-bottom.png` |

Dark counterparts replace `light` with `dark`: twelve new actual screenshots total.
They were captured from the real authenticated application, with domain writes
blocked, not copied or renamed. `before/diagnosis.json` and its two actual desktop
captures preserve the pre-correction measurements. Scrollbar painting can vary by
browser/OS capture behavior; the explicit guidance and reserved gutter make the
scroll surface discoverable without relying solely on a native thumb image.

### Focused verification

| Check | Fresh result |
| --- | --- |
| Lint / typecheck / whitespace | `npm run lint`, `npm run typecheck` and `git diff --check` PASS. |
| Focused task contracts | `work-contracts.test.ts`: four passed. |
| Full units | 641 passed / the same five inherited failures / 646 total. Exact failure names match the previous Session 07 manifest; exit 1 remains expected. |
| Existing dialog/command suite | PASS: fifteen isolated attempts, zero external requests/page errors. Existing save validation/retry/payload, independent Add/Post/Enter, subtask completion, archive/restore/delete confirmations, creation, status/drag and reminder checks retained. New primary-scroll/list-flow assertions pass. |
| Actual responsive dialogs | Ten width/height/theme cells: 1440×900, 768×900, 390×844, 360×740 and short 390×480, each light/dark. Both Details and Create stay in bounds, with no horizontal overflow or mobile navigation overlap. |
| Actual scrolling / focus | Wheel and keyboard top→bottom→top pass in every cell; trusted CDP touch swipes pass in all six phone/theme cells. Input values and temporary unsaved drafts survive scrolling and are restored before captures. Every tested field and final action is reachable; Escape, reopen, focus return and background lock/restoration pass. |
| Actual action order / accessibility | Subtasks and Comments precede the unchanged footer in DOM and visible layout. Native Tab order is Comments input → Archive → Delete → Close → Save → modal close button. Twenty actual Details/Create Axe scans have zero violations; no nested list scrollers remain. |
| Approved Tasks preservation | Four exact image pairs unchanged: List and More Filters at 1440 light / 390 dark with equal synthetic data/font/clock. Create's authorized scrollbar change is covered by native and command checks rather than asserting old pixels. |
| Protected areas | 1,154 files outside this four-file correction unchanged. Workspace/filter markup and final-action markup unchanged; Create differs only in guidance text. Prior CSS byte-identical; new rules are restricted to Task Details/Create and the Staff canvas while either is open. Original Session 07 guard passes: 1,148 protected upgrade files, 1,028 original-checkout files, 33 business initializers and eighteen field contracts preserved. |
| Git / preview / data | HEAD/branch and empty index preserved. Existing Webpack preview and local services retained. No commit, push, merge, deployment, owner-domain write or Session 08 work. |

Commands: `npm run lint`; `npm run typecheck`;
`node node_modules/vitest/vitest.mjs run tests/unit/work-contracts.test.ts --maxWorkers=1`;
full units with `--maxWorkers=1 --reporter=json`;
`node scripts/qa/verify-staff-tasks.mjs --commands-only` using
`STAFF_TASKS_ARTIFACT_DIR=.local/qa/session-07/final-scroll-verification/commands`;
and local `verify-live.mjs`, `protected-tasks.mjs`, `preserve.mjs`, the original
Session 07 `preserve.mjs`, and `git diff --check`. Native browsers/tests ran
sequentially with bounded workers. Actual screenshots were visually inspected.

Local evidence: `before/diagnosis.json`, `results.json`, `checks.json`,
`unit-summary.json`, `commands/results.json`, `protected-tasks.json`,
`preservation.json`, `original-preservation.log` and individual logs under the
new evidence root. No approved visual reference was generated or replaced.

Physical trackpad hardware was not directly exercised; native wheel scrolling
and trusted touchscreen gestures were verified. The broad unchanged Client/Admin
and Staff Home/Cases visual suites were not repeated for this scoped correction.
Their sources and shared modal defaults remain protected by fresh guards. The
inherited strict Admin raster limitation, five unit failures and isolated
authenticated mutation/release-QA prerequisites remain documented above; this is
not release certification. Normal local preview does not require a new database.

The fresh output folder is open in File Explorer. Current Details scrolling,
Create scrolling and the genuine final action order are ready for Technical Lead
review at http://localhost:3001/staff/tasks. All work remains uncommitted.

## Approved development checkpoint

The Technical Lead authorized one checkpoint on `ui/staff-admin-upgrade`, with
the ten-file inventory above. Pre-commit review confirmed expected local/remote
starting HEAD `ba3309acf7677f86a2ee9749245fbdd4f046cbb0`, no staged artifacts or
sensitive-pattern findings, and preservation of the original checkout and protected
portal source. A fresh offline rebuild of the current Tasks JavaScript and CSS
matched the final scrolling/command verification bundle byte-for-byte. Recorded
lint/typecheck, four focused task passes, fifteen isolated command attempts,
twenty native modal Axe scans and 641 unit passes/five unchanged inherited failures
therefore cover the approved application source. Only the report's approval and
preflight notes changed during checkpoint preparation; no redesign or feature work
was performed. One fresh browser wait timed out; a follow-up authenticated probe
rendered Tasks with successful data requests and zero page errors, without a code,
configuration or server change. The known CMS image 404 remains unchanged.

Available GitHub CI contains verification steps, not deployment steps; its direct
push trigger is `main`. The repository deployment script requires a separate
manual invocation and is not run. No merge, deployment, owner-data change or
Session 08 implementation is included in this checkpoint authorization. This is
a development checkpoint, not release certification.
