# Session 06 — Premium Staff Case Details and seven tabs

Implementation and verification: 14–15 October 2026, Asia/Katmandu. Scope is the
existing Staff `/staff/cases/[id]` workspace. All seven tabs are retained. Changes
were approved by the Technical Lead for a GitHub development checkpoint on
15 October 2026; no subsequent page was started. Earlier statements about pending
approval and uncommitted work record the state at their respective verification
times. The approved development checkpoint is recorded at the end of this report.

This report preserves the original design evidence and subsequent follow-ups.
The final **Final Premium Design Fidelity Refinement** section records the latest
scope and verification; earlier counts and process IDs are historical snapshots.
For the subsequent screenshot-discrepancy check, use the uniquely named captures
in `.local/qa/session-06/verified-final/`, described at the end of this report.

## Starting state and controlling sources

- Worktree: `D:\lexnepal\.local\worktrees\ui-staff-admin-upgrade`.
- Branch: `ui/staff-admin-upgrade`.
- Starting local and remote HEAD: `95bb09e9be4436277ef8b9c3408ad861d4161203`.
- Starting working tree and index: clean. The original checkout's six owner edits
  were recorded and preserved. No reset, stash, rebase, branch switch or Git write.
- Port 3001 initially served this worktree with listener PID 1988. Existing local
  configuration, authentication and database were retained.

Read `AGENTS.md`, installed Next.js CSS, Client Component, Turbopack/resolver and
Fast Refresh documentation, Sessions 01–05 reports, approved Home/Cases source,
the authoritative Client DOCX, companion and freeze requirements. The previously
reviewed `Law Firm Case Management Dashboard.png` informed hierarchy and spacing;
its fictional records, priority field, favorite control and extra actions were
not implemented.

Inspected the real Staff and Admin route consumers, `StaffCaseDetailPage`, case
identity/status/query-state contracts, case team/party fields and dialogs,
`MatterChatPanel`, `DueDateFields`, dashboard primitives, navigation, branding,
date conversion, query/command hooks and relevant Cases tests. Client routes and
approved references were read-only.

## Architecture and verified problems

Both Staff and Admin case-detail routes consume `StaffCaseDetailPage`. Its existing
pathname-based role selection, case queries, commands and seven URL tab values
remain the source of behavior. Admin must therefore retain its default rendering.

The original Staff presentation repeated a large global matter summary above every
tab, hid that summary on phones, used small metadata and translucent completed
tasks, and retained a dark hardcoded chat surface inside the light workspace.
File binders were clickable divs. Task completion controls lacked accessible names.
Messages and Timeline skipped a heading level. Long titles/file names and dialog
forms needed clearer wrapping and scrolling; the detail page's fixed footer/Top
controls competed with mobile navigation.

The implementation adds a Staff-only root class and scoped CSS. A small read-only
summary component presents already-computed metadata in Overview, including on
phones. Quick editor remains above the tab workspace while editing. Admin keeps
its original global summary and markup defaults. Optional shared-component props
are explicitly enabled only by Staff Case Details.

## Changed files

| File | Purpose |
| --- | --- |
| `src/views/staff/StaffCaseDetailPage.tsx` | Staff scope, Overview summary placement, label associations, named task controls, existing status presentation, message-stream semantics, native binder buttons and Staff heading hierarchy. Original queries/calculations/command handlers retained. |
| `src/components/cases/staff-case-summary.tsx` | Read-only `DashboardSection` with semantic definition list and existing dual-date display; accepts existing real values, with no hook/API/calculation. |
| `src/index.css` | Append Staff-detail-only surfaces, typography, cards, tabs, controls, task/hearing/file/timeline spacing, chat/composer, dialog scrolling, focus, mobile wrapping and reduced motion. The previous CSS prefix was byte-identical at design sign-off; the runtime follow-up below removes only its CSP-blocked font import. |
| `src/app/(staff)/layout.tsx` | Extend the already-approved flow footer/Top arrangement only to the exact Staff case-detail route. Existing Home and listing class decisions remain intact. |
| `src/components/cases/case-hearing-dialog.tsx` | Optional description lets Staff receive useful date guidance. Default Admin wording and conversion/validation/submission stay unchanged. |
| `src/components/messages/MatterChatPanel.tsx` | Optional keyboard-scrollable log, default false. Staff detail opts in; default appearance and messaging behavior remain intact. |
| `src/components/cases/case-parties-editor.tsx` | Staff-only opt-in confirmation name and focus return to Add Party after the removed row disappears. Other consumers retain default behavior. |
| `src/components/ui/confirm-dialog.tsx` | Optional accessible dialog name, default undefined; only the Staff parties caller opts in. |
| `tests/case-detail/adapters.tsx` | Deterministic synthetic queries and in-memory commands, including failure/retry and scan-state fixtures. No network/database access. |
| `tests/case-detail/fixture.tsx` | Mount actual Staff/Admin layouts and actual Case Details component with existing providers and isolated adapters. |
| `scripts/qa/verify-case-detail.mjs` | Focused seven-tab, keyboard, state, branding, command and Admin presentation checks using the retained actual-component QA architecture. |
| `tests/unit/stylesheet-csp.test.ts` | Runtime follow-up: compare browser-loaded global stylesheet imports against the actual response CSP. Reproduces the blocked import before the fix and passes afterwards. |
| `doc/ui-reference/staff-admin/SESSION-06-ENGINEERING-REPORT.md` | This implementation, evidence and limitation record. |

No dependency, schema, authentication, permission, backend, API, domain contract,
new route, product module or production mock data was added. No image asset changed.

## Seven-tab completion and preservation inventory

| Tab | Staff presentation | Preserved workflow/content |
| --- | --- | --- |
| `overview` | Calm gold-edged case header, compact actual counts, readable metadata and notes, coordinated team/party cards. | CaseIdentity/lifecycle and closure outcome; client, responsible lawyer/team, court/judge/opposing counsel; internal description versus client-visible summary; next action/hearing/task and filing date; Edit/Save/Cancel and full Quick editor. |
| `tasks` | Consistent task rows, readable metadata/status/priority, 24px checkbox and named controls; aligned quick form and SOP section. | Existing title validation, Gregorian/Nepali due controls, create/update task hooks, disabled/cancelled/completed states, assignee and priority, SOP templates/execution and empty/loading content. |
| `hearings` | Quiet cards with readable purpose/court/status and dual dates; phone stacking and reachable dialog actions. | Existing real hearing collection/order, Schedule hearing, court/judge/date/time fields, AD→BS conversion, validation and submission. |
| `messages` | Semantic Client/Case Team selection, existing chat recolored only in Staff detail, focusable log and full-width mobile composer. | Actual case-scoped streams, privacy distinctions, composer/templates/attachments, permissions, send and retry behavior, existing `tab`/`mode` query handling. No second chat system. |
| `misl` | Native expandable binder buttons with count/chevron/expanded state; readable document metadata and full-name View labels. | Existing document types, counts/index/dates, upload dialog, 50 MB validation, scanning/pending/rejected states and promotion; no View on unapproved files; existing signed open/download command. |
| `parties` | Coherent CRM and Parties sections; readable contact/team metadata, clear dialog and confirmation focus. | CRM client remains distinct from case parties; side/type/role/visibility/optional CRM fields; existing create/edit/delete/confirmation payloads and validation. No invented call/email actions. |
| `timeline` | Consistent event spacing, readable dates/details and correct Staff heading levels. | Original filing/hearing/task/document event generation and chronological ordering; no fictional milestones, manual editing or extra tracking. |

