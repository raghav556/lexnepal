# Session 04 final premium design review

14 October 2026, Asia/Katmandu. Final refinement of the approved Staff Home design.

## Starting state and preservation

Worktree: `D:\lexnepal\.local\worktrees\ui-staff-admin-upgrade`.
Branch: `ui/staff-admin-upgrade`.
HEAD: `d705db7a805996a99539b6af67407b2d95afbc2f`, unchanged.

Session 04, the premium-design refinement and live-preview configuration were
already uncommitted. Their application files, reports, approved artwork and QA
infrastructure were retained. The original checkout's six owner edits and the
prior Client worktree remain unchanged. No reset, stash, branch switch, commit,
push, merge, deployment, dependency installation or database setup was performed.

`AGENTS.md`, the installed Next.js CSS/Fast Refresh/devIndicators documentation,
the existing engineering reports and the Client source-of-truth/freeze documents
control the work. The existing Client DOCX, references and approved goldens were
preserved. This pass does not redesign another Staff or Admin screen.

## Source-verified issues and fixes

### Mobile navigation overlap

The apparent avatar was **Next.js Dev Tools**, not the Staff account component.
Its button had `aria-label="Open Next.js Dev Tools"`, at x=22/y=790, 32×32px in
the 390×844 capture. It intercepted the Dashboard label's actual hit target.
The Staff account remains in the existing desktop sidebar/mobile drawer.

The installed Next.js documentation supports `devIndicators: false` and explicitly
states that compile/runtime errors still surface. That option removes the optional
floating development button without hiding errors, changing authentication or
introducing a DOM/shadow-root positioning workaround. **Documented shared impact:**
the optional development indicator is disabled across the local application,
including Client/Admin. Production pages and frozen Client navigation markup,
styles and behavior are unaffected.

### Footer and fixed-control competition

At 390×844, the old operational footer reserved 62.31px outside the main scroll
area; the bottom bar reserved 72px. The main viewport was 653.69px high. The footer
remained visible above the bar at every scroll position.

Staff Home now renders one existing `PortalFooter` inside its main scroll area,
after the dashboard. It remains reachable at the bottom instead of occupying the
mobile viewport continuously. The bottom bar is 64px plus the native bottom
safe-area inset, with matching shell padding. The main viewport is now **724px**,
about **70px more usable space**. Other Staff routes retain their existing footer
placement; Client layout is unchanged.

Final review also found the shared floating Top button touching the mobile bar.
Staff Home now places that same control in the scroll flow after the footer.
Its action/progress indicator remain available; it cannot cover footer copy,
shortcuts or navigation. One optional `behavior` prop was added to the existing
primitive. Its default remains `smooth` for all existing callers. Staff Home uses
`auto`, following the main container's normal smooth/reduced-motion CSS policy.
**Documented shared impact:** the public primitive gains a backward-compatible
presentation option; Client/Admin default scrolling is unchanged.

### Visual finishing and empty states

- Retained the approved navy/gold identity, Nepal artwork, CMS branding and white
  or dark-theme surfaces; no new visual system or replacement dashboard.
- Aligned section icons with headings/subtitles and refined table padding.
- Aligned phone KPI rows and removed an implicit extra grid column in helper text.
- Standardized status-label typography, padding, radius and quiet shadows; status
  meanings and semantic colors are unchanged.
- Replaced oversized centered empty panels with a compact icon/text/action grid
  and a 144px minimum height. My Day, Messages and Workload keep every helpful
  description and action. The same scoped styling covers all existing empty states.
- Retained loading skeletons, visible focus, wrapping, touch targets and hover
  feedback. The Top control uses existing role-aware surface/focus tokens.

### Footer copy verification

The non-Client footer asserted `256-bit AES Encrypted`, `Supreme Court Bar Compliant`
and `All Systems Operational` as fixed strings. It consumed no encryption-state,
regulatory-attestation or health-check source. The version `v2.4.0` was also hardcoded;
the package currently declares `0.1.0`, without a footer release-version contract.
These strings did not substantiate the displayed claims.

Staff/Admin footer copy now shows the configured firm, current year and workspace
role. The shortcut label was corrected from Command Center to **Search**, matching
the existing Ctrl/⌘ K handler. Escape guidance is retained. No encryption,
authentication, authorization, session, storage or security-header control was
removed or changed. **Documented Admin impact:** its existing footer receives the
same truthful copy; its layout and page bodies are unchanged. Client's entire
footer return branch is byte-identical, including copyright and legal links.

