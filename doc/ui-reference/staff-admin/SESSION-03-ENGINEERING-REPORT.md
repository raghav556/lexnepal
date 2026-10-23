# Staff/Admin UI upgrade — Session 03 engineering report

Date: 13 October 2026. Scope: role-aware search, bounded contrast corrections and authenticated QA readiness. All work remains uncommitted and unpushed.

## 1. Starting Git state and preservation

Worktree: `D:/lexnepal/.local/worktrees/ui-staff-admin-upgrade`.
Branch: `ui/staff-admin-upgrade`.
Starting and ending HEAD: `e2b7c813e1f975d7904c2a9dd67385cdcb1d0d4b`.

At entry, these tracked files already had Session 01/02 changes:

- `src/index.css`
- `src/views/admin/AdminDashboard.tsx`
- `src/app/(staff)/layout.tsx`
- `src/app/(admin)/layout.tsx`
- `src/components/dashboard/portal-mobile-nav.tsx`
- `src/components/dashboard/portal-sidebar.tsx`

Existing untracked work comprised both engineering reports under
`doc/ui-reference/staff-admin/`, `scripts/qa/verify-staff-admin-navigation.mjs`
and `tests/navigation/`. Starting application files and the complete tracked diff
were copied to ignored `.local/qa/session-3/starting/` and `starting.diff`.
No reset, stash, discard, rebase, branch switch, commit, push or merge occurred.
The original `D:/lexnepal` checkout remains on main with its six existing modified
files and two untracked directories; none was edited.

Read AGENTS.md, installed Next 16.3.4 navigation, global CSS and Server/Client
Component guides, both prior reports, the authoritative Client DOCX/companion and
reference/checkpoint documentation. Inspected actual layouts, navigation trees,
search, query hooks, branding, semantic primitives, routes and test configuration.
Client freeze/reference acceptance is not newly granted by this session.

Session 01 Admin hearing links remain byte-identical to entry. Session 02 drawer,
hierarchy, mobile labels, breakpoint, account scrolling and focus changes remain.
Outside the existing Admin token block, the only additional global CSS change is
the Staff-only dark selected-text calculation. That deliberate correction preserves
the Session 01 control foundation's intent under CMS branding.

## 2. Search defects and implementation

Source verified these defects in the local component:

| Defect                                                                                       | Correction                                                                                                                                           |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Staff used the Admin-oriented STATIC_PAGES array.                                            | Staff pages derive from existing Staff navigation and its existing profile destination.                                                              |
| Staff client results and Create New Client navigated to Admin clients.                       | Both use the active portal's clients workspace. Existing creation forms remain owned by those pages.                                                 |
| Staff Schedule Appointment opened Admin appointments.                                        | Uses the existing Staff appointments page for Staff.                                                                                                 |
| Staff offered the Admin document generator.                                                  | That action is Admin-only; no Staff generator route was invented.                                                                                    |
| Both portals advertised a missing conflict checker page/action.                              | Removed both unsupported suggestions. No backend conflict capability was removed.                                                                    |
| Empty-query curation depended on obsolete array indices.                                     | Curation matches existing destinations and categories.                                                                                               |
| Non-Client descriptions/keywords misrepresented appointments as hearings.                    | Page descriptions now use the actual navigation groups; the unused misleading metadata was removed.                                                  |
| Staff case action described the Admin workspace.                                             | Description uses the current portal. The existing create=1 behavior is retained.                                                                     |
| Hardcoded dark/cobalt presentation applied to operational search.                            | A component CSS module uses existing semantic variables only when Staff/Admin opts in. Frozen Client classes retain their rendering.                 |
| The custom operational overlay lacked a focus trap/return; Enter intercepted filter buttons. | Staff/Admin reuses the existing Dialog and DialogContent. Result Enter handling applies to the query input, leaving native button activation intact. |