The source preservation check compares the original query/state/timeline and
case/task/SOP handler block directly with current source. Hearing conversion,
validation/submission; chat send/upload handlers; and party payload/validation/save
blocks also compare unchanged. Presentation and conditional accessibility changes
do not replace any hook, API or permission boundary.

## Real application preview and development server

Use **http://localhost:3001/staff/cases**, sign in normally, then open an existing
case. QA obtains a real case link from that listing rather than using a sample ID.
Screenshots under `before/` and `after/` are authenticated application captures.
Images under `component/`, `commands/` and Admin comparison directories are
explicitly isolated actual-component fixtures with synthetic data.

During verification, the initial dev process and dedicated upgrade editor window
were no longer present. No cause was established. Local services remained running.
The supported server was restarted from the upgrade worktree. Turbopack's restarted
instance connected to HMR but failed two edit/restore probes and continued serving
stale source even after reload. The repository already documents a Webpack fallback
in `scripts/local/run-dev.mjs`; using it restored actual-component Fast Refresh.
No application/development configuration or environment file was edited.

Current startup command, from the upgrade worktree:

```powershell
$env:LEXNEPAL_DEV_WARMUP = 'off'
npm run dev -- --webpack
```

The server is kept running through the supported npm launcher as a persistent
background process. A dedicated upgrade VS Code window is open. Automated terminal
focus checks refused to type when they could not positively identify focus;
background launch avoided typing into the owner's editor. To restart in a VS Code
terminal, first inspect port ownership and its process ancestry, stop only that
verified upgrade server, then execute the command above. Do not start a competing
server on port 3001 or terminate the original checkout's processes.

Listener PID at the final restored preview is 3076; Next CLI parent 20340 uses
`next dev --webpack --port 3001`, wrapper parent 9676. Process-directory inspection
verified the exact upgrade worktree. IDs are evidence, not unconditional stop
instructions: inspect them again before stopping. Local logs are ignored files
`.local/qa/session-06/dev-resume.{out,err}.log`. Existing ignored `.env.local`
loads through the package script. Existing MySQL and Mailpit services/configuration
remain unchanged; no secret values are included here.

The first fallback process was subsequently restarted after very slow requests and
sign-in errors. The 8 GB machine had approximately 465 MB free physical memory at
inspection. This is an observed environment limitation, not proof of the complete
cause. Only the verified upgrade server and its launcher ancestry were stopped;
the owner's browser and local database/mail services were left running. Cold page
and API responses remain slow. An initial 90-second login probe timed out; a
subsequent ordinary login with a longer readiness allowance passed. No authentication
code or configuration was changed to obtain that result.

Normal Staff login using the already-existing configured local account was verified
again after a saved-session probe returned to sign-in. `/staff`, `/staff/cases` and
the real case `?tab=messages&mode=team` worked after normal login, with session API
200. No accounts were provisioned or passwords changed. Ordinary login/session
audit writes are distinct from domain mutations. No case/task/hearing/message/file/
party mutation was submitted against owner data. Native message-read POSTs were
intercepted and aborted to preserve read state; fixtures test messaging commands.

Fast Refresh changed and restored the actual `StaffCaseSummary` label in the same
browser document, with source bytes restored exactly. Evidence:
`.local/qa/session-06/refresh-final.json` and `refresh-final.log`, verified again on
the current restarted server. Normal login evidence is `auth-resume-final.log` and
`authentication.json`.
Turbopack's watcher issue is unresolved; continue with the supported fallback.

## Screenshots and visual review

All generated evidence stays outside version-controlled assets:

```text
D:\lexnepal\.local\worktrees\ui-staff-admin-upgrade\.local\qa\session-06\
```

Native `before/` contains 220 images: Staff and Admin, five widths, both CSS modes,
seven tabs plus Quick editor and three existing dialogs. `after/` contains the same
coverage plus content/bottom scroll views (282 images). Minimum owner review pairs:

| Section | Desktop | Mobile |
| --- | --- | --- |
| Header / Overview | `after/staff-light-1440-overview.png` | `after/staff-light-390-overview.png` |
| Tasks & SOPs | `after/staff-light-1440-tasks.png` | `after/staff-light-390-tasks-content.png` |
| Hearings | `after/staff-light-1440-hearings.png` | `after/staff-light-390-hearings-content.png` |
| Messages | `after/staff-light-1440-messages.png` | `after/staff-light-390-messages-content.png` |
| Digital Misl | `after/staff-light-1440-misl.png` | `after/staff-light-390-misl-content.png` |
| Parties & Counsel | `after/staff-light-1440-parties.png` | `after/staff-light-390-parties-content.png` |
| Timeline | `after/staff-light-1440-timeline.png` | `after/staff-light-390-timeline-content.png` |

Counterparts use `before/` and the same section name without `-content`. Additional
filenames: `staff-{light,dark}-{1440,1024,768,390,360}-{quick-editor,hearings-dialog,misl-dialog,parties-dialog}.png`.
The `-content` and `-bottom` captures cover 1440/390 in both modes, including footer
clearance. Dark, tablet, compact desktop and 360px counterparts are available.
Loading/empty/error/forbidden/missing and synthetic populated/SOP/party/scan states
are fixture evidence; they are not represented as authenticated records.

Initial native before/after captures pinned 14 October for comparison. Final
authenticated rechecks use the current session date. The owner's local data also
changed during the session: a new hearing appeared, a due-today task became done,
and case judge/opposing-counsel/document values changed. No attribution is assumed,
and those changes were not undone. Historical real Home/listing screenshots therefore
do not all match current data; they are not claimed as identical visual goldens.
Controlled actual-component comparisons below isolate presentation with equal data,
fonts and clock.

## Verification results

Final command outcomes and measurements are recorded in the sign-off section below.
Checks already completed:

- Focused eight Cases suites: **50 passed**, covering R2 domain, R4 UI, R5 Staff,
  R6 Admin, R8 integrations, R9 accessibility, R11 verification and R12 QA contracts.