## Files changed in this pass

| File                                                             | Purpose                                                                                                                                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `next.config.ts`                                                 | Disable the optional overlapping Next development indicator; preserve the existing linked-root configuration and security headers.                      |
| `src/app/(staff)/layout.tsx`                                     | Move the single Home footer and existing Top control into Home's scroll flow; other Staff routes retain their placement.                                |
| `src/components/dashboard/portal-footer.tsx`                     | Correct Staff/Admin-only claims, role identity and shortcut copy; Client branch unchanged.                                                              |
| `src/components/dashboard/scroll-to-top.tsx`                     | Optional scrolling-behavior prop with the existing smooth default.                                                                                      |
| `src/index.css`                                                  | Staff Home-only navigation spacing, safe-area reservation, compact empty states, KPI/table/badge finishing and flow-control styling.                    |
| `tests/unit/cui-03-client-shell-contract.test.ts`                | Replace an obsolete assertion requiring Staff/Admin AES marketing copy; retain Client assertions and require absence of unsupported operational claims. |
| `tests/unit/portal-footer.test.ts`                               | Three rendered contracts: Staff and Admin identity/claim/shortcut checks, and preserved Client legal destinations.                                      |
| `doc/ui-reference/staff-admin/SESSION-04-FINAL-DESIGN-REVIEW.md` | This evidence and scope report.                                                                                                                         |

`src/views/staff/StaffDashboard.tsx` remains modified from the earlier Session 04
work but is **byte-identical to the starting premium design in this pass**.
The prior reports, image asset, fixture adapters and other existing uncommitted
work were preserved.

## Functional preservation

The actual component and all query/calculation code are unchanged. Live comparisons
retained the four KPI labels, values and links; My Day, Priority Tasks, My Cases,
Upcoming Hearings, Messages & Team Updates, Recent Documents, Team Workload and
the six quick workspaces retain their content and destination sets.

Actual before/after KPI values remain `2 / 0 / 1 / 2`. Overdue warnings remain
visible. No weather, calendar, new route, mock record, permission, API, model,
mutation or business workflow was introduced. Normal local database data was
preserved; read-only counts still show five users, four cases, five hearings,
five tasks, ten documents, two clients and six appointments.

## Actual localhost review and mobile evidence

**Staff Dashboard final premium polish complete. Please review localhost:3001/staff.**

The actual authenticated application continues at `http://localhost:3001/staff`,
using the existing local session, APIs and MySQL. Port listener PID **15872**,
Next CLI **9288**, wrapper **14764** were verified against the upgrade worktree's
actual Windows process working directory. The repository-supported `npm run dev`
continues in the dedicated VS Code integrated terminal. The Next configuration
edit caused its normal automatic restart; subsequent Fast Refresh ran without
restarting the server or browser document. The temporary welcome-text edit was
restored exactly, SHA-256
`b720444dac1f28d869773b3808db7e57cfda7365197dc04357c9df1a2ff72af3`.

| Actual phone check                                           | 390px                                          | 360px        |
| ------------------------------------------------------------ | ---------------------------------------------- | ------------ |
| Five visible, hittable labels at top/middle/bottom           | PASS                                           | PASS         |
| Minimum link width / height                                  | 74.39 / 55px                                   | 68.39 / 55px |
| Selected Dashboard has `aria-current="page"`                 | PASS                                           | PASS         |
| Footer in scroll flow, clear of navigation at bottom         | PASS                                           | PASS         |
| Top control below footer, clear of navigation                | PASS                                           | PASS         |
| Last quick action reachable and keyboard-focusable           | PASS                                           | PASS         |
| Drawer keyboard entry, Tab containment, Escape, focus return | PASS                                           | PASS         |
| Horizontal viewport/main overflow                            | None                                           | None         |
| 20px simulated bottom inset                                  | 84px bar / 24px bottom padding; controls clear | Same         |

The native `env(safe-area-inset-bottom)` remains in use. The 20px check is a Chromium
CSS-variable stress simulation, **not physical iOS/Safari verification**.
Normal and reduced-motion Top-button behavior were exercised at 1440/390/360px;
keyboard activation returned the real main scroll area to zero.

Staff branding currently pins its palette appearance to light. Existing dark CSS
presentation was also tested after hydration without adding a new theme switch.

## Actual screenshots

All paths are relative to the upgrade worktree and remain outside tracked
production assets. The screenshot root is:

```text
.local/qa/session-04-final-polish/
```