`operational-navigation.ts` contains the existing Staff array and Admin tree moved
from their layouts, without changing any route, branch, label, icon, translation or
default expansion value. Layouts and search consume that one source. This is a
shared configuration extraction, not another navigation framework or business module.
Admin search prefixes CMS page labels and uses existing section/branch names for context.

Case hooks, result titles/statuses and portal case base paths remain unchanged.
Client and appointment actions still navigate to existing workspaces; they do not
create records from search or add modal/query contracts. Public website preview
remains the existing public-root action. No data hook, API request, permission,
validation, mutation, schema or backend authorization was changed. The existing
Client disabled clients query remains disabled. No additional network request was introduced.

Operational search now exposes a labelled combobox/listbox, selected options,
active-descendant relationships and pressed category controls. Arrow traversal,
Enter, category activation, Escape, dismissal and focus return are exercised in
the real component. Client retains its original page/matter/action construction,
filtering, keyboard branch, focus timer, scroll locking and overlay behavior.

## 3. Before/after destination coverage

| Collection               | Entry                                                                                         | Final                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Staff pages              | 26 Admin suggestions, including one missing route                                             | 14 existing Staff destinations; zero Admin links                  |
| Admin pages              | 26 suggestions, including one missing route                                                   | 25 valid existing destinations, including all 12 CMS destinations |
| Staff actions            | 6; conflict checker, clients, appointments and generator were inappropriate/invalid for Staff | 4: clients, create case, appointments, public preview             |
| Admin actions            | 6; conflict checker absent from route tree                                                    | 5 valid existing actions                                          |
| Staff/Admin case results | Correct portal case base already present                                                      | Preserved                                                         |
| Client pages/actions     | 11 pages, 3 actions and Client matter results                                                 | Unchanged                                                         |

All 15 Staff and 27 Admin App Router page entry types remain present. Detail/create
routes stay separate where they already existed. Unit coverage checks every static
search destination against its actual page file. At 1440px in each theme, browser
checks select every page and each valid action through the component. At the other
widths, complete inventories are checked with representative page/action navigation,
case/client selection, categories, keyboard and overflow checks.

## 4. Contrast findings and measured results

| Finding                                                       | Classification and resolution                                                                                                                                                          |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin light primary white-on-#487fff: 3.649:1                 | Genuine defect. Primary becomes #2563eb: 5.169:1; hover #1d4ed8: 6.702:1. Pressed remains valid at 8.550:1.                                                                            |
| Admin light border #e2e8f0 on white: 1.233:1                  | Genuine meaningful control-boundary defect. Use existing #8390a2 border value; controls also retain the neutral control-border alias.                                                  |
| Admin orange/cyan chart paints below 3:1 on white             | Genuine graphics defects exposed after the border failure. Darken only chart-3/chart-5 to #b45309/#0e7490.                                                                             |
| Admin heading token #64748b on sidebar: 3.751:1               | Token contract defect; Session 02 already used readable muted text in actual headings. Heading token now matches #94a3b8.                                                              |
| Staff hero-muted falsely evaluated as inherited hex           | Static parser defect. Explicit RGBA now overrides inherited hex and is composited against the hero surface. The 4.5:1 threshold is retained.                                           |
| Admin hero endpoint supporting copy insufficient              | Genuine alpha-composited text defect. Darkened endpoint yields 4.875:1 for 80% white supporting text.                                                                                  |
| Sidebar RGBA active paint rejected by a hex-only test         | Static parsing/compositing discrepancy. Test actual composited selected surfaces.                                                                                                      |
| Decorative sidebar rails/brand frames required to meet 3:1    | Obsolete boundary expectation: these do not identify controls. Replace those checks with 3:1 focus against both sidebar endpoints and selected surfaces, retaining text/icon checks.   |
| Very light CMS brands produced weak hero text                 | CMS edge case. Bound the hero endpoint to 7:1 opaque white, retaining AA after 80% white compositing.                                                                                  |
| CMS foreground could darken selected Staff text               | CMS edge case. Dark selected text now mixes primary with the readable neutral foreground, favoring that foreground.                                                                    |
| Layout branding appearance is fixed (Staff light, Admin dark) | Source-verified integration risk. CMS focus now meets 3:1 on both light and dark control surfaces; computed checks also use the layouts' fixed settings. No theme mechanism was added. |
| Frozen Client border assertion and dashboard raw-color audit  | Remain unresolved inherited failures; neither assertion nor Client styling was suppressed.                                                                                             |

