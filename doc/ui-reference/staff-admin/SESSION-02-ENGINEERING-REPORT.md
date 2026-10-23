# Session 02 — Staff/Admin navigation and QA

Date: 13 October 2026 (Asia/Katmandu).
Branch: `ui/staff-admin-upgrade`.
HEAD remains `e2b7c813e1f975d7904c2a9dd67385cdcb1d0d4b`.
Worktree: `D:/lexnepal/.local/worktrees/ui-staff-admin-upgrade`.
No commits, pushes, merges, branch switches, resets, stashes or rebases.

## A. Gate A — Baseline and failure classification

Read `AGENTS.md`, the installed Next.js CSS, navigation and Server/Client Component guides, the full uncommitted Session 01 application diff and report, the authoritative Client DOCX and companion, and Client reference/freeze checkpoint documentation. Inspected actual layouts, navigation dependencies, relevant tests, saved browser failure evidence, database fixture helper, environment documentation and seed implementation before changing application code.

The starting tree contained only the two Session 01 application edits and its untracked report. Starting copies and a diff were saved in ignored `.local/qa/session-2/starting/` and `starting.diff`. Source verification confirms that every byte of Session 01's CSS remains intact after removing the appended Session 02 block. `AdminDashboard.tsx` is byte-identical to the starting copy. Its hearing/case-tab and appointment corrections are preserved. The original `D:/lexnepal` checkout still has its prior six modified files and two untracked directories; this session did not edit it.

Fresh baseline: **608 unit tests pass; nine fail**, matching Session 01 by exact assertion name. No newly introduced Session 01 application regression was found.

| Inherited failure                                             | Classification                                           | Evidence and disposition                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cases-r7-client`: legacy Client hook expectations            | Obsolete/mismatched test expectation                     | Source expectations require earlier hook names/composition. Existing Client query-boundary implementation and underlying contracts are unchanged.                                                                                                                                                                                            |
| `cases-r7-client`: unchanged Staff implementation expectation | Obsolete/mismatched test expectation                     | Expects an earlier Staff hook implementation. The same failure existed at the pre-upgrade parent.                                                                                                                                                                                                                                            |
| `cui-09-client-checklist-contract`: gradient prohibition      | Obsolete/mismatched test expectation                     | Unbounded regex begins at a Checklist selector and reaches unrelated later gradient declarations. No Checklist styling change occurred.                                                                                                                                                                                                      |
| `dashboard-color-system`: Admin sidebar token contrast        | Existing application/token-contract defect               | Heading token is approximately 3.75:1 on its assigned sidebar surface. The test also assumes six-digit hex declarations; several other sidebar tokens use RGBA. Current navigation headings use the existing readable muted token; the broader token contract remains unresolved.                                                            |
| `dashboard-contrast`: Admin light action text                 | Existing application defect                              | White on default `#487fff` is approximately 3.65:1. Saved live browser evidence independently identifies the same issue. No global primary palette rewrite was made.                                                                                                                                                                         |
| `dashboard-contrast`: Admin light boundaries/charts           | Unresolved application/test-contract issue               | Thin default panel boundaries fail the asserted 3:1 threshold. Essential controls versus decorative boundaries and later chart assertions require a separate computed-style review.                                                                                                                                                          |
| `dashboard-contrast`: Staff light hero text                   | Obsolete/mismatched test expectation                     | Hex-only extraction ignores the actual RGBA foreground override and tests an inherited fallback instead.                                                                                                                                                                                                                                     |
| `dashboard-contrast`: Client light boundaries/charts          | Unresolved application/test-contract issue               | Existing measured Client palette conflicts with a generic contrast assertion. Client reference styling is protected; this session does not change or approve it.                                                                                                                                                                             |
| `dashboard-contrast`: raw palette prohibition                 | Existing application/design-contract defect              | Dashboard source still contains hardcoded palette classes and fallback colors. Broad page styling and contract reconciliation remain outside this navigation pass.                                                                                                                                                                           |
| Accidental live Admin-shell browser failure                   | Existing application defect in an older running checkout | Saved `error-context.md` explicitly identifies language/action white-on-blue contrast at 3.64:1 and footer status text at 3.61:1. Its snapshot contains the removed “Live / Updated just now” chip, demonstrating that it was not the upgrade worktree. This session corrects navigation language controls; page-action/footer debt remains. |
| Three integration setup failures                              | Environment/configuration limitation                     | `client-own-audit-security`, `client-signing-security` and `notification-link-security` fail before their assertions because `DATABASE_URL` is absent.                                                                                                                                                                                       |
| Session 01 source-scan timeout                                | Environment/test-load limitation                         | Does not recur with two Vitest workers. Timeout values and assertions remain unchanged.                                                                                                                                                                                                                                                      |

