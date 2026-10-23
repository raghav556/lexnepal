# Session 05 — Final Staff Cases filters, views and row actions

16 October 2026, Asia/Katmandu. This completes the requested controls on the
approved listing; it does not redesign another page. Owner/Technical Lead visual
approval and authorization for a development checkpoint were received on 16 October
2026 after review of the seven requested actual screenshots and this report.

## Starting state and controlling sources

- Worktree: `D:\lexnepal\.local\worktrees\ui-staff-admin-upgrade`.
- Branch: `ui/staff-admin-upgrade`.
- Starting HEAD: `0c8998d6bc228bd9811287bc37a3b49af7ac62a6`; clean worktree/index.
- Read `AGENTS.md`, installed Next.js Client Component/Fast Refresh guides,
  Session 05/06 reports, actual shared consumers, case/status contracts, query
  hooks, dashboard/select/dialog/pagination/floating-position components and tests.
- Inspected `Srimar Law Cases Dashboard.png` directly. Its coordinated toolbar,
  selected view and visible View action guide this correction. Fictional Pending/
  Overdue lifecycle categories, extra summary metrics and ellipsis commands were
  not copied. The current four summary concepts and Nepal/navy/gold hero remain.
- Snapshot records 1,150 tracked upgrade files and 1,028 tracked original-checkout
  files. Existing owner edits, Client references and the complete Session 06
  implementation/report are protected; the original checkout is read-only.
- Verified the existing port-3001 process directory and `--webpack` CLI/wrapper.
  No competing server, restart command, environment/configuration edit, dependency
  change or database setup was performed.

## Source-verified gap and implementation

The workspace already fetched accessible cases, clients, directory entries and
hearings, searched four existing fields, normalized lifecycle statuses, paginated
ten records and rendered a read-only board. Staff previously received separate
status buttons and a **By status** button; its five-column list exposed title
links but no visible View action. These capabilities support the requested filters
without a new API or backend filtering architecture.

The Staff branch now renders one coordinated toolbar:

**Search | All Statuses | All Lawyers | List View | Board View | More Filters**

At 1440px these controls share one row. At compact widths Search takes one row,
Status/Lawyer another and the two view buttons plus More Filters a third. Original
metrics, case identity/practice/file-date metadata, badges, hearing fallback/dual
dates, case ordering, New Case dialog and shell/branding remain in use.

### Exact changed files

| File | Rationale |
| --- | --- |
| `src/components/cases/cases-workspace.tsx` | Staff-only additional local filter state/predicate, toolbar branch, reset dependencies and informative empty-result reset action. Admin keeps its existing rendered controls and lifecycle behavior. |
| `src/components/cases/staff-case-filters.ts` | Small typed option/predicate helpers over fetched records. No hook, network request, domain command or stored-data modification. |
| `src/components/cases/staff-cases-filters.tsx` | Staff toolbar, existing Select primitives, scoped portal, existing Dialog/floating-position utility and responsive More Filters panel. Local Escape handling preserves the containing dialog when dismissing a nested dropdown. |
| `src/components/cases/staff-cases-list.tsx` | Sixth Actions column and named View links to the existing detail path. Distinguish unavailable assigned names from genuinely unassigned records. Existing title links and metadata remain. |
| `src/index.css` | Append only Staff Cases selectors for toolbar, scoped filter menus/panel and View links. Every prior stylesheet byte, including all Session 06 and Client rules/tokens, remains unchanged. |
| `tests/unit/staff-case-filters.test.ts` | Six behavioral tests for exact IDs, AND composition, order, duplicate names, unassigned versus unknown IDs and accessible option derivation. |
| `tests/unit/cases-r5-staff.test.ts` | Update the obsolete Staff “By status” naming contract to Staff Board View plus unchanged Admin By status; retain read-only/no-drag assertions. Test count is unchanged. |
| `tests/staff-cases/adapters.tsx` | Opt-in synthetic filtering edge state. Default 23 records/directories remain identical for existing consumers and comparisons. |
| `tests/staff-cases/fixture.tsx` | Existing QueryClientProvider supports Session 06's cache-reading breadcrumb during fixture link/back navigation. No production auth/data behavior changes. |
| `scripts/qa/verify-staff-cases.mjs` | Exercise new selects, combinations, reset, View links, focus and edge data; preserve creation/CMS/Admin checks. Optional explicit checkpoint source/CSS snapshot for before/current comparison; query-key passthrough and Windows path handling. |
| `doc/ui-reference/staff-admin/SESSION-05-FINAL-FILTERS-AND-VIEWS.md` | This evidence and limitation record. |