Before and after each contain **30 real authenticated viewport screenshots**:

```text
{before,after}/staff-{light,dark}-{1440,1024,768,390,360}-{top,middle,bottom}.png
```

Useful owner-review files:

- `after/staff-light-1440-top.png`
- `after/staff-light-1440-middle.png`
- `after/staff-light-1440-bottom.png`
- `after/staff-light-390-top.png`
- `after/staff-light-390-middle.png`
- `after/staff-light-390-bottom.png`
- `after/staff-light-360-bottom.png`
- `after/staff-light-{390,360}-safe-area-bottom.png`
- `after/real-loading-390.png`

These are real application captures, not fixture substitutes. Supplementary
populated/loading/empty/CMS checks use the retained isolated actual-component
fixture under `component/` and are labeled separately.

## Checks executed and outcomes

| Check                                             | Actual outcome                                                                                                                                                                           |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                                    | PASS, exit 0, including final shared-control change.                                                                                                                                     |
| `npm run typecheck`                               | PASS, exit 0, route types generated.                                                                                                                                                     |
| Targeted footer/Client-shell/color/branding units | 35 passed after correcting the new test harness.                                                                                                                                         |
| Full units                                        | **634 pass / five inherited failures / 639 total**, exit 1. Starting baseline was 631/5/636; three new passing tests account for the increase. No inherited failure was fixed or hidden. |
| Staff Home component contracts                    | 44 passed: 30 width/theme/state cells plus 14 CMS-palette cells; unchanged assertions/thresholds, no network/database contact.                                                           |
| Real viewport/scroll review                       | 1440/1024/768/390/360, light/dark CSS, top/middle/bottom: preserved sections/KPIs/links, no horizontal overflow, clear mobile targets.                                                   |
| Real Axe review                                   | **30 checks, zero violations**, covering main content, flow footer/control and visible bottom navigation at all widths/themes/scroll positions.                                          |
| Native navigation                                 | Staff-only search, selection/Enter, browser back, mobile drawer focus, actual loading and empty My Day: PASS.                                                                            |
| Safe-area stress                                  | Two phone widths, 20px simulated inset: PASS.                                                                                                                                            |
| Top control                                       | Six width/motion combinations: in-flow geometry, no overlap, keyboard action and motion policy: PASS.                                                                                    |
| Fast Refresh                                      | Same document and listener PID 15872 before/after; exact source restoration: PASS.                                                                                                       |
| Client interactions                               | **104 passed**, retained offline functional suite; no real database writes.                                                                                                              |
| Client visual comparisons                         | **24 exact-pixel pairs identical**, all twelve Client screens at 1440/360; Client More/Escape/focus return preserved; no approved golden regenerated.                                    |
| Preservation                                      | 835 protected source/test/reference/package files unchanged, Client footer branch byte-identical, CSS outside Staff Home unchanged, original worktrees/HEADs preserved.                  |
| Current server log                                | No HTTP 5xx or database connection error found; inherited public CMS asset 404 remains.                                                                                                  |
| Diff/format                                       | Whitespace check, empty staged diff and changed-file formatting passed.                                                                                                                  |

Exact main commands from this worktree:

```powershell
npm run lint
npm run typecheck
node node_modules/vitest/vitest.mjs run tests/unit/portal-footer.test.ts tests/unit/cui-03-client-shell-contract.test.ts tests/unit/dashboard-color-system.test.ts tests/unit/portal-branding.test.ts --maxWorkers=2
node node_modules/vitest/vitest.mjs run tests/unit --maxWorkers=2 --reporter=json --outputFile=.local/qa/session-04-final-polish/unit-results.json
$env:STAFF_HOME_ARTIFACT_DIR=Join-Path (Get-Location) '.local/qa/session-04-final-polish/component'
node scripts/qa/verify-staff-home.mjs after
$env:CUI20_ARTIFACT_DIR=Join-Path (Get-Location) '.local/qa/cui-20/staff-final-polish'
node node_modules/@playwright/test/cli.js test --config playwright.functional.config.ts
$env:CUI19_ARTIFACT_DIR=Join-Path (Get-Location) '.local/qa/cui-19/staff-final-polish'
node scripts/qa/build-client-visual-fixture.mjs
node .local/qa/session-04-final-polish/client-comparison.mjs
node .local/qa/session-04-final-polish/browser-review.mjs before
node .local/qa/session-04-final-polish/browser-review.mjs after
node .local/qa/session-04-final-polish/safe-area.mjs
node .local/qa/session-04-final-polish/flow-controls.mjs
node .local/qa/session-04-final-polish/actual-accessibility.mjs
node .local/qa/session-04-final-polish/navigation.mjs
node .local/qa/session-04-final-polish/verify-refresh.mjs
node .local/qa/session-04-final-polish/preservation.mjs
git diff --check
git diff --cached --check
```