An isolated Chromium probe resolves the actual stylesheet and branding function,
including CSS color-mix and alpha compositing. It measures primary action states,
neutral/selected text, input boundary, focus and three hero stops. Colors tested:
default, #ffffff, #000000, #f5d96b, #3b0764, #487fff and #00ff00.
Both roles and both CSS modes were measured, using matching resolver appearances
and separately the fixed appearances used by the layouts: 28 combinations per probe.

Minimum ratios across matching-appearance samples:

| Role/mode   | Normal text, target 4.5 | Focus/control boundary, target 3 |
| ----------- | ----------------------: | -------------------------------: |
| Staff light |                   4.532 |                            3.733 |
| Staff dark  |                   4.561 |                            4.407 |
| Admin light |                   4.742 |                            3.379 |
| Admin dark  |                   4.570 |                            4.985 |

The fixed-layout-appearance probe also passes all tested pairs: its lowest text
ratio is 4.532 and lowest focus/control ratio is 3.213. Unit tests additionally
check CMS focus against light and dark neutral control surfaces. Selected search
filter focus uses the primary foreground, which contrasts with that button's paint.

These are token/computed-paint checks, not full-page or arbitrary-image-background
accessibility acceptance. Raw page colors, colored text outside the tested controls,
footer status text, all CMS content combinations and portaled popup surfaces still
need page-level authenticated review.

## 5. Files changed in Session 03

| File                                                          | Purpose                                                                                                |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| src/lib/operational-navigation.ts                             | Move existing operational navigation data into one reusable catalog; derive search pages.              |
| src/app/(staff)/layout.tsx                                    | Import the same Staff catalog; preserve Session 02 markup/interactions.                                |
| src/app/(admin)/layout.tsx                                    | Import the same Admin tree/types; preserve hierarchy, query badges and Session 02 interactions.        |
| src/components/dashboard/global-search-palette.tsx            | Role-correct pages/results/actions, destination-based curation and operational Dialog/ARIA behavior.   |
| src/components/dashboard/global-search-palette.module.css     | Staff/Admin-only semantic search presentation, focus, touch targets and overflow.                      |
| src/index.css                                                 | Seven Admin token corrections and the scoped Staff dark selected-text calculation.                     |
| src/lib/portal-branding.ts                                    | Accessible CMS focus and hero endpoint calculation. Client's applyPalette=false path remains intact.   |
| tests/unit/operational-search-navigation.test.ts              | Existing route coverage, portal boundaries, CMS preservation and alpha helper behavior.                |
| tests/support/css-color.ts                                    | Strict explicit hex/RGBA compositing helper; unresolved colors throw.                                  |
| tests/unit/dashboard-contrast.test.ts                         | Recognize and composite RGBA; preserve numeric accessibility thresholds and unresolved failures.       |
| tests/unit/dashboard-color-system.test.ts                     | Both roles/themes, composited active surfaces, text and meaningful focus guarantees.                   |
| tests/unit/portal-branding.test.ts                            | Extreme/saturated CMS colors, AA action/hero states and visible focus in both modes.                   |
| tests/unit/cases-r0-baseline.test.ts                          | Follow the extracted catalog while retaining Admin route/workspace assertions.                         |
| tests/unit/cases-r6-admin.test.ts                             | Same catalog relocation correction; retain create/detail/role checks.                                  |
| tests/unit/cui-02-client-token-contract.test.ts               | Update the authorized Admin AA primary value; all frozen Client assertions remain.                     |
| tests/unit/cui-03-client-shell-contract.test.ts               | Replace unsupported Admin conflict-checker requirement with its absence; preserve Client assertions.   |
| tests/navigation/adapters.tsx                                 | Test-only synthetic client result for real search selection; commands/network remain isolated.         |
| tests/navigation/fixture.tsx                                  | Mount actual search with existing adapters; expose real branding resolver for computed checks.         |
| scripts/qa/verify-staff-admin-navigation.mjs                  | Bundle CSS module, reuse search QA, support isolated build and correct operational combobox locator.   |
| scripts/qa/verify-portal-search.mjs                           | Real-component route/action/keyboard/Axe checks and exact settled Client comparisons.                  |
| doc/DASHBOARD_COLOR_SYSTEM.md                                 | Reconcile Staff/Admin values; identify historical Client table/acceptance claims as non-authoritative. |
| doc/ui-reference/staff-admin/SESSION-03-ENGINEERING-REPORT.md | This evidence record.                                                                                  |