No shared UI primitive, backend, schema, API, permission, authentication, case
lifecycle contract, dependency, image asset, Staff Home or Case Details file changed.

## Filter contracts

| Control | Genuine behavior |
| --- | --- |
| Search | Existing case-number/title/client/lawyer substring search, case-insensitive. No search endpoint. |
| All Statuses | Existing `CASE_STATUS_FILTERS`: All, Inquiry, Active, On hold, Closed. Uses unchanged `matchesCaseStatusFilter`; legacy closed-won/lost remain Closed with their outcome badges. Counts still describe the entire accessible collection, independently of active refinements. |
| All Lawyers | Named `useStaffDirectory()` entries referenced by accessible `assignedLawyerId` values; exact ID matching. Equal names remain separate IDs. Unassigned appears only when genuine unassigned records exist. Missing directory entries do not become fake options or count as unassigned. |
| More Filters: Practice Area | Distinct nonempty practice areas from fetched cases. Whitespace is trimmed for comparison/display; no category or schema is invented. Prefixed select values distinguish a genuine area named “all” from the All choice. |
| More Filters: Client | Named fetched clients referenced by accessible case `clientId`; exact ID matching. No extra client fetch or unrelated directory options. |
| Active indication/reset | More Filters shows the count of active additional fields. Reset filters clears Search, Status, Lawyer, Client and Practice Area; empty list/board results also offer Clear filters. Changes apply immediately; Show results closes the panel. |
| List / Board View | Existing `viewMode`. Board View is the Staff label; Admin retains By status. Board renders all matching cases across Inquiry/Active/On hold/Closed, without pagination or drag/drop/status mutation. |
| View | Visible link on every Staff row/card, using `caseDetailPath(basePath, matter._id)`, identical to the retained title destination. No Edit/Delete menu. |

All active criteria combine with **AND** and preserve API record order. The list
still uses ten-record pagination. Any search/status/additional selection change or
reset returns to page one; switching views retains the existing view-state behavior.
Unknown/missing directories remain safe under All. Empty/unavailable additional
fields are not fabricated. The Lawyer control is disabled if there is neither a
usable named assignment nor a genuine unassigned choice. A directory permission
remains governed by the unchanged hook/backend, not frontend filtering.

The actual normal Staff session is an `associate`, permitted by the existing
Staff-role guard. Its directory returned three entries; the four accessible real
cases reference one named lawyer, so All Lawyers correctly offers that one name.
No additional accounts/assignments were created for screenshots.

## Interaction, responsive and visual verification

Actual authenticated application: **http://localhost:3001/staff/cases**. The browser
reuses/renews normal existing local authentication; domain mutation requests are
blocked. Real read-only actions search/filter/view/open detail and dismiss New
Case, without submitting owner-data changes. Fixtures alone exercise creation and
larger/rare data collections.

- Actual 1440/1024/768/390/360px in both CSS presentations: search by all four
  concepts, every lifecycle, available lawyer, additional/combined filters,
  clearing/no-result states, list/board, matching View destinations and existing
  New Case dismissal passed. No horizontal viewport overflow; board scroll is
  internal. Four phone/theme cells exercised native touch scrolling.
- Four final 1440/390 light/dark rechecks also verify nested dropdown Escape keeps
  More Filters open, outer Escape/focus return and the final capture state.
- More Filters uses the existing modal focus/return behavior, presented as an
  anchored desktop panel and a bounded mobile panel above the 4.5rem navigation
  plus safe area. Native option menus stay inside Staff Cases for CMS/theme token
  inheritance, including reduced-motion scope. Shared Select/Dialog defaults are
  unchanged.