Lint/typecheck/full units were repeated after the final Top-control adjustment;
Client screenshot comparisons were rebuilt against that final shared component.
The unchanged Client functional suite had already passed 104 tests; no additional
unrelated workflow changes followed. Focused native Top-control and accessibility
checks cover the final adjustment.

### Test-contract and probe corrections

The old CUI-03 assertion explicitly required Staff/Admin AES marketing copy. It
was a preservation guard from the Client upgrade, not encryption evidence. The
owner now requires verified operational copy. The test keeps every Client claim/
legal-link assertion and adds absence guarantees for Staff/Admin instead of
requiring the unsupported string. Three rendered footer contracts add role-aware
coverage. No assertion or approved baseline was suppressed.

The first new footer-test run had three harness failures: two broad regular
expressions matched the internal `operational-portal-footer` attribute, and one
expected `/terms-of-service` instead of the existing `/terms` route. The assertions
were corrected to inspect rendered copy and the source-verified existing route;
application routes were not changed. The targeted run then passed all 35 tests.

An early dark-CSS probe changed `<html class="dark">` before React hydration,
creating an artificial mismatch and an error badge. A controlled early/late probe
confirmed the exact mismatch; the application did not need a hydration change.
The final test proves hydration through the real search interaction before toggling
dark CSS. All final geometry/accessibility checks pass. Compile/runtime error
reporting remains active, as the deliberate mismatch also demonstrated.

## Inherited failures and remaining limits

| File                                       | Unchanged failed assertion                                              |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| `cases-r7-client.test.ts`                  | consumes useClientCases / useClientCase, not Staff CaseDto hooks        |
| `cases-r7-client.test.ts`                  | does not change Client shell, KYC, booking, or STAFF_ROLES              |
| `cui-09-client-checklist-contract.test.ts` | uses solid progress fill and freezes prior Client phases                |
| `dashboard-contrast.test.ts`               | client light keeps boundaries, focus, and chart series distinguishable  |
| `dashboard-contrast.test.ts`               | rejects pure black and unapproved one-off colors in dashboard UI source |

Their inherited classifications remain in the earlier reports: older source/
composition expectations, an unbounded CSS-regex contract, the unresolved frozen
Client-boundary contract and raw-palette debt. The exact failure identities match.

The existing missing CMS logo object still produces a 404 and its configured
fallback. Existing font/CSP configuration is unchanged. Client's approved-reference
acceptance, disposable authenticated release QA, full CRUD/upload/scanning and
physical mobile-device verification remain separate; no release sign-off is claimed.

Other Staff pages retain their existing footer/control positioning for later
controlled modernization. Final owner review and GitHub authorization are still
required before a checkpoint. All work remains uncommitted and unpushed.

## Owner-approved GitHub checkpoint review

The statements about pending approval and uncommitted work above, and in the three
earlier Session 04 documents, describe their original session-end states. The
Technical Lead subsequently approved the actual final desktop/mobile screenshots;
the owner explicitly authorized this Session 04 checkpoint commit and normal push
to `origin/ui/staff-admin-upgrade`. This approval does not authorize another page
redesign, a merge to `main` or deployment.

The guarded review started on `ui/staff-admin-upgrade` at
`d705db7a805996a99539b6af67407b2d95afbc2f`. The remote branch matched that SHA at
entry and again after verification. All 17 changed files belong to the reviewed
Home, scoped shell/footer, development configuration, image, fixture/test and
four-report scope. Application implementation was not changed during this review.
The approved Home component retains the SHA-256 recorded above, and its data and
calculation block matches the checkpoint apart from the existing branding read.

Port 3001 had stopped before review. Existing local MySQL and Mailpit were already
running. The repository-supported `npm run dev` was restarted in a dedicated
upgrade-worktree VS Code integrated PowerShell terminal, with the existing ignored
configuration and `LEXNEPAL_DEV_WARMUP=off`. Windows process working-directory
verification identifies listener PID **1988**, Next CLI **14388** and wrapper
**10940** as this worktree. No service provisioning, database initialization,
account change, seed, migration or restore was performed.