Session 01/02 files not otherwise edited in this session remain in the overall
uncommitted diff: portal-mobile-nav.tsx, portal-sidebar.tsx, AdminDashboard.tsx and
the two prior reports. No new dependency, business feature or production mock was added.

## 6. Test-contract changes

Accessibility thresholds were not lowered. RGBA handling corrects a demonstrable
false inheritance assumption. Sidebar tests increase coverage from one light Admin
case to both roles/modes and check meaningful focus instead of decorative frames.
Relocation tests now follow the single source used by the layouts. The Client
search test formerly demanded an unsupported Admin feature; removing that demand
does not remove any Client page/action. Client palette assertions remain locked;
only the separately owned Admin primary expectation changes to its verified AA value.
The broad raw-palette audit and frozen Client border failure remain visible.

## 7. Commands and actual results

All commands below ran in the upgrade worktree. Direct Node CLIs avoid the earlier
Windows npm argument-forwarding failure. Artifact environment variables were set
only to dedicated ignored directories.

| Command/check                                           | Actual result                                                                                                                                  |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| npm run lint                                            | Exit 0.                                                                                                                                        |
| npm run typecheck                                       | Exit 0; installed Next route type generation and TypeScript pass.                                                                              |
| npm run build                                           | Compilation and TypeScript succeeded; exit 1 collecting API page data because DATABASE_URL is absent. No database connection occurred.         |
| Vitest baseline unit command below                      | Exit 1: 608 passed, 9 failed, 617 tests / 78 files.                                                                                            |
| Vitest final unit command below                         | Exit 1: 631 passed, 5 failed, 636 tests / 79 files.                                                                                            |
| Focused final route/sidebar/branding unit command below | Exit 0: 25 passed.                                                                                                                             |
| Vitest integration command below                        | Exit 1: 10 passed, 16 skipped, three files fail database setup before assertions.                                                              |
| Existing shell QA before/after                          | Exit 0 final: 20 cells, unchanged destination inventories, no unexpected requests/browser errors.                                              |
| Search baseline/final QA                                | Exit 0 final: four Client baseline cells; 24 final cells (20 Staff/Admin + four Client).                                                       |
| Computed contrast probes below                          | Exit 0 final: 28 combinations each; all checked pairs pass.                                                                                    |
| Client component functional suite                       | Exit 0: 104 passed. Subsequent focused Shared Profile check: 2 passed.                                                                         |
| Client source/pixel preservation helper                 | Exit 0 final: 24 historical screenshots identical and 24 standards-mode control/candidate pairs identical; More/Escape/focus return preserved. |
| Approved-reference diagnostic                           | Exit 0 execution: all 12 references compared; reference acceptance remains NOT VERIFIED. No approved golden changed.                           |
| Live E2E --list                                         | Exit 0: 112 tests in 31 files listed. Authenticated execution skipped.                                                                         |
| Changed-file Prettier and git diff --check              | Passed final checks. Whole legacy index.css formatting was not rewritten.                                                                      |