- Staff Cases fixture covers 23-record pagination, page-three reset, legacy closed
  outcomes, equal names with different IDs, unavailable directories, genuine
  unassigned cases, different/empty practice areas, combined empty states and
  filtered board counts. No external requests/database access.
- Reference comparison: retain the approved legal hero/cards/table and implement
  the reference's one-row desktop toolbar and sixth Actions column. Original
  role-aware content and four real lifecycle concepts take precedence over the
  reference's fictional values. No goldens were regenerated.

### Actual screenshot inventory

All generated evidence is ignored, outside production assets:

```text
D:\lexnepal\.local\worktrees\ui-staff-admin-upgrade\.local\qa\session-05-final\actual\
```

| Review view | Actual light screenshot |
| --- | --- |
| Desktop complete toolbar/default list | `staff-light-1440-default-list.png` |
| Desktop status options | `staff-light-1440-statuses-open.png` |
| Desktop lawyer options | `staff-light-1440-lawyers-open.png` |
| Desktop More Filters | `staff-light-1440-more-filters-open.png` |
| Desktop combined filters | `staff-light-1440-filters-applied.png` |
| Desktop board | `staff-light-1440-board.png` |
| Desktop View actions | `staff-light-1440-list-view-actions.png` |
| Mobile toolbar/list and visible View action | `staff-light-390-default-list.png` |
| Mobile filters panel | `staff-light-390-more-filters-open.png` |
| Mobile board / rightmost columns | `staff-light-390-board.png`, `staff-light-390-board-scroll.png` |

Dark counterparts replace `staff-light-` with `staff-dark-`. Mobile also has opened
status/lawyer, filters-applied and list-action captures. These are authenticated
screenshots, not fixtures, renamed old screenshots or stitched HTML mockups.
`actual/results.json` records the ten-cell run; `actual/capture-results.json` records
the narrower final capture recheck. Synthetic screenshots live separately under
`component/` and are not represented as authenticated evidence.

## Test results and protected areas

| Check | Actual result |
| --- | --- |
| `git diff --check` | Passing during implementation; final scope review recorded below. |
| `npm run lint` | PASS, exit 0. |
| `npm run typecheck` | PASS, exit 0. |
| Focused Cases + new filter units | 56 passed, nine suites, one worker. |
| Full units | 641 passed / five inherited failures / 646 total; expected exit 1. Exact failures match the approved 635/5/640 checkpoint. Six new assertions explain the increased pass count. |
| Retained Staff Cases actual-component QA | PASS: 44 cells, zero external requests. Includes responsive controls/states, edge filters, mocked creation, 14 CMS/theme contrast combinations and 30 strict Admin list/board/dialog image pairs. |
| Actual Staff browser | Ten width/theme cells plus four affected final capture rechecks; all combinations available with real data. Twenty initial normal/panel Axe scans plus eight affected rechecks clear. |
| Protected Case Details commands | PASS: both Staff/Admin isolated command workflows, zero external requests. |
| Protected Case Details presentation | PASS: 28 Staff and 14 bounded Admin exact geometry/content/image pairs across seven tabs, checkpoint versus current CSS and identical actual components/data/font/clock. This sample does not resolve the historical intermittent Admin dialog raster issue. |
| Protected Staff Home presentation | PASS: 30 exact pairs, five widths/both modes/top-middle-bottom, checkpoint versus current CSS. |
| Client functional | PASS: 104 tests, one worker, no test retries. |
| Client visual preservation | PASS: 24 exact image-hash pairs across twelve screens at 1440/360px, unchanged checkpoint fixture versus fresh build. No approved golden replacement. |
| Source / original-checkout protection | PASS: 1,143 protected upgrade files and 1,028 tracked original-checkout files unchanged; original dirty status unchanged. All preceding CSS bytes, including Session 06/Client tokens/selectors, identical. Index empty; HEAD/branch unchanged. |

The five inherited assertions remain enabled:

1. `cases-r7-client`: consumes `useClientCases / useClientCase`, not Staff CaseDto hooks.
2. `cases-r7-client`: does not change Client shell, KYC, booking or `STAFF_ROLES`.
3. `cui-09-client-checklist-contract`: solid progress fill and prior Client freeze.
4. `dashboard-contrast`: Client light boundaries/focus/chart distinguishability.
5. `dashboard-contrast`: rejects pure black/unapproved dashboard source colors.