- Design sign-off units: **634 passed / five failed / 639 total**, exactly the
  Session 05 checkpoint count and failure identities. After the runtime follow-up,
  **635 passed / five failed / 640 total**: one added regression test, same five
  inherited failure identities. No assertions suppressed/changed.
- Client isolated functional suite: **104 passed**.
- Fresh Client actual-component comparisons: **24 exact image pairs unchanged**.
- Protected Home and listing comparisons: **30 exact pairs each unchanged**, including
  list/board/New Case and all five widths in both modes, with equal fixture data/font/clock.
- Native before/after full captures: **20 role/width/theme cells per phase**, real
  seven tabs and editing/dialogs, no viewport overflow or unexpected API 5xx.
- Actual content/bottom captures: **four desktop/mobile/theme cells**, no viewport
  overflow or page errors on the settled rerun, with phone footer clear of bottom nav.
- Final native seven-tab keyboard/accessibility review: **ten Staff width/theme
  cells and 70 Axe scans with zero violations**. Arrow keys, Home/End, message log
  scrolling, stream selection, binder keyboard activation, dialog focus/Escape,
  browser back and query-driven tab/mode selection passed.
- Final existing-dialog review: **30 actual dialog captures/Axe scans with zero
  violations**. A source-verified padding defect was corrected: the close button
  precedes the header, so `:first-of-type` targets the header where `:first-child`
  did not. Headers remain padded, modal content scrolls, actions are reachable and
  dismissing restores focus.
- Native mobile touch: **four actual cells**, 390/360px in both modes. All seven
  tabs respond to taps; forward/reverse swipes reach Timeline and Overview, with
  no viewport overflow. The final longer-readiness run exited 0. Earlier short
  readiness probes timed out during cold loading; their logs remain available.
- Fixture contrast: **14 CMS palette/theme combinations**, minimum measured
  selected-text contrast **12.3163:1** and focus contrast **3.04326:1**, against
  respective 4.5:1 and 3:1 targets. Fixture normal-tab/theme and CMS Messages scans
  total **84 Axe scans with zero violations**.
- Normal Staff login, Home/Cases and direct Messages/team URL: pass.
- Actual-component mocked mutations: both Staff and Admin workflows pass, including
  validation, failure/retry, exact payloads, privacy, upload limit/scanning and parties.

Example executed commands (all from the upgrade worktree):

```powershell
git diff --check
npm run lint
npm run typecheck
node node_modules/eslint/bin/eslint.js scripts/qa/verify-case-detail.mjs --max-warnings=0
node node_modules/vitest/vitest.mjs run tests/unit/cases-r2-domain.test.ts tests/unit/cases-r4-ui.test.ts tests/unit/cases-r5-staff.test.ts tests/unit/cases-r6-admin.test.ts tests/unit/cases-r8-integrations.test.ts tests/unit/cases-r9-a11y.test.ts tests/unit/cases-r11-verification.test.ts tests/unit/cases-r12-qa.test.ts --maxWorkers=2
node node_modules/vitest/vitest.mjs run tests/unit --maxWorkers=2 --reporter=json --outputFile=.local/qa/session-06/unit-final.json
node scripts/qa/verify-case-detail.mjs
node scripts/qa/verify-case-detail.mjs --commands-only
node scripts/qa/verify-case-detail.mjs --admin-only
$env:CUI20_ARTIFACT_DIR=Join-Path (Get-Location) '.local/qa/cui-20/session06'
node node_modules/@playwright/test/cli.js test --config playwright.functional.config.ts
$env:CUI19_ARTIFACT_DIR=Join-Path (Get-Location) '.local/qa/cui-19/session06'
node scripts/qa/build-client-visual-fixture.mjs
node .local/qa/session-06/client-comparison.mjs
node .local/qa/session-06/protected-pixels.mjs home
node .local/qa/session-06/protected-pixels.mjs listing
node .local/qa/session-06/actual.mjs before
node .local/qa/session-06/actual.mjs after
node .local/qa/session-06/live-checks.mjs
node .local/qa/session-06/content-captures.mjs
node .local/qa/session-06/dialog-review.mjs
node .local/qa/session-06/touch-long.mjs
node .local/qa/session-06/auth-resume-final.mjs
node .local/qa/session-06/refresh-final.mjs
node .local/qa/session-06/preservation.mjs
```

Snapshot-dependent comparisons use ignored original files in
`.local/qa/session-06/starting/`. On another machine these must be exported from the
starting checkpoint before running before/current comparisons. Local helpers,
authenticated state and generated outputs are not committed. The retained fixture
script can execute current component contracts without those original snapshots;
that does not establish a baseline comparison by itself.

## QA contract corrections and inherited failures

No existing unit or Client contract assertion was modified. The new browser QA
initially assumed PNG bytes would be deterministic. Admin screenshot probes exposed
inherited smooth-scroll/focus timing; captures now settle scrolling, establish the
same keyboard-focused field and move the pointer away. More importantly, replaying
all 110 unchanged Admin baseline frames reproduced tiny form-edge raster differences:
maximum two RGB steps and 169 pixels, with identical computed geometry/styles/content.
The final comparison requires exact computed presentation and image dimensions,
unchanged alpha, and maximum two RGB steps confined to existing rounded corners;
every other pixel must match exactly. A provisional 200-pixel count limit proved
inappropriate because repeated unchanged rounded edges crossed that arbitrary
count. It was replaced with the spatial restriction, while preserving the measured
two-step ceiling. No existing unit, Client golden or accessibility assertion was
relaxed. Evidence: `admin-baseline-raster/results.json`. Original probes remain local.

The complete 53-cell fixture run passed before the final Staff dialog padding fix.
After that fix, Staff tabs/states/URL handling/CMS checks and mocked commands passed
again, but the Admin raster check needs a transparent caveat: the latest full
Admin-only run passed nine cells and failed 360px dark on a six-step RGB difference
confined to rounded corners, with exact computed styles/content/geometry and alpha.
The unchanged 360px dark rerun then passed all eleven frames. Thus all 110 Admin
frames have passing coverage across those runs, but the complete strict raster run
is intermittently failing. The assertion remains enabled; the six-step result is
not dismissed as proven baseline variance or reported as an unconditional pass.
Evidence: `admin-corners.log`, `admin-one-baseline/results.json` and
`admin-current-one/results.json`. Investigate browser raster reproducibility before
using this new comparison as a release gate.

Other QA diagnostics were corrected without product shortcuts: asynchronous task
checkbox and download completion are awaited; translated language commit is polled;
duplicate error headings use an exact h1 locator; message loading is settled before
measuring native scroll range. A stale-session/old fixed-clock pass returned to
sign-in; normal login was verified and the final pass uses a fresh session/current
date. Transient cold/HMR `Event` errors were retained in earlier logs; the settled
content rerun and direct seven-tab diagnostic report no page errors. Existing CSP
rejection of the Google-font CSS request is unchanged. No error assertion was disabled.