Fresh checkpoint checks:

| Check                                 | Outcome                                                                                                                                                                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                        | PASS, exit 0.                                                                                                                                                                                                                                     |
| `npm run typecheck`                   | PASS, exit 0, route generation and TypeScript.                                                                                                                                                                                                    |
| Full units, two workers               | **634 passed / the same five inherited failures / 639 total**, exit 1; exact names match the preceding final-polish run.                                                                                                                          |
| Staff Home actual-component contracts | **44 passed**, including populated/loading/empty, five widths, both CSS modes and CMS contrast cases; no network/database contact.                                                                                                                |
| Real authenticated Staff Home         | Ten width/theme cells, each at top/middle/bottom: four KPI values, seven sections and links preserved; no horizontal overflow; visible mobile labels/targets, footer clearance and drawer focus passed.                                           |
| Real navigation                       | Three widths: Staff search/Enter, route transition, browser back, drawer Tab/Escape/focus return and actual loading/empty schedule passed.                                                                                                        |
| Fast Refresh                          | Temporary presentation edit and exact restoration both appeared in the same browser document; listener PID 1988 unchanged; 15 recorded HMR frames.                                                                                                |
| Client functional suite               | **104 passed**, exit 0, retained offline interaction suite.                                                                                                                                                                                       |
| Client visual comparison              | **24 exact-pixel pairs identical**, twelve screens at 1440/360, against the retained premium fixture baseline; More/Escape/focus return passed. No approved reference golden was generated or replaced.                                           |
| Protected source/reference audit      | **236 canonical Git blobs unchanged**, including Client source/references, backend/shared contracts, database and dependency files. Client footer branch and CSS preceding Staff Home are unchanged. Original checkout owner edits are preserved. |
| File safety                           | Intended-file allowlist and scoped credential/private-key/token scan passed. Ignored environment files, databases, screenshots, cookies and generated QA bundles are excluded.                                                                    |

New evidence is kept in ignored `.local/qa/session-04-checkpoint/`, with Client
functional and visual bundles in `.local/qa/cui-20/session04-checkpoint/` and
`.local/qa/cui-19/session04-checkpoint/`. The retained Staff component comparison
uses the existing ignored Session 04 before-inventory; these local artifacts are
not replacement approved goldens. The first local source-audit probe split a
functional CSS selector at its internal comma; using PostCSS's actual selector
list resolved that probe defect without changing application CSS or assertions.

Exact fresh verification commands, from this worktree:

```powershell
npm run lint
npm run typecheck
node node_modules/vitest/vitest.mjs run tests/unit --maxWorkers=2 --reporter=json --outputFile=.local/qa/session-04-checkpoint/unit-results.json
$env:STAFF_HOME_ARTIFACT_DIR=Join-Path (Get-Location) '.local/qa/session-04-checkpoint/component'
node scripts/qa/verify-staff-home.mjs after
$env:CUI20_ARTIFACT_DIR=Join-Path (Get-Location) '.local/qa/cui-20/session04-checkpoint'
node node_modules/@playwright/test/cli.js test --config playwright.functional.config.ts
$env:CUI19_ARTIFACT_DIR=Join-Path (Get-Location) '.local/qa/cui-19/session04-checkpoint'
node scripts/qa/build-client-visual-fixture.mjs
node .local/qa/session-04-checkpoint/client-comparison.mjs
node .local/qa/session-04-checkpoint/browser-review.mjs after
node .local/qa/session-04-checkpoint/navigation.mjs
node .local/qa/session-04-checkpoint/verify-refresh.mjs
node .local/qa/session-04-checkpoint/audit.mjs
git diff --check
git diff --cached --check
```

Available deployment configuration was inspected locally and through GitHub.
The checked-in CI runs on `main` pushes and pull requests and contains no deployment
step. GitHub Pages names `main` as its source; recent deployments reference only
`main`. No repository webhooks or active local Git hooks were found. No credible
production deployment trigger was found for this feature-branch push. No deployment
command, production build, database-dependent integration setup or release E2E was
run. The five inherited units, missing isolated release-QA prerequisites, existing
CMS asset/font diagnostics and physical-device/reference-acceptance limitations
remain separate from approval of this Staff design.

Only the explicit 17-file allowlist is staged; staged content/whitespace checks
precede one descriptive checkpoint commit. Its complete SHA and remote equality
are reported after the normal feature-branch push. The real development server
remains running. Further redesign waits for the owner's next instructions.