```powershell
node node_modules/vitest/vitest.mjs run tests/unit --maxWorkers=2 --reporter=json --outputFile=.local/qa/session-3/baseline-unit.json
node node_modules/vitest/vitest.mjs run tests/unit --maxWorkers=2 --reporter=json --outputFile=.local/qa/session-3/final-unit.json
node node_modules/vitest/vitest.mjs run tests/unit/portal-branding.test.ts tests/unit/dashboard-color-system.test.ts tests/unit/operational-search-navigation.test.ts --maxWorkers=2 --reporter=json --outputFile=.local/qa/session-3/focused-final.json
node node_modules/vitest/vitest.mjs run tests/integration --maxWorkers=2 --reporter=json --outputFile=.local/qa/session-3/integration-confirmed.json

$env:STAFF_ADMIN_NAV_ARTIFACT_DIR=Join-Path (Get-Location) '.local/qa/session-3/navigation'
node scripts/qa/verify-staff-admin-navigation.mjs before
node scripts/qa/verify-staff-admin-navigation.mjs before --search-only
node scripts/qa/verify-staff-admin-navigation.mjs after
node scripts/qa/verify-staff-admin-navigation.mjs after --search-only
node scripts/qa/verify-staff-admin-navigation.mjs after --build-only
node .local/qa/session-3/measure-contrast.mjs
node .local/qa/session-3/measure-contrast.mjs --layout-appearance

$env:CUI19_ARTIFACT_DIR=Join-Path (Get-Location) '.local/qa/cui-19/session3-after'
node scripts/qa/build-client-visual-fixture.mjs
node .local/qa/session-3/client-preservation.mjs
$env:CUI19_ARTIFACT_DIR=Join-Path (Get-Location) '.local/qa/cui-19/session3-reference'
node node_modules/@playwright/test/cli.js test --config playwright.visual.config.ts --grep 'approved references'
$env:CUI20_ARTIFACT_DIR=Join-Path (Get-Location) '.local/qa/cui-20/session3-after'
node node_modules/@playwright/test/cli.js test --config playwright.functional.config.ts
$env:CUI20_ARTIFACT_DIR=Join-Path (Get-Location) '.local/qa/cui-20/session3-cms-followup'
node node_modules/@playwright/test/cli.js test --config playwright.functional.config.ts --grep 'Shared Profile|Shared Staff'
node node_modules/@playwright/test/cli.js test --config playwright.config.ts --list
npm run lint
npm run typecheck
npm run build
git diff --check
```

Baseline search mode reads the preserved Session 03 starting component; shell after
mode requires the before destination artifact. These comparison files are ignored
local evidence, not approved goldens. Intermediate probe/unit results are also
retained in the Session 03 artifact directory.

### Before/after failure classification

The remaining five failures are inherited by exact assertion name:

| Test file                                           | Assertion name                                                          | Inheritance and disposition                                                                                             |
| --------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| tests/unit/cases-r7-client.test.ts                  | consumes useClientCases / useClientCase, not Staff CaseDto hooks        | Present in the Session 01/02 nine-failure baseline; obsolete source-hook expectation, untouched.                        |
| tests/unit/cases-r7-client.test.ts                  | does not change Client shell, KYC, booking, or STAFF_ROLES              | Present in that baseline; expects an older Staff hook composition, untouched.                                           |
| tests/unit/cui-09-client-checklist-contract.test.ts | uses solid progress fill and freezes prior Client phases                | Present in that baseline; unbounded CSS regex, untouched.                                                               |
| tests/unit/dashboard-contrast.test.ts               | client light keeps boundaries, focus, and chart series distinguishable  | Present in that baseline; frozen Client border versus generic contract remains unresolved and unchanged.                |
| tests/unit/dashboard-contrast.test.ts               | rejects pure black and unapproved one-off colors in dashboard UI source | Present in that baseline; existing raw page colors/fallback paints remain unresolved and the assertion remains enabled. |