| Inherited failing file | Exact assertion | Disposition |
| --- | --- | --- |
| `cases-r7-client.test.ts` | `consumes useClientCases / useClientCase, not Staff CaseDto hooks` | Existing source-hook expectation mismatch, unchanged. |
| `cases-r7-client.test.ts` | `does not change Client shell, KYC, booking, or STAFF_ROLES` | Existing older hook-composition expectation, unchanged. |
| `cui-09-client-checklist-contract.test.ts` | `uses solid progress fill and freezes prior Client phases` | Existing unbounded CSS regex contract, unchanged. |
| `dashboard-contrast.test.ts` | `client light keeps boundaries, focus, and chart series distinguishable` | Frozen Client border versus generic contrast contract remains unresolved. Client tokens untouched. |
| `dashboard-contrast.test.ts` | `rejects pure black and unapproved one-off colors in dashboard UI source` | Existing raw page classes/fallback paints remain unresolved; assertion enabled. |

These are the same five names as Session 05, with the same 639-test coverage. A
changed failure count is not being used as evidence of repaired baseline defects.

## Client/Admin protection and release limitations

The preservation guard verifies **839 protected existing files unchanged**, including
Client source, authoritative documents/references, Home/listing, backend/domain and
dependency files. Previous CSS was byte-identical at design sign-off; the runtime
follow-up removes only the blocked external font import, with every other existing
CSS byte preserved. Client selectors and tokens are unchanged. The original checkout's six owner
edits and HEAD remain unchanged; upgrade HEAD is unchanged and the index is empty.
Client default chat/confirmation behavior remains opt-out and visual comparisons
use current rebuilt components. Approved Client goldens were not regenerated.

The 24-pair Client comparison proves checkpoint preservation with equal fixture
data/font/clock, not a new DOCX/reference acceptance claim. Prior approved-reference
font/data/asset limitations remain open. Generic query-error heading-order debt
outside the seven normal tabs was not rewritten across portals.

Native read-only review uses the owner's normal local database. That environment
is not disposable mutation QA. Database-dependent integration/mutation E2E, seed,
migration, storage worker/scanner execution and build/release verification were not
run. A positively verified isolated QA `DATABASE_URL` and supporting services remain
release-verification prerequisites. Fixture scan tests prove UI/control behavior,
not a fresh live malware-scanner/security certification. No owner records or services
were reset, reseeded, restored or schema-modified.

## Final sign-off

| Gate | Actual result |
| --- | --- |
| Source scope / Git | PASS: twelve intended design files plus the focused runtime stylesheet/CSP test; no staged changes, commit, push or branch change. Local and read-only remote HEAD remain the approved starting checkpoint. |
| `git diff --check` | PASS. |
| `npm run lint` | PASS, exit 0 (`lint-signoff.log`). The subsequently refined new QA comparator also passed focused ESLint, exit 0. A later redundant full lint invocation was stopped under resource pressure; its cancellation is not counted as a passing check. Application/test TypeScript is unchanged after the successful lint/typecheck pair; the final UI correction is CSS. |
| `npm run typecheck` | PASS, exit 0 (`typecheck-signoff.log`), including route type generation. |
| Cases / full units | 50 focused design passes; latest full suite is 635 passed and the same five inherited failures, 640 total, including one added stylesheet/CSP regression test. |
| Seven-tab Staff presentation | PASS at 1440, 1024, 768, 390 and 360px in both modes; selected/focus states, responsive wrapping and no viewport overflow. |
| Actual keyboard/dialog accessibility | PASS: 70 tab and 30 dialog Axe scans, keyboard selection, message scrolling, binder controls, Escape/focus return and footer clearance. |
| Native touch | PASS: all four 390/360px light/dark cells, seven tab taps and forward/reverse horizontal swipes, no viewport overflow (`touch-tabs.json`, exit 0). |
| Isolated command contracts | PASS for both Staff/Admin, with no owner-domain writes. |
| Protected Home / Cases | PASS: thirty exact fixture image pairs each; original presentation source unchanged. |
| Client | PASS: 104 functional cases, twenty-four exact fresh image comparisons, source/tokens/documents/approved references unchanged. |
| Admin | Computed layout/styles/content and safe command contracts preserved; all 110 frames have passing coverage. The latest complete strict raster run has the intermittent rounded-edge failure documented above. |
| Real preview / Fast Refresh | PASS: normal Staff login and real listing-to-case navigation, exact worktree on 3001, actual-component same-document edit/restore verified. |
| Secrets / local data / original checkout | PASS: intended-file scan found no sensitive-pattern matches; local evidence/environment/database excluded, 839 protected files and six original owner edits unchanged. |
| Authenticated mutation/release QA | BLOCKED pending a verified isolated QA database/services; no production/shared-data shortcut used. |

The implemented seven-tab Staff design is ready for Technical Lead visual review
on the real application. Final strict Admin raster reproducibility and isolated
authenticated mutation/release QA remain open; this is not unconditional release
certification. The earlier server request errors, slow cold loads and browser HMR
`Event` diagnostic remain documented environment observations. The owner can use
the retained supported Webpack server; no new development architecture was added.

Final manifests and guards: `preservation.json`, `final-manifest.json`,
`live-checks.json`, `dialog-review.json`, `authentication.json` and
`refresh-final.json` under the ignored Session 06 evidence folder. Native touch
outputs are `touch-tabs.json` and `touch-final-long.log`; the fixture command/state results are distinct
from authenticated browser evidence.

After Technical Lead approval of these seven tabs, the recommended next bounded
upgrade is the existing Staff Tasks page, using these form/row conventions while
retaining real localhost preview and isolated mocks for mutations. No next-page
implementation, commit, push, merge or deployment is authorized or performed here.

## Runtime stylesheet follow-up — 15 October 2026

The owner reported Next.js 16.3.4 Webpack's opaque `[object Event]` runtime overlay.
Browser instrumentation identified a concrete load failure: `src/index.css` imported
Google Fonts while the existing response CSP permits only same-origin styles and
fonts. Chromium blocked that import and dispatched an `error` Event on the parent
`/_next/static/css/app/layout.css` link, including during CSS refresh. The installed
React DOM stylesheet loader uses that Event as its promise rejection reason. The
opaque overlay was intermittent; baseline instrumentation consistently reproduced
the stylesheet error, rather than an unhandled rejection on every run.