Their previously documented hook/regex/frozen-token/source-color contract debt is
not changed or repaired by this Staff listing correction. No assertions are
suppressed and no approved Client reference is replaced.

Measured minima across fourteen CMS/theme control samples: selected text
**16.7825:1**, selected boundary **9.8071:1**, focus **3.9053:1** and board-heading
focus **3.8722:1**, above the respective 4.5:1/3:1 targets. Normal and More Filters
panels had zero Axe violations in the executed native/fixture scans. Protected
Client comparisons establish checkpoint preservation with equal synthetic data,
font and clock; they are not new DOCX/reference acceptance or release certification.

### Commands and evidence

Executed from the upgrade worktree, with sequential browsers and one test worker:

```powershell
git diff --check
npm run lint
npm run typecheck
node node_modules/vitest/vitest.mjs run tests/unit/staff-case-filters.test.ts tests/unit/cases-r2-domain.test.ts tests/unit/cases-r4-ui.test.ts tests/unit/cases-r5-staff.test.ts tests/unit/cases-r6-admin.test.ts tests/unit/cases-r8-integrations.test.ts tests/unit/cases-r9-a11y.test.ts tests/unit/cases-r11-verification.test.ts tests/unit/cases-r12-qa.test.ts --maxWorkers=1
node node_modules/vitest/vitest.mjs run tests/unit --maxWorkers=1 --reporter=json --outputFile=.local/qa/session-05-final/unit.json
$env:STAFF_CASES_ARTIFACT_DIR=Join-Path (Get-Location) '.local/qa/session-05-final/component'
$env:STAFF_CASES_BASELINE_DIR=Join-Path (Get-Location) '.local/qa/session-05-final/starting'
node scripts/qa/verify-staff-cases.mjs
node .local/qa/session-05-final/live.mjs
node .local/qa/session-05-final/live.mjs --capture-only
$env:CASE_DETAIL_ARTIFACT_DIR=Join-Path (Get-Location) '.local/qa/session-05-final/detail-commands'
node scripts/qa/verify-case-detail.mjs --commands-only
node .local/qa/session-05-final/protected-details.mjs
node .local/qa/session-05-final/protected-home.mjs home
$env:CUI20_ARTIFACT_DIR=Join-Path (Get-Location) '.local/qa/cui-20/session05-final'
node node_modules/@playwright/test/cli.js test --config playwright.functional.config.ts --workers=1
$env:CUI19_ARTIFACT_DIR=Join-Path (Get-Location) '.local/qa/cui-19/session05-final'
node scripts/qa/build-client-visual-fixture.mjs
node .local/qa/session-05-final/client-pixels.mjs
node .local/qa/session-05-final/preserve.mjs
```

The explicit baseline directory contains source/CSS exported before edits from
the approved checkpoint. It is ignored local QA infrastructure, not a golden.
The retained runner supports that optional path; its original baseline mode remains.

### Diagnostics and remaining limits

- The first desktop review caught the old toolbar's full-row search rule; only
  the new Staff toolbar overrides it. Final desktop controls share one row.
- The first typecheck caught four redundant Staff comparisons inside the narrowed
  Admin branch. Removing those always-false/undefined presentation props preserves
  the original Admin DOM; final typecheck and Admin comparisons pass.
- An early capture preceded the dependent directory response, briefly showing no
  lawyer choices. Source/API inspection confirmed permitted real assignments; final
  capture waits for cases, clients and the permitted directory to settle.
- The fixture initially lacked a query-key passthrough/provider required by the
  already-approved cache breadcrumb during View/back navigation. Its baseline path
  handling also needed Windows-safe resolution. These test adapters were fixed;
  the approved Session 06 component was not changed.
- Option counts are visually present but `aria-hidden`, so updated option-name
  tests assert the real accessible label and separately verify its visible count.
- A real nested Escape defect was reproduced and fixed only in the new Staff
  filter select. Neither shared Dialog nor shared Select was rewritten.