The total changes from 617 to 636 tests: four operational-search tests were added,
12 CMS-branding cases were added, and replacing one Admin sidebar case with four
role/mode cases adds three. The increase is net: the old failing sidebar test was
replaced by four passing cases. The 23-pass increase consists of 16 added
search/branding cases, four replacement sidebar cases and three existing assertions
now passing. This is not a claim
that four application defects were fixed: Admin light text and boundary/chart
tokens were corrected; the sidebar token and its parsing/decorative-boundary
contract were reconciled; the Staff hero failure was a false hex-parser expectation.
The table below records those separate causes.

| Original failure                             | Final status                                                                                                                            |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Two cases-r7-client legacy hook expectations | Still fail: existing mismatched source-test expectations. Not edited.                                                                   |
| cui-09 checklist gradient regex              | Still fails: existing unbounded static regex catches later unrelated CSS. Not edited.                                                   |
| Admin sidebar color test                     | Corrected token plus parser/meaningful boundary contract; passes in both roles/modes.                                                   |
| Admin light text contrast                    | Genuine token defects corrected; passes.                                                                                                |
| Admin light boundaries/charts                | Genuine token defects corrected; passes.                                                                                                |
| Staff light hero-muted                       | Incorrect hex-only inheritance/compositing corrected; passes.                                                                           |
| Client light boundary/chart assertion        | Still fails: frozen border 1.366:1 conflicts with generic contract; meaningful-control assessment remains unresolved. Client untouched. |
| Raw dashboard color prohibition              | Still fails: existing raw classes/fallback paints, requiring a separate scoped page audit.                                              |
| Three integration database setup failures    | Unchanged environment limitation: DATABASE_URL absent.                                                                                  |
| Prior accidental live Admin shell failure    | Prior report attributes it to older running-checkout contrast; not rerun here. Footer/page acceptance remains open.                     |

No additional unexplained final regression. During development, catalog relocation
and the approved Admin token correction exposed three obsolete source-location/value
expectations; their corrected contracts retain route and Client guarantees.
The first navigation rerun looked for textbox after operational search became a
combobox; updating that locator retained the focus assertion. The first Client
search comparison captured different opening-animation frames. Failed captures were
archived under search-attempt-01-animation; settled comparisons are exact.
Computed probes first exposed genuine CMS hero/selected/focus edge cases, corrected
above. One read-only probe preparation failed PowerShell quoting and was replaced
with a file-based patch. No assertion was disabled to resolve these diagnostics.

## 8. Browser, keyboard and Client regression evidence

Staff/Admin navigation and search cover 360, 390, 768, 1024 and 1440px in both CSS
theme modes. Shell checks exercise drawer opening, focus entry/trap/return, Escape
and close button, responsive dismissal, scroll access to account controls, grouped
expansion/current route, long/translated labels, browser history back, Ctrl+K handoff
and the real UI wrong-role guard. Inventories match entry: Staff drawer 14 and Admin
25 destinations. No horizontal page overflow or unexpected network/browser errors.

Search checks exercise categories, multi-result arrow wrap/selection, Enter, valid
case/client navigation, each role's actions, unsupported conflict absence, focus
trap/return and Escape. Scoped Axe audits find zero serious/critical violations in
the operational palette and retained navigation scopes. Eight operational search
screenshots at 360/1440 in both modes were captured; Staff dark and Admin light
360px captures were visually inspected. This is isolated actual-component evidence,
not authenticated Next navigation or server authorization acceptance.