The smallest fix removes that single blocked import. The existing font-family
tokens, fallbacks, Client selectors and all other existing CSS bytes remain intact.
The CSP, Next configuration, dependencies, authentication and backend are unchanged.
This preserves the previously rendered fallback typography instead of enabling a
previously blocked font download. The only files added/changed for this follow-up
are `src/index.css`, `tests/unit/stylesheet-csp.test.ts` and this report; the twelve
Session 06 design files remain preserved within the combined thirteen-file diff.

Verification:

- New CSP/import regression: failed before the fix with the exact Google Fonts
  URL; passed after the fix. It loads the actual CSS and actual Next response
  policy, with no database or network requirement.
- `npm run lint` and `npm run typecheck`: exit 0.
- Full units: **635 passed, five inherited failures, 640 total**. The extra pass
  is the new regression test, not a repaired inherited failure. Exact failure
  identities still match the table above.
- Fresh Client actual-component visual comparison: **24 exact pairs unchanged**;
  approved references were not regenerated.
- Actual authenticated Staff listing-to-case navigation, all seven tabs and a
  hard reload passed with **zero stylesheet errors, CSP violations, unhandled
  rejections or page errors**. Browser font families and measured font metrics
  match the captured pre-fix values; no Google font requests remain.
- A temporary presentation-neutral CSS custom property appeared and disappeared
  through same-document Fast Refresh; source restoration passed. The combined
  probe subsequently timed out on its final reload when Next automatically
  restarted at its used-memory threshold. That failed probe is retained. With
  heavy checks finished, the separate fresh-process navigation/reload check passed.
- An existing missing CMS image still returns 404 and emits an image resource
  error. It is separate from the stylesheet/unhandled Event failure; no asset
  records were changed or invented to conceal it.
- The preservation guard confirms 839 protected files, original owner edits,
  queries/calculations/commands, branch and HEAD unchanged; index empty. Only the
  explicitly identified blocked import differs in the previous CSS prefix.

Executed follow-up commands:

```powershell
node node_modules/vitest/vitest.mjs run tests/unit/stylesheet-csp.test.ts --maxWorkers=1
npm run lint
npm run typecheck
node node_modules/vitest/vitest.mjs run tests/unit --maxWorkers=2 --reporter=json --outputFile=.local/qa/session-06/runtime-unit.json
node .local/qa/session-06/runtime-hmr-trace.mjs
node .local/qa/session-06/verify-runtime-styles.mjs
node .local/qa/session-06/runtime-reload-check.mjs
$env:CUI19_ARTIFACT_DIR = Join-Path (Get-Location) '.local/qa/cui-19/runtime-fix'
node scripts/qa/build-client-visual-fixture.mjs
node .local/qa/session-06/runtime-client-comparison.mjs
node .local/qa/session-06/runtime-preservation.mjs
git diff --check
```

Evidence is ignored under `.local/qa/session-06/`: `runtime-csp-before.log`,
`runtime-csp-after.log`, `runtime-hmr-trace.json`, `runtime-fixed.log` (interrupted
reload), `runtime-reload.json` (passing fresh-process check), `runtime-unit.json`,
`runtime-client-comparison/results.json`, `runtime-preservation.json` and
`runtime-fixed-staff.png`. Normal existing-account login was renewed through the
ordinary sign-in form; no seeds, migrations or owner-domain mutation testing ran.
The real preview remains on port 3001 with the supported Webpack command. Reload
an already-open error overlay with Ctrl+Shift+R to discard the old rejected resource.

## Final Premium Design Fidelity Refinement

15 October 2026, Asia/Katmandu. This is the narrow refinement requested after
Technical Lead review; final visual approval is still required.

### Starting Git state and scope

- Correct upgrade worktree and branch verified; HEAD remains
  `95bb09e9be4436277ef8b9c3408ad861d4161203`.
- Thirteen expected uncommitted files were present, including the runtime font
  fix and its regression test. They were inspected and preserved. The combined
  working diff now contains sixteen intended files; the index remains empty.
- The original checkout's six owner edits remain byte-identical. No reset,
  stash, rebase, branch switch, commit, push, merge, deployment or database setup.
- Read the controlling instructions, installed Next.js CSS/Client Component/Fast
  Refresh guides, approved Session 04/05 reports, Client DOCX/companion/freeze
  requirements, current dependencies and the approved Case Details reference.
- Staff Home, Cases filtering/listing, Admin pages and Client pages were not
  redesigned. No pending Session 05 filtering correction was started.

### Files changed in this final pass

| File | Purpose |
| --- | --- |
| `src/views/staff/StaffCaseDetailPage.tsx` | Staff header identity/count composition; scoped Overview grouping; Staff history component; readable Misl category metadata and generic file icon. Existing Admin branches and all business handlers retained. |
| `src/components/cases/staff-case-summary.tsx` | Group the same nine metadata concepts into responsibility, court/counsel and next steps/dates; group the existing supporting cards without adding a section. The Admin wrapper returns a fragment. |
| `src/components/cases/staff-case-history.tsx` | New small, read-only Staff presentation of the existing sorted timeline array; no event generation or date calculations. |
| `src/components/cases/staff-case-topbar.tsx` | Read the already-fetched case number/title from the existing query cache. Mount this cache consumer only on Staff detail routes. |
| `src/components/dashboard/portal-topbar.tsx` | Optional resolved current-page label, applied only for Staff. Existing Client/Admin defaults remain unchanged. |
| `src/app/(staff)/layout.tsx` | Connect the Staff detail breadcrumb and reserve flow space for its conditional Top control. Home/Cases retain their original rendered topbar/footer behavior. |
| `src/index.css` | Refine only the existing Staff-detail section: compact header, grouped Overview, responsive history, adaptive empty chat and bottom-control spacing. Every preceding CSS byte remains unchanged. |
| `tests/case-detail/fixture.tsx` | Mirror synthetic detail data into the real query cache and expose a test-only long-conversation control. |
| `tests/case-detail/adapters.tsx` | Optional synthetic long conversation; stable, reactive fixture history snapshots. Default records and all mocked command contracts retained. |
| `scripts/qa/verify-case-detail.mjs` | Check the resolved Staff breadcrumb; compare the original shared topbar; support bounded Admin sampling and clearly labeled baseline-only replay; preserve computed evidence before a strict image failure. Pixel tolerances unchanged. |
| `doc/ui-reference/staff-admin/SESSION-06-ENGINEERING-REPORT.md` | This chronological follow-up. |

No application query, API, permission, authentication, schema, dependency, route,
domain command, production record or image asset changed. The source guard confirms
the original query/state, event generation/sort and case/task/SOP handler block
remains identical. Existing hearing/chat/party components were not modified in
this pass; mutation behavior was rechecked through isolated adapters.

### Design differences corrected