No existing test assertion was disabled, weakened, removed or changed.

### Authenticated QA environment

The worktree has no `.env.local` and the process has no `DATABASE_URL`. The signing helper requires a local schema source, root access and a specific pre-0007 schema. The existing user seeder can reuse the first existing firm or `PUBLIC_FIRM_SLUG` and changes fixture identities. Those paths are not an independently provisioned authenticated QA environment.

No owner environment was copied, no database connection/seed/migration was attempted, and no live localhost E2E was run in Session 02. Database-backed and authenticated acceptance remain blocked. Safe integration execution reproduced the same three setup failures without connecting to a database.

## B. Source-verified problems and implementation

- Staff's existing five bottom shortcuts contained only icons, lacked `aria-current`, and could cover footer content. The destinations remain Dashboard, Tasks, HR, Cases and Hearings. Added visible 12px labels, selected semantics, semantic colors, adequate targets, wrapping, safe-area spacing and reserved content space.
- Admin mobile navigation discarded the desktop tree's branch structure. It now renders the same `ADMIN_NAV_TREE` through existing `PortalSidebarGroup`, `PortalSidebarTreeBranch` and `PortalSidebarItem` components. No destination, CMS function or route was removed or invented.
- The Staff/Admin legacy drawer closed on Escape but had no focus entry/trap/return and stayed logically open across the desktop breakpoint. Added an explicit Staff/Admin opt-in using the existing Dialog. Client retains its separate, unchanged opt-in path.
- Drawer content and account controls share one scroll container. The title and close control remain outside that scroll area. Collapsed branch content has stable IDs and native `hidden` semantics. Mobile branch IDs are distinct from desktop IDs.
- Shared tree branches and Admin links/icons used hardcoded slate/blue styling. The branch has only Admin consumers; its styles now consume existing sidebar tokens. Focus styling covers active and inactive links and branch buttons.
- Active matching now requires a complete path segment. Admin's special exact match for `/admin/cms` is preserved.
- A modal drawer would compete with the existing Ctrl+K search palette. The operational drawer closes on that shortcut while allowing the existing layout handler to open the actual palette and focus its input. The search component, commands and destinations were not rewritten.
- Responsive dismissal and Staff bottom-bar spacing use the actual Tailwind `md` boundary, 48rem (768px under the tested defaults). Client's 1024px behavior remains unchanged. Bottom-bar reservation applies only on screen.

### File-level changes made in Session 02