Client search captures all/pages/cases/empty at 360 and 1440 in both modes: all 16
settled images are byte-identical to the pre-change component. Client destinations,
three actions, case base, query filtering and Escape are exercised. The independent
104-test existing suite passes; it uses test adapters and stubs global search, so
the actual search checks supply that missing coverage. The 12-screen pixel helper
uses the existing pinned font, historical matching document mode and fresh standards
mode pairs; it does not substitute those captures for owner-approved JPG acceptance.

Client layouts/views, reference documents/assets, route definitions, API/shared
domain/backend source have no new diff. Source checks prove every global CSS byte
outside the identified operational corrections matches entry. No approved Client
golden/reference was generated, replaced or updated.

## 9. Disposable authenticated QA readiness

**Not ready to execute authenticated QA.** The worktree has no .env.local and the
process has no DATABASE_URL. Portable MySQL/mysqldump binaries exist; they are absent
from PATH. No isolated schema, database grants, local credentials, server instance
or test-owned storage/mail environment was established or connected to.

Inspected Playwright/Vitest configs, auth helpers, db migration/seed scripts, E2E
user/Client/CMS seed families, environment/deployment docs, local infrastructure and
restore scripts, and the signing integration database helper.

- Playwright defaults to localhost:3001 and can reuse an existing server. That
  endpoint must not be presumed to belong to this worktree.
- Auth helpers only provide fixture request headers; sign-in still uses real
  Better Auth credentials. No auth bypass is required or added.
- Existing E2E seeders can adopt the first firm or PUBLIC_FIRM_SLUG and delete/re-key
  fixture auth identities. They have no sufficient database-isolation guard.
- db:migrate targets the supplied URL; its presence is not proof the target is safe.
- Windows local infrastructure uses shared LOCALAPPDATA MySQL/mail paths across
  worktrees. Starting it is not disposable-environment provisioning.
- The restore drill restores the newest local dump, including data. Do not use it
  to populate disposable UI QA from owner backups.
- Signing integration tests clone schema only into random test schemas and use
  temporary storage. Their source must be explicitly isolated and at pre-0007;
  they expect local root connectivity and mysqldump. The current latest journal is
  0007, so an ordinary fully migrated UI schema cannot be its source.

### Actionable setup plan (not executed)

1. Provision and positively identify an empty local MySQL schema with a unique
   lexnepal_qa_session03_* name and a user restricted to that schema. Prefer a
   separately owned disposable server instance; verify its process/datadir/port,
   schema emptiness and grants before any migration or seed. Loopback alone is
   insufficient. Do not reuse owner connection files or restore real records.
2. Store a dedicated ignored QA env file with that URL, a new Better Auth secret,
   an unused local app origin/port, matching BETTER_AUTH_URL/APP_PUBLIC_URL,
   AUTH_PROVIDER=local, a separate STORAGE_ROOT, and SMTP disabled or a dedicated
   test mailbox. Keep role guards enabled. Confirm required signing/storage
   capabilities for the selected scenarios from existing environment docs.
3. Only after those checks, use the existing forward migrator against that empty
   schema. Use the existing E2E user seeder (it can create its synthetic firm in an
   empty schema), then the Client portal fixture family. CMS fixture seed is optional
   for CMS content QA. Never invoke a fresh/reset command against an unverified URL.
4. Start this worktree on the explicitly reserved QA port using that env file.
   Set E2E_BASE_URL to exactly that origin and E2E_START_SERVER=0; verify server
   identity before tests. Do not use the default owner server or implicit reuse.
5. Execute authenticated route/accessibility smoke and existing Staff/Admin workflow
   tests first, then Client non-regression. Verify actual API ownership, forbidden
   routes, case create/result navigation, appointments, back navigation and sessions.
   Expand to the listed 112-test suite only within the verified disposable environment.
6. Separately provide an empty, validated pre-0007 schema source for signing
   integration tests using existing migration artifacts. The helper cannot consume
   the fully migrated UI schema; do not roll that schema or an owner database back.
   Its root-connection assumptions must fit the isolated instance.
