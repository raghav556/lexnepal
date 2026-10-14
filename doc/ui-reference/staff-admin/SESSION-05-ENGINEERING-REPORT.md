# Session 05 — Premium Staff Cases listing

14 October 2026, Asia/Katmandu. Target: `/staff/cases` in the real LexNepal
application. The Technical Lead approved the six actual listing screenshots and
authorized the feature-branch checkpoint after a final board-focus review. The
final verification and narrow focus refinement are recorded below. Session 06,
deployment and changes to `main` or the original checkout remain outside scope.

## Starting state and instructions

- Worktree: `D:\lexnepal\.local\worktrees\ui-staff-admin-upgrade`.
- Branch: `ui/staff-admin-upgrade`.
- Starting HEAD: `f5e4229608d8af783f8bea315b674349fe2345bd`; starting status clean.
- Port 3001 already served this worktree, with Next listener PID 1988. The
  repository-supported development command and existing local services were retained.
- The original checkout's six owner edits were preserved. No reset, stash, rebase,
  branch switch, environment change, dependency installation or database setup.

The consolidated pasted Session 05 instructions were read in full first. The two
images were then reviewed separately, in order. **Srimar Law Cases Dashboard.png**
controls the listing's visual direction. **Law Firm Case Management Dashboard.png**
depicts Case Details, reserved for Session 06. Its tabs, timeline and business
actions were not implemented or redesigned here.

Read `AGENTS.md`, installed Next.js CSS, Client Component and Fast Refresh guidance,
Sessions 01–04 reports, the approved Home implementation and Client source-of-truth/
freeze requirements. The authoritative Client DOCX, companion, references and
existing Client acceptance limitations remain protected.

## Source inspection and scope decisions

Traced the real Staff and Admin routes, `StaffCasesPage`, `CasesWorkspace`, creation,
identity/status/query-state components, dashboard primitives, pagination and its
hook, navigation/branding providers, semantic tokens, case contracts/query hooks,
R4/R5/R6/R9/R11/R12 tests and retained offline browser architecture.

The workspace already supports search, lifecycle filters, a ten-record list page,
four read-only board columns, case-detail links and the existing New Case dialog.
Its supported statuses are **Inquiry, Active, On hold and Closed**, with existing
legacy closed-won/lost normalization. Original summary concepts are total matters,
active, on hold and closed. Actual local values remain **4 / 2 / 1 / 1**.

Adaptations from the concept preserve those source contracts:

- Four genuine summary cards, without fake totals, trends, an Overdue lifecycle
  status or a replacement Pending status.
- Existing five status buttons/counts instead of an invented status dropdown,
  All Lawyers filter or More Filters control.
- Case titles retain their existing detail destination. No new View/ellipsis row
  commands were added solely to resemble the image.
- The table displays actual case number/title, practice area, filing date, client,
  lifecycle/outcome, existing hearing date and assigned name. No invented court,
  lawyer rank, client category or hearing record.
- Existing personalized/CMS identity and localized title/description/date conventions
  remain. The approved Nepal artwork is reused from the existing public asset.

## Visual implementation

Staff receives a compact navy/Nepal header with restrained gold title/CTA accents,
four quiet summary cards, a coherent search/filter workspace and a readable native
table. At compact widths the same table becomes labelled record blocks, retaining
all metadata and unabridged titles. Summary cards remain static and have no
misleading navigation chevrons.

The board retains every lifecycle column and source count. Four columns fit on a
wide desktop; compact widths scroll inside the existing board. The Staff board is
a named, keyboard-focusable region with visible focus. No drag-and-drop or stage
mutation was introduced. Empty columns remain visible; the mobile owner captures
also show the populated Active column through ordinary horizontal scrolling.

Buttons/fields use usable heights, status labels and metadata are at least 12px,
pagination keeps its existing model and gains Staff-only current-page semantics.
Selected filter/view/page text uses the neutral semantic foreground/surface and
CMS-aware focus boundary, retaining clarity with very light custom primary colors.
All new CSS is Staff Cases-scoped; the complete preceding CSS is byte-identical.