| File                                                            | Purpose                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/(staff)/layout.tsx`                                    | Label the existing shortcuts, add current-page semantics and focus, opt into the operational drawer, reserve bottom-bar space, and make the main canvas programmatically focusable.                                                                                   |
| `src/app/(admin)/layout.tsx`                                    | Replace mobile flattening with the existing hierarchy; preserve every tree entry and badge/query calculation; use semantic navigation classes; opt into the drawer; provide a focusable main canvas.                                                                  |
| `src/components/dashboard/portal-mobile-nav.tsx`                | Add optional role-owned navigation rendering and operational Dialog behavior; handle desktop dismissal and existing search handoff; improve Staff/Admin header targets and labels. The Client default path remains intact.                                            |
| `src/components/dashboard/portal-sidebar.tsx`                   | Semantic tree styling, visible focus, stable controlled IDs and accessible hidden branch content. Client does not consume this tree branch primitive.                                                                                                                 |
| `src/index.css`                                                 | Append only the Staff/Admin navigation block: drawer sizing/scrolling, wrapping, focus, language-control colors, restrained rails/motion and Staff safe-area spacing. All new selectors require Staff/Admin ownership.                                                |
| `tests/navigation/adapters.tsx`                                 | Test-only identities, blocked commands and browser-history transport, extending the existing CUI-19 query adapters. No production mock layer.                                                                                                                         |
| `tests/navigation/fixture.tsx`                                  | Mount actual Staff/Admin layouts and their real UI role guard in an isolated browser fixture. Only the workspace body is a test focus target.                                                                                                                         |
| `scripts/qa/verify-staff-admin-navigation.mjs`                  | Repeatable before/after browser matrix, destination preservation, keyboard/focus checks, scoped Axe audits, wrong-role UI checks, real search handoff and screenshots. All non-fixture network requests are aborted; artifacts must stay beneath ignored `.local/qa`. |
| `doc/ui-reference/staff-admin/SESSION-02-ENGINEERING-REPORT.md` | This engineering record. Does not revise the Client authority or create business requirements.                                                                                                                                                                        |

Session 01's `src/views/admin/AdminDashboard.tsx` and engineering report were preserved. No business logic, query hooks, commands, permissions, API contracts, data models, backend modules, dependencies or new routes/features were introduced.

## C. Verification matrix

| Check                                    | Before / Session 01                                                                | Session 02 result                                                                                                                                                                                                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full unit suite, two workers             | 608 pass, 9 fail                                                                   | **608 pass, same 9 fail**; exact failure sets match.                                                                                                                                                                                                  |
| Full lint                                | Pass                                                                               | Pass, exit 0.                                                                                                                                                                                                                                         |
| Typecheck and Next route type generation | Pass                                                                               | Pass, exit 0.                                                                                                                                                                                                                                         |
| Integration                              | 10 pass, 16 skipped, 3 setup-failed files                                          | Same result, exit 1; no database available.                                                                                                                                                                                                           |
| Staff/Admin browser matrix               | Before captures record missing labels, flat Admin menu and non-modal focus defects | **20/20 cells pass**, exit 0: two roles × two themes × five widths.                                                                                                                                                                                   |
| Navigation and UI guard                  | Source-verified boundaries                                                         | Existing destination inventories preserved; mismatched synthetic Client identity denied by the real UI guard in every cell. Server authorization is not exercised by this fixture.                                                                    |
| Scoped Axe                               | Saved older live shell has contrast defects                                        | No serious/critical violations in tested mobile headers, drawers or desktop sidebar navigation. Footer, dashboard body, global search and complete-page acceptance are not included in this claim.                                                    |
| Client functional suite                  | 104 pass                                                                           | **104 pass**, exit 0, including Staff/Admin shared Profile/security and shared Staff chat. The final operational search handoff is separately covered by the navigation fixture.                                                                      |
| Historical Client screenshots            | Session 01 healthy-state captures                                                  | **24/24 identical** under the same historical capture mode; original captures were not overwritten.                                                                                                                                                   |
| Standards-mode Client comparison         | Unchanged compiled UI and CSS as control                                           | **24/24 fresh before/after pairs identical**, covering all 12 screens at 1440px and 360px. Updated shared components are in the candidate bundle.                                                                                                     |
| Client drawer interaction                | Existing Client More/Dialog path                                                   | More, Escape and focus return preserved.                                                                                                                                                                                                              |
| Approved Client reference comparison     | Existing locked JPG references                                                     | Existing same-scale diagnostic test passes execution for all 12 references; acceptance remains **NOT VERIFIED** for synthetic data, substitute fonts and missing approved CMS assets. No reviewed goldens or reference files were generated/replaced. |
| Formatting / diff                        | Existing complete CSS formatting debt                                              | Changed TSX/MJS files and report pass Prettier; only the added CSS block was formatted. `git diff --check` passes.                                                                                                                                    |
| Full build / authenticated E2E           | Known missing-database limitation                                                  | Not rerun against owner resources. Build completion and real authenticated Next routing/data acceptance remain unverified.                                                                                                                            |

### Responsive and keyboard evidence

All Staff/Admin widths **360, 390, 768, 1024 and 1440px** were captured in both theme modes. The mobile path is below 48rem; 768px and above use the existing desktop sidebar.

Phone checks exercise keyboard opening, initial focus, forward/reverse Tab containment, Escape, explicit close, focus return, group expansion, active deep CMS selection, case navigation, real browser back events, responsive dismissal, main-canvas focus, English/Nepali labels, long-label wrapping, account-control reachability, 44px minimum primary targets, and no horizontal document overflow. The actual global search palette receives Ctrl+K, retains focus after Tab and dismisses with Escape. Desktop checks exercise hierarchy expansion, current routes and visible link focus. Screenshots were executed and inspected, including Staff primary navigation and Admin hierarchical/account drawer views.

These are actual Chromium checks on real application components with isolated test adapters. Their history transport models client navigation; they do not execute the authenticated Next server, RSC loading or persistence.

### Commands executed

From the upgrade worktree:

```powershell
node node_modules/vitest/vitest.mjs run tests/unit --maxWorkers=2 --reporter=json --outputFile=.local/qa/session-2/baseline-unit.json
node node_modules/vitest/vitest.mjs run tests/unit --maxWorkers=2 --reporter=json --outputFile=.local/qa/session-2/final-unit.json
node node_modules/vitest/vitest.mjs run tests/integration --maxWorkers=2 --reporter=json --outputFile=.local/qa/session-2/integration.json
npm run lint
npm run typecheck
node scripts/qa/verify-staff-admin-navigation.mjs before
node scripts/qa/verify-staff-admin-navigation.mjs after
$env:CUI20_ARTIFACT_DIR = (Join-Path (Get-Location) '.local/qa/cui-20/session2-after')
node node_modules/@playwright/test/cli.js test --config playwright.functional.config.ts
$env:CUI19_ARTIFACT_DIR = (Join-Path (Get-Location) '.local/qa/cui-19/session2-reference')
node node_modules/@playwright/test/cli.js test --config playwright.visual.config.ts --grep 'approved references'
$env:CUI19_ARTIFACT_DIR = (Join-Path (Get-Location) '.local/qa/cui-19/session2-after')
node scripts/qa/build-client-visual-fixture.mjs
node .local/qa/session-2/client-preservation.mjs
node node_modules/prettier/bin/prettier.cjs --check 'src/app/(staff)/layout.tsx' 'src/app/(admin)/layout.tsx' src/components/dashboard/portal-mobile-nav.tsx src/components/dashboard/portal-sidebar.tsx tests/navigation/adapters.tsx tests/navigation/fixture.tsx scripts/qa/verify-staff-admin-navigation.mjs
git diff --check
```

The before navigation capture must precede changes; for a separate run, set `STAFF_ADMIN_NAV_ARTIFACT_DIR` to a dedicated directory beneath `.local/qa`. Direct Node CLIs avoid the npm argument-forwarding incident from Session 01. Logs, manifests, screenshots, failure probes and JSON evidence are retained under `.local/qa/session-2/`, `.local/qa/cui-19/session2-*` and `.local/qa/cui-20/session2-after/`.

### Diagnostic failures resolved during verification

The first new mobile probe looked for an “Open” label after the control correctly changed to “Close”. The corrected locator accepts both states while retaining all state assertions. That failed run is archived as `navigation/after-01-locator/`; repository tests were not changed.

A Client Documents comparison initially differed. Implementation/sign-off work paused while it was traced. Session 01's helper omitted `<!doctype html>` and captured in quirks mode; the new helper initially used standards mode, affecting table line-height. All four old/new JS/CSS combinations produce identical Documents images within standards mode. Matching the historical mode reproduces all 24 original captures, and independent standards-mode control/candidate pairs match for all 24 cases. This was a test-configuration mismatch, not an application regression. Client source and approved references were not altered to resolve it.

## D. Open risks

1. The nine inherited unit failures remain separately visible. Current navigation uses readable semantic tokens, but the broader palette/source-documentation contract is not reconciled.
2. The saved full-page contrast problems include dashboard primary action and footer status text outside this navigation pass. Scoped Axe success does not establish complete shell/page accessibility.
3. Authenticated database/session/storage QA is unavailable. Real Next routing, browser back with server transitions, persistence, authentication and permission enforcement still need a disposable environment.
4. Global search's existing non-Client static catalog and quick actions include Admin destinations even for Staff, and an absent `/admin/conflict-checker` destination. The appointment keyword list also includes hearings. Case destinations already choose the proper portal. Catalog correction is a separate source-verified navigation task; no missing route/module was invented here. Search opening/focus handoff is verified, not all search destinations.
5. Notification/account popups and every operational page's state matrix have not received complete theme/focus review. No Client popup/navigation behavior was changed.
6. Reference visual approval remains separate from synthetic component screenshots. The historical quirks-mode captures should not be treated as production standards-mode goldens.

## E. Next phase recommendation and sign-off

The requested mobile/sidebar navigation and focus implementation is verified in isolated browser QA, and can be reviewed independently of page redesign. **The full shared shell is not yet unconditionally signed off as a production foundation for Staff Home redesign.**

First correct the existing Staff/Admin search catalog boundaries and dead destinations using only supported routes, reconcile the remaining contrast/test-contract debt with actual styles, and provision a disposable authenticated QA environment. After that shell acceptance checkpoint, proceed to a bounded Staff Home composition pass, including repeated hero/KPI statistics. Do not redesign additional pages or revise Client styling to work around these limitations.