- A read probe encountered a connection reset while the existing launcher's child
  PID changed. The same worktree/Webpack ancestry was reverified, without manual
  restart or configuration changes; subsequent checks passed. Complete cause was
  not established. Cold-load/memory limits of the 8 GB machine remain relevant.
- One initial request exception included local session headers in an ignored QA
  log. Those values were redacted and future exceptions output only safe summaries.
  No secret is included in source, screenshots or this report.
- Native checks recorded zero page errors and zero API 5xx. One image 404 per
  width/theme cell was traced to the existing public CMS asset endpoint, matching
  the previously documented missing-CMS-image issue. Other console errors were
  zero; no asset record/configuration was modified to conceal it. See
  `console-resource-check.json`.
- The four real records cannot exercise multi-page navigation; the 23-record
  isolated fixture verifies it without adding or altering owner records.
- Session 06's strict Admin Case Details rounded-corner raster intermittency and
  its historical touch automation rerun remain documented limitations. Passing
  Admin listing comparisons here do not resolve that separate strict-image issue.
- No build/release certification, database integration, scanner/worker execution
  or authenticated domain-mutation E2E was attempted. Those require a verified
  isolated QA environment. Normal localhost preview remains the real application.

## Final review status

The requested controls and View actions are implemented in the real Staff listing.
Protected-page comparisons and command/functional checks passed; the five inherited
unit failures and separate strict Admin raster limitation remain explicit. The
new native captures were visually inspected against the approved reference. The
retained fixture also checks new selection resets starting from page three, rather
than assuming a page-one starting state proves reset behavior.

At implementation sign-off, only the eleven intended application/QA/report files
differed and all work remained uncommitted. The owner subsequently approved this
correction and explicitly authorized committing and pushing these files to
`origin/ui/staff-admin-upgrade` only. No merge, deployment or next-page work is
authorized. This is a development checkpoint, not release certification; the five
inherited unit failures and previously documented QA limitations remain open.

After implementation, the owner requested a preview restart. The existing supported
Webpack server was started from this worktree on port 3001. A subsequent sign-in
failure was traced to stopped local MySQL (`ECONNREFUSED 127.0.0.1:3306`). Existing
MySQL and Mailpit data were reopened using the documented existing-data-only
commands, without initialization, upgrade, migration, seeding or account changes.
Normal Staff sign-in, session HTTP 200 and the real Cases listing were then verified.
No application, environment or development configuration was changed for recovery.
The actual Webpack preview remains at http://localhost:3001/staff/cases.

### Approved checkpoint verification — 16 October 2026

Local and read-only remote branch HEAD both matched
`0c8998d6bc228bd9811287bc37a3b49af7ac62a6` before staging. The complete eleven-file
diff was reviewed. Repository CI runs on pull requests and pushes to `main` and
contains verification only; `deploy.sh` remains a separate manual operation.
No feature-branch deployment trigger was found in the checked-in configuration.

Fresh checkpoint runs of `npm run lint` and `npm run typecheck` passed. The focused
nine-suite command above passed all 56 tests. The full unit command passed 641
tests and failed the same five named inherited assertions, 646 total; the expected
exit code was 1. Exact failed test names were compared with the implementation
result, with no new failure or changed coverage. Logs and JSON summaries are
ignored under `.local/qa/session-05-final/checkpoint/`.

The preservation guard was rerun successfully: 1,143 protected upgrade files and
1,028 original-checkout tracked files remained unchanged, original owner status
was unchanged, prior CSS was byte-identical, source scope was eleven files and
the index was initially empty. Intended-file sensitive-pattern checks passed;
screenshots, environment files and local evidence remain ignored and excluded.
The earlier 44-cell fixture, native browser and Client/protected-page comparison
results above were inspected as final implementation evidence; those browser
matrices were not regenerated for this checkpoint. A fresh real preview GET
returned HTTP 200, with the existing Webpack process and local services running.

This approval covers the development checkpoint only. The five inherited unit
failures, intermittent strict Admin Case Details raster comparison, historical
touch rerun and isolated authenticated mutation/release-QA limitations remain
documented and are not represented as resolved by this commit.