**Header.** The title/description, existing Edit/Back actions, case number,
lifecycle/outcome/practice badges and three actual counts now form one compact
header. The redundant Staff identity/back-arrow row below it was removed; its
existing Back to Cases destination remains in the header. Desktop hero height
decreased from **236.19px to 189.39px** with the same real record and viewport.
At 390px the header remains about 340px while also containing identity metadata
previously outside it. Description clipping from the narrow-screen `sr-only`
utility is reset within Staff detail, including `clip-path`; helpful text is visible.
Mobile counts fit one row, long titles wrap, and actions remain reachable.

**Overview.** The same four sections remain: Matter overview, File notes, Case Team
and Parties. Responsibility names, court/counsel and dates have meaningful groups
instead of nine equivalent shaded boxes. One quiet next-action emphasis uses the
existing computed value. Desktop supporting cards stack naturally alongside the
main summary/notes; mobile preserves the original reading order. Internal and
client-visible notes remain explicitly separate. Full Quick Editor/Save/Cancel
and all field values remain intact.

**Timeline.** A full-width ordered history uses aligned date/event columns on
desktop, connected markers, row separators and readable headings/details. Mobile
uses stacked date/event rows with a clear left connector. Event values, order and
dual-date semantics are unchanged. The caption distinguishes filing, hearings,
task due dates and uploads; markers do not imply task completion or invented stages.
Admin keeps its original timeline rendering.

**Messages.** The actual shared chat remains in use. Only the Staff-detail empty
presentation uses natural height; populated conversations retain their prior
scrollable dimensions. Isolated measurements: populated panels **640px desktop /
512px mobile**, scroll ranges **1292px / 1709px**; empty panels **415px / 493px**.
Client/Case Team separation, privacy copy, attachments/templates, composer and
send/retry commands remain intact. Native `?tab=messages&mode=team` selection passed.

**Mobile footer/Top.** A reserved Staff-detail-only flow slot prevents the conditional
Top button from extending scroll height after the first bottom scroll. At 390/360px
in both CSS modes, its bottom was **755.56px**, above the main/bottom-nav boundary
at **772px**: approximately **16.44px clearance**. The final scroll height stayed
stable; hit-testing and clicking Top passed. The settled pre-refinement 390px
baseline was already clear, so an overlap was not claimed as consistently reproduced.
Client navigation and existing Staff Home/Cases footer arrangements are unchanged.

**Digital Misl.** Staff document rows replace `ple`/`evi`/`oth` glyph text with a
generic file icon and the real readable binder/category label next to the existing
index/date. Category labels are not represented as file formats or MIME types.
Native binder buttons, counts, scanning/pending/rejected restrictions, promotion,
50 MB validation and signed View behavior remain intact. Admin retains its old rows.

**Breadcrumb.** The shared topbar originally formatted each URL segment, displaying
the record identifier. Staff now supplies the case number, with title or `Case
details` fallback, from the cache entry used by `useCaseQuery(caseId)` (including
its existing `details=false` key). This creates no query, prefetch or network request.
Internal route IDs, links and URL parameters are unchanged. Outside detail routes,
Staff renders the original topbar without requiring a query-cache consumer.

Tasks, Hearings and Parties retain their existing presentation and behavior beyond
the common compact header. No extra actions, priorities, favorites, contacts,
calendar/weather controls or fictional records were introduced.

### Actual browser evidence and screenshot inventory

Real authenticated application, navigated from `/staff/cases` to an existing case.
All domain POST/PATCH/DELETE requests were blocked in browser QA, including message
read-state writes. No owner-domain mutation was submitted.

Evidence root:

```text
D:\lexnepal\.local\worktrees\ui-staff-admin-upgrade\.local\qa\session-06\fidelity\
```

`before/` has eight actual light-mode comparison captures. `after/` has sixteen
actual captures: the four affected views at 1440/390px in light/dark presentations.
Other widths were inspected/tested without redundant screenshots.

| View | Desktop actual screenshot | Mobile actual screenshot |
| --- | --- | --- |
| Header / Overview | `after/staff-light-1440-overview.png` | `after/staff-light-390-overview.png` |
| Timeline | `after/staff-light-1440-timeline.png` | `after/staff-light-390-timeline.png` |
| Messages at final bottom | `after/staff-light-1440-messages-bottom.png` | `after/staff-light-390-messages-bottom.png` |
| Digital Misl | `after/staff-light-1440-misl.png` | `after/staff-light-390-misl.png` |

Dark filenames replace `staff-light-` with `staff-dark-`. Before filenames use
`before/`; its Messages suffix is `messages.png`. `fixture-states/` contains clearly
isolated synthetic loading/empty evidence, not authenticated application screenshots.
Protected Client/Home/listing PNGs were hashed in memory; approved goldens were not
generated or replaced. Native comparisons use real data, not frozen reference data.

### Fresh verification results

| Check | Actual result after refinement |
| --- | --- |
| Lint / typecheck / diff whitespace | PASS, exit 0. |
| Focused Cases unit contracts | 50 passed, eight suites, one worker. |
| Full units | 635 passed / five inherited failures / 640 total. Exact failures match the prior runtime follow-up and the inherited table above. |
| Existing Case Details command suite | Both Staff/Admin pass: case edit/failure/retry, tasks, SOP, hearing conversion/submission, stream-specific messaging, upload limit/scanning/promotion, signed open and party create/edit/delete/focus. Synthetic adapters only; zero external requests/database access. |
| Native responsive / accessibility | 1440, 1024, 768, 390 and 360px, both CSS modes: all seven states/keyboard traversal pass, no viewport overflow, 40 targeted Axe scans with zero violations. Resolved breadcrumb, Quick Editor/Cancel, URL-driven team stream and footer hit/scroll checks pass. |
| Native touch | First run passed 390 light, 360 light and 390 dark; 360 dark missed one post-swipe Timeline tap. Unchanged instrumented 360-dark rerun passed all seven taps, forward/reverse swipes and final selection with trusted touch/mouse/focus events. This intermittent automation result remains recorded; no production touch handler or assertion was changed to conceal it. |
| Rare-state fixtures | Five configurations: populated/empty at 1440 light and 360 dark, plus loading at 390. Sixteen Axe scans clear; long conversation range/keyboard scrolling, empty layout, long labels and loading fallback pass. |
| Client functional | 104 passed, one worker. |
| Client visual preservation | 24 fresh exact image-hash pairs unchanged, same synthetic data/font/clock. |
| Staff Home visual preservation | 30 fresh exact pairs unchanged, five widths/both modes/top-middle-bottom. |
| Staff Cases visual preservation | 30 fresh exact pairs unchanged, including list/board/New Case dialog. No filtering implementation change. |
| Fast Refresh / live preview | Actual summary-label edit/restore passed in the same browser document; source bytes restored. Correct upgrade worktree on port 3001, supported Webpack fallback retained, no manual server restart. |
| Source / owner protection | 1,139 files outside the reviewed refinement scope unchanged. All CSS before the Staff-detail section is byte-identical. Original six owner edits, branch, HEAD and empty index verified. |