7. Tear down only the positively identified test schema/storage/service after
   evidence capture. Retain sanitized manifests/results; never publish credentials.

Existing command entrypoints for step 3 onward, after isolation verification:

```powershell
node --env-file=.local/qa/session-3/auth.env scripts/db/migrate.mjs
node --env-file=.local/qa/session-3/auth.env --conditions=react-server --import tsx scripts/e2e/seed-e2e-users.ts
node --env-file=.local/qa/session-3/auth.env --conditions=react-server --import tsx scripts/e2e/seed-e2e-client-portal.ts
node --env-file=.local/qa/session-3/auth.env scripts/local/run-next.mjs dev --port 3103
node --env-file=.local/qa/session-3/auth.env node_modules/@playwright/test/cli.js test --config playwright.config.ts tests/e2e/route-coverage.spec.ts tests/e2e/accessibility-responsive.spec.ts
```

3103 is a proposed dedicated port, not verified available. The proposed env file
does not exist. These setup commands were not run. Required prerequisites are an
explicitly owned empty database/service and scoped credentials, isolated app/env/
storage/mail configuration, latest-schema fixtures, and the separate pre-0007
integration source/root setup. This session adds no new QA infrastructure.

## 10. Open risks and next step

The requested search boundaries/actions and bounded contrast corrections are ready
for technical review. Five inherited unit failures, three integration setup failures,
build page-data collection and authenticated/reference acceptance remain open.
No commit hashes were created; HEAD remains e2b7c81.

Next provision the documented disposable environment and run actual Staff/Admin
shell/search and Client regression scenarios, including full-page contrast and
remaining raw-color/footer/popup debt. The shared shell is a controlled foundation
for planning Staff Home composition, but is not unconditionally signed off for
production. Begin the bounded Staff Home redesign after that acceptance checkpoint;
do not expand to all portal pages or revise the Client contract to obtain green tests.

## 11. Authorized GitHub checkpoint review

The session-end Git statements above are historical. The owner subsequently
authorized one combined Sessions 01–03 checkpoint on ui/staff-admin-upgrade.
Before staging, the active worktree and local/remote starting HEAD were verified
against e2b7c813e1f975d7904c2a9dd67385cdcb1d0d4b.

The final guarded review covers 27 intended files. A scoped secret-pattern scan
found no credentials/private keys/tokens. All 222 protected tracked files checked
(Client source/reference files, backend/shared contracts, database/schema and
dependency files) have unchanged canonical Git blobs. Global CSS outside the
approved Staff/Admin rules and both original navigation catalogs are preserved.
No environment, database, screenshot, generated artifact or unrelated owner edit
is included. Generated evidence stays in ignored .local/qa/checkpoint directories.

Fresh checkpoint verification:

- npm run lint and npm run typecheck: exit 0.
- Full constrained unit suite: 631 passed, the same five inherited failures;
  no additional failure names. Focused route/sidebar/branding suite: 25 passed.
- Existing isolated navigation and search scripts: 20 and 24 cells passed.
- Existing isolated Client functional suite: 104 passed.
- Current Client fixture build and preservation helper: 24 historical screenshots
  and 24 standards-mode pairs identical; all 16 search images also remain identical.
- git diff --check passes. Staged whitespace/content checks precede the commit.

The checked-in CI workflow runs on main pushes and pull requests, with no
production deployment step. GitHub Pages is configured with main as its source;
the recent recorded deployments are main only. The repository has zero configured
webhooks and the local Git hooks are inactive samples. Available deployment
configuration describes manual operator deployment. No credible production trigger
for this feature-branch push was found; no deployment command was executed.

No database-dependent test, seed, migration or live authenticated E2E was rerun.
The missing isolated DATABASE_URL, prior integration setup failures/build collection
blocker and reference acceptance limitations remain documented release blockers.
Final commit SHA and remote equality are reported separately after the authorized
normal feature-branch push.