The existing footer and Top control use the approved Home flow pattern on this
listing route. They remain reachable at the bottom and clear of fixed mobile
navigation. Home retains its previous class names/markup; other Staff pages keep
their existing placement. Navigation hierarchy, links and guards are unchanged.

## New Case dialog and verified focus correction

Before edits, all **20 real Staff/Admin width/theme checks** showed a field-focus
defect: editing Case Title moved focus back to Case Number. The form recreated its
open-change callback, causing the existing Dialog focus effect to clean up and run
again on each render. Stabilizing the form and workspace callbacks corrects this
without changing their actions, form reset, validation or mutation payload.

**Intentional shared interaction effect:** Admin creation also retains field focus.
Its visual output, fields, options, permissions and submission behavior remain
unchanged. Settled reference/candidate images verify the unchanged Admin dialog.
No generic Dialog implementation was changed.

Staff-only styling provides a bounded dialog, fixed visible heading/close control,
scrollable form, reachable sticky actions and single-column phone fields. Real
checks exercise typing, Tab containment, Escape, focus return, close/action bounds
and `?create=1` dismissal/replacement. Live Create was never submitted. Validation,
failure/retry, separate descriptions, lead membership, payload and created-case
navigation were exercised only with the isolated test mutation adapter.

## Content/workflow preservation inventory

| Contract                            | Preservation evidence                                                                                                        |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Cases, clients, directory, hearings | Same production hooks and API paths; no new fetch or production adapter.                                                     |
| Search                              | Same case-number/title/client-full-name/lawyer-name comparisons; real and isolated checks cover all four and clearing.       |
| Filters/counts                      | Same lifecycle helper, unfiltered counts, query predicate and reset behavior.                                                |
| Summary                             | Same total/active/on-hold/closed values; real before/after 4/2/1/1.                                                          |
| List                                | Same order, ten-record page size and base-path identity links; all original identity fields retained.                        |
| Hearing date                        | Same stored `nextHearing`, then first scheduled hearing's Gregorian/BS fallback; no sorting change.                          |
| Board                               | Same four columns, all filtered records, counts and destinations; read-only.                                                 |
| Pagination                          | Same hook, page/window generation, next/previous and search/status reset; fixture exercises three pages and legacy outcomes. |
| Creation                            | Same fields, options, validation, status write helper, team de-duplication, date, API call and created-ID navigation.        |
| Deep entry                          | Existing `?create=1` opens the dialog; dismissal replaces the URL with the same portal base.                                 |
| Query states                        | Existing loading label, empty list/search messages, failure/forbidden classification and refetch action retained.            |
| Dates                               | Same dual formatter; English/Gregorian and Nepali digits exercised, including raw BS fallback.                               |
| Other portals/Home/Details          | Protected source, fixture/real pixel comparisons and valid detail navigation; no new page redesign.                          |

## Files changed