The 635 versus older 634 pass count reflects the previously added stylesheet/CSP
regression test, not repair of an inherited failing test. This fidelity pass added
no unit-test count and did not modify protected Client assertions.

### Admin reproducibility: still not unconditionally resolved

Bounded controlled comparisons covered 1440 light and the contentious 360 dark,
all seven tabs plus Quick Editor and three dialogs. Before/current data, font,
clock, viewport, focus and motion conditions were identical. The original shared
topbar was explicitly used in the before bundle.

- Initial current comparison: 1440 passed; 360 dark failed on **200 pixels,
  maximum six RGB steps, zero alpha difference, zero pixels outside rounded corners**.
- Unchanged second current comparison: all **22 computed/layout/style/content and
  strict image pairs passed**. Computed results are persisted separately before
  image assertions, so a future raster failure cannot erase that evidence.
- Baseline-only replay, using the same original bundle twice: 22 pairs passed in
  this bounded sample. It is labeled diagnostic and is not current-UI verification.
- Both-role functional command contracts pass. No reproducible Admin layout,
  typography, geometry or functional regression was found in these checked states.
- The earlier full-matrix nondeterminism and this first six-step failure remain
  open. Likely raster/focus variance is not proof that every six-step difference
  is harmless. No tolerance was widened: maximum two RGB steps only at rounded
  corners, exact other pixels/alpha, plus exact computed presentation.

See `admin-review.log`, `admin-review-second.log`, `admin-review/admin-computed-*.json`,
`admin-review/results.json` and `admin-baseline/results.json`. No unlimited harness
rewrite or repeated full sweep was attempted on the owner's 8 GB machine.

### Commands and QA diagnostics

All commands ran from the upgrade worktree; browser and unit workers were bounded.

```powershell
npm run lint
npm run typecheck
node node_modules/vitest/vitest.mjs run tests/unit/cases-r2-domain.test.ts tests/unit/cases-r4-ui.test.ts tests/unit/cases-r5-staff.test.ts tests/unit/cases-r6-admin.test.ts tests/unit/cases-r8-integrations.test.ts tests/unit/cases-r9-a11y.test.ts tests/unit/cases-r11-verification.test.ts tests/unit/cases-r12-qa.test.ts --maxWorkers=1
node node_modules/vitest/vitest.mjs run tests/unit --maxWorkers=1 --reporter=json --outputFile=.local/qa/session-06/fidelity/unit.json
$env:CASE_DETAIL_ARTIFACT_DIR = Join-Path (Get-Location) '.local/qa/session-06/fidelity/commands'
node scripts/qa/verify-case-detail.mjs --commands-only
$env:CASE_DETAIL_ARTIFACT_DIR = Join-Path (Get-Location) '.local/qa/session-06/fidelity/admin-review'
node scripts/qa/verify-case-detail.mjs --admin-only --admin-review
$env:CASE_DETAIL_ARTIFACT_DIR = Join-Path (Get-Location) '.local/qa/session-06/fidelity/admin-baseline'
node scripts/qa/verify-case-detail.mjs --admin-only --admin-review --admin-baseline-replay
node .local/qa/session-06/fidelity-live.mjs
node .local/qa/session-06/fidelity-touch.mjs
node .local/qa/session-06/fidelity-touch-one.mjs
node .local/qa/session-06/fidelity-states.mjs
node .local/qa/session-06/fidelity-refresh.mjs
$env:CUI20_ARTIFACT_DIR = Join-Path (Get-Location) '.local/qa/cui-20/fidelity'
node node_modules/@playwright/test/cli.js test --config playwright.functional.config.ts --workers=1
$env:CUI19_ARTIFACT_DIR = Join-Path (Get-Location) '.local/qa/cui-19/fidelity'
node scripts/qa/build-client-visual-fixture.mjs
node .local/qa/session-06/fidelity-client.mjs
node .local/qa/session-06/fidelity-protected.mjs home
node .local/qa/session-06/fidelity-protected.mjs listing
node .local/qa/session-06/fidelity-preservation.mjs
git diff --check
```

An initial Client launcher stopped on a harmless NO_COLOR/FORCE_COLOR stderr
warning because PowerShell used terminating-error mode; it produced no completion
report. The same test command was rerun with ordinary native exit-code collection
and passed 104 tests. An initial long-chat probe incorrectly expected two fixture
messages to overflow; explicit longer synthetic history now exercises scrolling.
A fixture memo-dependency lint warning was corrected with stable history snapshots,
without disabling the rule; command/state checks, lint and typecheck passed again.
These tooling diagnostics are retained, not classified as repaired product defects.

Final summaries: `live-results.json`, `checks.json`, `delivery-checks.json`,
`fixture-states/results.json`, `refresh.json`, `preservation.json`, `unit.json` and
the individual logs under the evidence root. Read-only actual browser and isolated
mutation/rare-state evidence are deliberately distinguished.

### Remaining limits and review status

The five inherited unit failures, intermittent strict Admin raster comparison and
one automated post-swipe touch miss remain transparently recorded. No demonstrated
new Staff/Admin/Client product regression was found by the executed checks.
Resource limits and slow cold loads remain relevant; no environment file, database
service, credential, Next configuration or dependency was changed for this pass.
The existing missing CMS image/404 remains outside this presentation refinement.

Authenticated domain-mutation E2E, database integration, worker/scanner execution
and release/build certification were not run against owner data. A verified
isolated QA database/services remain prerequisites for those checks; ordinary local
preview continues using the compatible existing development environment.

The actual upgraded application remains available at http://localhost:3001.
Visual approval of this final refinement is pending Technical Lead/owner review.
All work is uncommitted and unpushed. No Session 05 filtering correction or next
Staff/Admin page has begun; await instructions after review.

## Final UI verification — screenshot discrepancy

15 October 2026. This was a source/server/evidence investigation, not another
design change. Branch and HEAD remain `ui/staff-admin-upgrade` and
`95bb09e9be4436277ef8b9c3408ad861d4161203`; all existing uncommitted work is preserved.

### Finding and cause

Two historical evidence folders contain the same screenshot basenames. Direct
visual inspection established that `.local/qa/session-06/after/staff-light-1440-overview.png`
shows all three reported problems: the technical breadcrumb, separate identity
row and nine shaded metadata boxes. Its timestamp predates the fidelity pass.
The corresponding `.local/qa/session-06/fidelity/after/` desktop and mobile images
already show the final compact header and grouped Overview; the desktop breadcrumb
is the actual case number. Those files were inspected, not merely inferred from
their names. Their hashes and timestamps are preserved in `verification.json`.