| File                                                            | Purpose                                                                                                                                          |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/components/cases/cases-workspace.tsx`                      | Staff-only header/summary/list hooks, named search/view/board semantics; preserve Admin variant and data calculations; stable UI close callback. |
| `src/components/cases/staff-cases-list.tsx`                     | Small presentation component using existing table, identity, status and date primitives; consumes already-fetched paginated data.                |
| `src/components/cases/case-identity.tsx`                        | Optional `showStatus`, default true; Staff table places the same lifecycle/outcome in its own column.                                            |
| `src/components/cases/case-create-dialog.tsx`                   | Stable reset/open-change callbacks for the verified typing-focus defect; submission body unchanged.                                              |
| `src/components/ui/pagination.tsx`                              | Optional named navigation/current-page semantics; existing consumers' default markup remains.                                                    |
| `src/app/(staff)/layout.tsx`                                    | Extend existing footer/Top flow placement to the exact listing route; Home behavior retained.                                                    |
| `src/index.css`                                                 | Append only Staff Cases presentation/responsive/focus/reduced-motion rules.                                                                      |
| `tests/staff-cases/adapters.tsx`                                | Test-only 23-record dataset, loading/empty/error/forbidden states and in-memory creation/retry evidence.                                         |
| `tests/staff-cases/fixture.tsx`                                 | Actual Staff/Admin layouts, workspace, creation UI, I18n and existing toast presentation.                                                        |
| `scripts/qa/verify-staff-cases.mjs`                             | Reuse retained esbuild/Tailwind/Chromium/Axe approach for isolated interaction, CMS and settled Admin comparisons.                               |
| `doc/ui-reference/staff-admin/SESSION-05-ENGINEERING-REPORT.md` | This evidence and review record.                                                                                                                 |

No business module, route, dependency, schema, permission, API contract or backend
operation was added. `StaffCasesPage`, Case Details and Client source remain unchanged.

## Verification matrix

| Check                          | Outcome                                                                                                                                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint                           | `npm run lint`: PASS, exit 0 after correcting one unused local QA binding.                                                                                                                                                                  |
| Typecheck                      | `npm run typecheck`: PASS, exit 0.                                                                                                                                                                                                          |
| Focused Cases contracts        | Six existing suites: **37 passed**.                                                                                                                                                                                                         |
| Full units                     | **634 passed / five inherited failures / 639 total**, exit 1. Exact names/count match Session 04; no existing assertion was changed.                                                                                                        |
| Staff Cases isolated component | **43 cells passed**: ten populated interaction cells, eight query-state cells, one mocked creation sequence, fourteen CMS contrast cells and ten Admin comparison cells. No network/database access.                                        |
| Real responsive capture        | Staff/Admin, 1440/1024/768/390/360, light/dark CSS, top/middle/bottom plus board/dialog. Existing links/filter inventories preserved; no horizontal viewport/main overflow or JavaScript page errors.                                       |
| Real Staff interactions        | Ten width/theme cells: four search attributes, clearing/no-match, five filters, view switch/local board scrolling, typing/Tab/Escape/focus return, drawer/active navigation and footer clearance: PASS.                                     |
| Real Axe                       | Ten Staff main-content checks, **zero violations**.                                                                                                                                                                                         |
| Real entry/detail/loading      | `?create=1`, dismissal URL, valid local detail navigation/back and delayed genuine GET loading: PASS. No response data substituted.                                                                                                         |
| Board keyboard/review          | Six real desktop/phone captures of populated content; phone ArrowRight scrolling and no overflow: PASS.                                                                                                                                     |
| CMS contrast                   | Both CSS modes × default/white/black/yellow/purple/cobalt/green: selected text minimum **12.316:1**, selected boundary **3.011:1**, focus against panel **3.905:1**; targets 4.5/3/3 retained.                                              |
| Admin preservation             | **30 settled exact-pixel pairs identical**, list/board/dialog at five widths in both CSS modes, against preserved original components/CSS. Real route data/filter/board/link inventories also unchanged.                                    |
| Staff Home                     | **30 real pixel pairs identical** at five widths/both modes/top-middle-bottom; KPI and link inventories preserved. Capture clock pinned to the session start to avoid greeting-time changes.                                                |
| Client functional              | **104 passed**, retained offline suite.                                                                                                                                                                                                     |
| Client pixels                  | **24 exact-pixel pairs identical**, all twelve screens at 1440/360 against Session 04 checkpoint fixture output; no approved golden replacement.                                                                                            |
| Approved Client references     | Existing diagnostic: **one test passed**, all twelve reference images compared. Reference acceptance remains **NOT VERIFIED** because data/fonts/assets differ; execution is not new owner approval.                                        |
| Source preservation            | **840 existing protected files unchanged**, including Home/Details, Client references/source, backend/contracts, dependencies and existing tests. Query/filter/count/pagination calculation block and creation submission body match entry. |
| Fast Refresh                   | Temporary helper-text edit and exact restoration observed in the same real browser document, without server restart.                                                                                                                        |
| Git/format                     | Feature HEAD unchanged, index empty; changed-file/appended-CSS formatting and whitespace checks passed.                                                                                                                                     |

Staff branding currently pins resolver appearance to light. Dark presentation was
exercised by toggling the existing CSS class after verifying React hydration;
no product theme switch was introduced. Chromium checks do not establish physical
iOS/Safari, screen-reader or other-engine acceptance.

## Screenshot inventory and real preview

Primary preview: **http://localhost:3001/staff/cases**. Use the existing local Staff
sign-in/session. The real application uses its existing local records and APIs.
Keep the dedicated upgrade-worktree terminal running `npm run dev`; edit that
same worktree for continuous Fast Refresh.

All evidence below is ignored local QA, relative to the upgrade worktree:

```text
.local/qa/session-05/
```

Before and after each contain 100 real captures:

```text
{before,after}/{staff,admin}-{light,dark}-{1440,1024,768,390,360}-{top,middle,bottom,board,new-case}.png
```

Owner review files in `after/`:

- `staff-light-1440-top.png`, `staff-light-1440-middle.png`, `staff-light-1440-bottom.png`
- `staff-light-390-top.png`, `staff-light-390-middle.png`, `staff-light-390-bottom.png`
- `staff-light-1440-board-active.png`, `staff-light-390-board-active.png`
- `staff-light-1440-new-case.png`, `staff-light-390-new-case.png`
- `staff-light-390-real-loading.png`

Dark companions replace `light` with `dark`; 360px populated-board companions are
also available. **These are authenticated application captures.** `component/`
screenshots and synthetic states are explicitly **isolated actual-component test
fixtures**, supplementary evidence for unavailable states and safe mocked writes.
The real mobile board has no Inquiry records; initial and scrolled Active captures
retain that genuine state. No generated image is a production asset or Git golden.

## Exact commands executed

From the upgrade worktree; direct Node CLIs avoid Windows npm argument forwarding:

```powershell
npm run lint
npm run typecheck
node node_modules/vitest/vitest.mjs run tests/unit/cases-r4-ui.test.ts tests/unit/cases-r5-staff.test.ts tests/unit/cases-r6-admin.test.ts tests/unit/cases-r9-a11y.test.ts tests/unit/cases-r11-verification.test.ts tests/unit/cases-r12-qa.test.ts --maxWorkers=2
node node_modules/vitest/vitest.mjs run tests/unit --maxWorkers=2 --reporter=json --outputFile=.local/qa/session-05/unit-final.json
node scripts/qa/verify-staff-cases.mjs
node --import tsx .local/qa/session-05/actual.mjs before
node --import tsx .local/qa/session-05/actual.mjs after
node .local/qa/session-05/live-interactions.mjs
node .local/qa/session-05/board-preview.mjs
node .local/qa/session-05/home-preservation.mjs before
node .local/qa/session-05/home-preservation.mjs after
node .local/qa/session-05/route-scope.mjs
node .local/qa/session-05/fast-refresh.mjs
node .local/qa/session-05/preservation.mjs
$env:CUI20_ARTIFACT_DIR=Join-Path (Get-Location) '.local/qa/cui-20/session05'
node node_modules/@playwright/test/cli.js test --config playwright.functional.config.ts
$env:CUI19_ARTIFACT_DIR=Join-Path (Get-Location) '.local/qa/cui-19/session05'
node scripts/qa/build-client-visual-fixture.mjs
node .local/qa/session-05/client-comparison.mjs
$env:CUI19_ARTIFACT_DIR=Join-Path (Get-Location) '.local/qa/cui-19/session05-reference'
node node_modules/@playwright/test/cli.js test --config playwright.visual.config.ts --grep 'approved references'
git diff --check
git diff --cached --check
```

Local comparison helpers use preserved ignored before-components/inventories;
they are evidence tools, not production modules or replacements for approved goldens.

## Diagnostics corrected and limits

- An initial Admin capture probe presumed unauthenticated navigation redirects.
  The actual guard stays on the route; explicit normal Admin sign-in corrected
  the probe. No authentication implementation was changed.
- New test locators were scoped to the dialog after the accessible search label
  also matched “Case Number”; filter locators account for existing adjacent count
  text. A preserved pagination fixture's relative button import was resolved to
  the unchanged real component. Assertions/targets were retained.
- A PowerShell CSS text edit caused an encoding discrepancy. The preserved original
  prefix was restored exactly using UTF-8; subsequent formatting refuses unexpected
  prefix edits. Protected source/reference and Client pixel checks verify recovery.
- The filter-count opacity and custom-white selected-text defects were real
  accessibility findings. Staff-scoped opaque text and neutral selected surfaces
  corrected them; contrast thresholds were not reduced.
- Raw real Admin screenshot hashes initially differed. Pixel diagnostics localized
  most differences to the unchanged pulse/Top-control animations, with small
  painting differences. Raw results remain recorded; they are not described as
  identical. Strict settled original/candidate comparisons independently pass all
  30 Admin list/board/dialog pairs. No Admin styling was changed to hide a mismatch.
- A route-scope probe initially sampled the outgoing page before navigation settled.
  Waiting for the correct URL and actual detail title proves zero retained listing
  roots and no listing shell scope on Case Details; no framework workaround was added.
- Existing missing CMS logo requests still return 404 with their existing fallback.
  Font/CSP configuration is unchanged. These diagnostics were not hidden or repaired
  by altering owner asset records or security headers.

The five inherited unit failures remain enabled:

| File                                       | Exact failed assertion                                                  | Inherited disposition                                       |
| ------------------------------------------ | ----------------------------------------------------------------------- | ----------------------------------------------------------- |
| `cases-r7-client.test.ts`                  | consumes useClientCases / useClientCase, not Staff CaseDto hooks        | Older source-hook expectation; unchanged.                   |
| `cases-r7-client.test.ts`                  | does not change Client shell, KYC, booking, or STAFF_ROLES              | Older composition/source expectation; unchanged.            |
| `cui-09-client-checklist-contract.test.ts` | uses solid progress fill and freezes prior Client phases                | Existing unbounded CSS-regex contract; unchanged.           |
| `dashboard-contrast.test.ts`               | client light keeps boundaries, focus, and chart series distinguishable  | Frozen Client boundary/generic contract remains unresolved. |
| `dashboard-contrast.test.ts`               | rejects pure black and unapproved one-off colors in dashboard UI source | Existing palette/source debt outside this scope.            |

No isolated authenticated release-QA database was provisioned. Integration setup,
production build/release checks, real case creation/persistence and full CRUD/upload/
scanning acceptance were not run against the owner's database. Existing records
were not created, changed, deleted, reseeded, reset, migrated or restored for testing.
Normal Admin sign-in creates ordinary auth/session audit entries.

## Review boundary and Session 06 recommendation

The real Staff listing, board and creation presentation remain available at
localhost:3001. The initial implementation was left uncommitted for review. The
Technical Lead subsequently approved the listing screenshots and authorized saving
the completed Session 05 checkpoint after the final board check below.

After approval and explicit next instructions, Session 06 should address the
existing Case Details page using the second supplied image: first inventory its
tabs/timeline/commands and permissions, then refine presentation around actual data.
Keep the real preview running; use isolated mocks for write tests until verified
disposable authenticated QA is available. Session 06 has not started.

## Approved checkpoint — final board presentation

The prominent rectangle was the existing Staff-only `:focus-visible` outline on
the named, focusable board scroll region. It was absent after pointer selection;
the earlier capture helper explicitly focused that region for ArrowRight testing.
It was not a permanent decorative border.

Only the region's normal-mode focus presentation was refined: a two-pixel inset
line below each lifecycle heading replaces the full-height rectangle. Existing
case links and controls retain their individual focus outlines. The region retains
its accessible name, Tab stop and native keyboard scrolling. Forced-colors mode
uses a system-color outline because browsers suppress box shadows in that mode.
No lifecycle, query, destination, pagination or mutation logic changed.

The application adjustment is confined to the appended Staff Cases CSS. The
focused QA script now verifies header focus, individual case-link focus, phone
ArrowRight scrolling, the forced-colors fallback and composited header-focus
contrast. All fourteen CMS palette/theme cells retain the existing thresholds;
the new header-focus measurement has a minimum **3.872:1** against a **3:1** target.

Actual authenticated before/after checks at 1440, 390 and 360px in both CSS modes
passed: pointer appearance, keyboard appearance, all four columns reachable, each
phone column fully viewable, visible case-link focus and no viewport overflow.
Four phone checks also executed a Chromium touch swipe successfully. No case
creation or other API write was performed. Real keyboard, search/filter/view,
dialog/dismissal, case-detail/back and loading checks were repeated at all five
requested widths in both CSS modes; ten main-content Axe scans had zero violations.

Final board screenshots are ignored local files in:

```text
.local/qa/session-05/checkpoint/
```

- `before-staff-{light,dark}-{1440,390,360}-board-{pointer,keyboard}.png`
- `after-staff-{light,dark}-{1440,390,360}-board-{pointer,keyboard}.png`
- `approved-staff-{light,dark}-{1440,390,360}-board-active.png`

The initial board-probe selector included an empty-state heading; it was narrowed
to the four actual column headers. The probe also waits for native scrolling to
settle before asserting full-column bounds. The manifest check preserves Git's
leading status spaces. These were local evidence-helper corrections, without
application changes or lowered assertions.

Checkpoint verification repeats lint, typecheck, the six Cases suites, the full
unit suite, the 43-cell component script, real Staff interactions, real Staff Home
comparison captures and Client regression checks. The full unit result remains
**634 passed / five inherited failures / 639 total**, with exact failure identities
matching the Session 04 checkpoint; no failures were suppressed. Thirty settled
Admin list/board/dialog comparisons and thirty real Staff Home comparisons are
identical. The repeated Client functional suite passed **104 tests**. Twenty-four
freshly built Client comparison pairs are identical; approved
Client goldens and the documented reference-acceptance limitation are unchanged.

Extra checkpoint commands/evidence, in addition to the commands above:

```powershell
node .local/qa/session-05/checkpoint/board-review.mjs before
node .local/qa/session-05/checkpoint/board-review.mjs after
node node_modules/vitest/vitest.mjs run tests/unit --maxWorkers=2 --reporter=json --outputFile=.local/qa/session-05/checkpoint/unit-results.json
$env:CUI20_ARTIFACT_DIR=Join-Path (Get-Location) '.local/qa/cui-20/session05-checkpoint'
node node_modules/@playwright/test/cli.js test --config playwright.functional.config.ts
$env:CUI19_ARTIFACT_DIR=Join-Path (Get-Location) '.local/qa/cui-19/session05-checkpoint'
node scripts/qa/build-client-visual-fixture.mjs
node .local/qa/session-05/checkpoint/client-comparison.mjs
node .local/qa/session-05/checkpoint/guard.mjs
node .local/qa/session-05/checkpoint/guard.mjs --staged
git ls-remote --heads origin refs/heads/ui/staff-admin-upgrade
git diff --check
git diff --cached --check
```

Guarded review found exactly the eleven intended text files listed above. Local
environment files, credentials, databases and generated QA images are excluded.
Protected source hashes and the original owner's six edits match the preserved
entry state. The remote feature HEAD matched the expected `f5e4229` checkpoint.
The only repository workflow handles pull requests and pushes to `main`, with no
deployment step; `deploy.sh` is manual/operator-controlled. No automatic feature-
branch production deployment was found in available configuration. Deployment
scripts, environment settings, authentication and database setup were not changed.

The real Next.js dev server remains on port 3001 in the upgrade worktree. Commit
and normal feature-only push are explicitly authorized for this approved checkpoint;
their resulting SHA and remote verification are reported separately after execution.