The verified discrepancy is between the historical capture set and final capture
set. Reused basenames and the retained earlier screenshot table made choosing the
historical evidence ambiguous. The exact previously uploaded files cannot be
identified from the review description alone, but that description matches the
older capture precisely. No stale source or stale compiled rendering was found
in the fresh browser check; no server/build correction was necessary.

### Current source and real application check

- The actual upgrade source contains the cache-resolved Staff breadcrumb,
  Staff-only integrated header identity, and grouped responsibility,
  court/counsel and next-step/date presentation. Application source hashes were
  identical before and after this verification.
- Port 3001 process-directory/ancestry inspection verified the upgrade worktree
  and existing `--webpack` CLI/wrapper. Final listener PID was 2784, parent 1644,
  wrapper 8092. The listener changed during inspection under the existing launcher;
  no manual restart, stop or competing server was performed. Reinspect current
  ownership before any future stop rather than relying on these historical IDs.
- Fresh Chromium contexts reused the valid normal Staff session, verified with
  the session API returning 200. Each navigated from the actual `/staff/cases`
  listing to an existing record, then executed CDP `Page.reload(ignoreCache: true)`
  with the browser network cache disabled. No synthetic case ID or fixture route.
- Both captures show the integrated identity and grouped Overview. The desktop
  breadcrumb visibly resolves to `CUI1-MATTER-002`. The existing compact mobile
  shell hides breadcrumbs, but its resolved DOM label also matches the case
  number; that responsive shell behavior was not changed.
- All seven tab labels remain present, no page-wide horizontal overflow, zero
  page errors and zero HTTP 5xx in this bounded verification. Domain writes were
  blocked; none were attempted. Existing current data was not modified.

### New captures — canonical files for this review

These are new screenshots written directly by the authenticated browser, not
copies or renamed versions of earlier images. Both were opened and visually
inspected after capture. File Explorer was opened to their folder.

```text
D:\lexnepal\.local\worktrees\ui-staff-admin-upgrade\.local\qa\session-06\verified-final\
```

| File | Actual viewport | Captured UTC |
| --- | --- | --- |
| `session06-VERIFIED-FINAL-desktop.png` | 1440 × 1000 | 2026-10-15 11:14:38 |
| `session06-VERIFIED-FINAL-mobile.png` | 390 × 1200, touch/mobile context | 2026-10-15 11:14:54 |

The taller mobile viewport exposes the full grouped metadata while retaining the
real fixed navigation. Evidence: `verified-final/verification.json` and
`verified-final/starting-source-hashes.json`; ignored runner:
`.local/qa/session-06/verify-final-ui.mjs`.

Only this engineering report changed in version-controlled scope for this check.
No application, stylesheet, configuration, environment, dependency, database or
existing screenshot changed. Original checkout edits remain protected; nothing
was staged, committed or pushed. Webpack preview remains running on port 3001.
No lint/typecheck/full regression rerun was required for this documentation-only
follow-up; earlier results and unresolved QA limitations above remain unchanged.

## Approved Session 06 development checkpoint

15 October 2026. The Technical Lead explicitly approved the final verified
desktop/mobile screenshots, `verification.json` and this report, and authorized
one normal commit/push to `origin/ui/staff-admin-upgrade`. This is a development
checkpoint, not release certification or permission to deploy or merge.

Pre-commit review verified the exact upgrade worktree, branch and both local and
remote starting HEAD `95bb09e9be4436277ef8b9c3408ad861d4161203`. The reviewed scope
contains sixteen intended files: eleven application files, three test files, the
focused QA runner and this report. No screenshots, ignored QA evidence, environment
files, databases, credentials or original-checkout owner edits belong to the commit.
No implementation was changed for the checkpoint.

Fresh checkpoint checks, executed sequentially with one unit worker:

| Check | Actual result |
| --- | --- |
| `npm run lint` | PASS, exit 0. |
| `npm run typecheck` | PASS, exit 0, including route type generation. |
| Eight focused Cases suites plus stylesheet/CSP regression | 51 passed, nine files, exit 0. |
| Full unit suite | 635 passed / five inherited failures / 640 total; expected exit 1. Exact five failure names match the fidelity run and the inherited table above. |
| Approved-source comparison | All approved application and QA file hashes match the final verified source. Only this report received checkpoint documentation. |
| Protection checks | 1,139 protected files and all six original owner edits unchanged; HEAD query/timeline/command block identical; preceding CSS differs only by the approved blocked-font import removal. |
| Scope / sensitive-pattern scan | Exactly sixteen intended files; no unexpected files or sensitive-pattern matches; generated evidence excluded. |
| Diff whitespace | `git diff --check` passed before staging; staged whitespace/content and remote HEAD are checked again before commit/push. |
| Local preview | Process-directory/ancestry inspection confirms the same upgrade worktree and existing Webpack CLI/wrapper on port 3001. No restart or competing server. |

A read-only preview probe also returned session/API 200 and Staff Cases HTTP 200.
Its initial diagnostic incorrectly expected a literal `staff` user role. The
existing configured Staff account is an `associate`, as already declared by the
existing fixture and permitted by the unchanged `STAFF_ROLES`/portal guard.
The diagnostic was corrected to check that actual contract and passed; no account,
role, authentication or application change was needed. This was a probe assumption,
not a new product/unit regression. Evidence: `checkpoint/preview.json`.

Fresh local logs and summaries are ignored under
`.local/qa/session-06/checkpoint/`: `lint.log`, `typecheck.log`, `focused.log`,
`unit.log`, `unit.json`, `checks.json` and `guard.json`. The focused/full commands
use the same suite paths documented in the fidelity section, adding
`tests/unit/stylesheet-csp.test.ts` to the focused command and using
`--maxWorkers=1`. No database-dependent check ran.

Final-source browser/command evidence above was reviewed rather than repeating
large screenshot sweeps: both-role isolated command checks, 104 Client functional
passes, 24 Client / 30 Home / 30 listing unchanged visual pairs, authenticated
hard-reload captures and same-document Fast Refresh. Source hashes establish that
these checks apply to the application and QA code being checkpointed. The strict
Admin rounded-corner raster intermittency, post-swipe mobile automation rerun,
five inherited unit failures and isolated authenticated mutation/release-QA
requirements remain open and accurately documented.

The repository's only GitHub Actions workflow runs CI for pull requests and pushes
to `main`, with no deployment job. Deployment documentation requires a separate
explicit operator action; no feature-branch production deployment trigger was
identified in the available configuration. This task runs no deployment command.

Only the approved feature branch is the push destination. The resulting full
commit SHA and GitHub link are provided in the checkpoint handoff and Git history.
The original checkout, Client source/tokens/approved references, Staff Home and
Staff Cases listing remain protected. Session 05 filtering correction and further
page work remain pending separate instructions.
