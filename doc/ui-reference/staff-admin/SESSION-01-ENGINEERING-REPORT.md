# Staff/Admin UI upgrade — Session 1 engineering report

Date: 13 October 2026 (Asia/Katmandu). Scope: baseline verification, shared visual foundation, and remaining Admin dashboard hearing navigation errors. No page-wide redesign or new business functionality.

## Workspace and branch

- The supplied `D:/lexnepal` checkout started on `main` at `268e3d3d13defa380b912b7edc0597ef58e6e957`, behind its existing remote-tracking ref by 17 commits.
- It contained six modified files: `src/components/cases/cases-workspace.tsx`, `src/shared/contracts/case-ui.ts`, `src/views/client/ClientCaseDetailPage.tsx`, `src/views/client/ClientCasesPage.tsx`, `src/views/staff/StaffCaseDetailPage.tsx`, and `tests/unit/cases-r9-a11y.test.ts`. `.logs/` and `node_modules.bak.20260921023958/` were untracked. That status is unchanged at session end.
- Fetched the requested remote branch and created an isolated worktree at `D:/lexnepal/.local/worktrees/ui-staff-admin-upgrade`, on tracking branch `ui/staff-admin-upgrade`. Its starting tree was clean.
- Implementation starting commit: `e2b7c813e1f975d7904c2a9dd67385cdcb1d0d4b`.
- Pre-upgrade comparison commit: `319d7c6`, the parent of `0b58cf6`, in detached worktree `D:/lexnepal/.local/worktrees/staff-admin-session1-parent`.
- Dependencies were reused through local `node_modules` junctions. Installed Next.js `16.3.4` matches the lockfile. Node is `24.18.1`; npm is `11.12.1`. No dependencies were installed or changed, and the owner's environment file was not copied.
- No session commits or pushes. Application changes and this report remain uncommitted in the upgrade worktree. No commits were made on `main`.

## Instructions and architecture reviewed

Read `AGENTS.md` before implementation. Read the installed Next.js guides for CSS, layouts/pages, Server/Client Components, linking/navigation, and Playwright. In particular, global CSS persists across route navigation; role scoping is essential even when styles originate from a portal route.

Read the authoritative Client DOCX by extracting its document XML, its Markdown companion, the Client reference README, and the CUI-19, CUI-20 and CUI-21 checkpoint documentation. The branch descends from the CUI-22 freeze merge. Older checkpoint documents retain explicit visual/authenticated-E2E acceptance limitations; this session does not establish a new Client owner sign-off or change that contract.

Verified 15 Staff and 27 Admin page entry points. Both route-group layouts use the existing dashboard architecture: role/session guards, branding provider, sidebar, topbar, mobile navigation and footer. Admin case detail re-exports `StaffCaseDetailPage`; that shared view selects its role/base path from the pathname and already supports `?tab=hearings`.

Inspected the actual dashboard primitive/table implementations and consumers, generic Radix tabs, buttons, inputs, textarea and selects, portal page shell, mobile navigation, semantic mappings, branding overrides, global CSS, Vitest configuration, Playwright configurations and relevant tests. Portal branding can override semantic values inline. Radix popup content can render outside the dashboard root, so descendant CSS does not automatically theme those surfaces.

## Existing commits audited

| Commit                                     | Source-verified result                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0b58cf6471f1de2669861a64c41b106e9937d343` | Generic tabs use Staff/Admin-scoped semantic color overrides. The selector excludes Client/public roots. `--dashboard-radius-control` and `--dashboard-shadow-card` were defined only in the Client theme, so Staff/Admin used hardcoded fallbacks. Hover treatment and generic focus-ring colors were still inherited from the generic tabs component. |
| `e2b7c813e1f975d7904c2a9dd67385cdcb1d0d4b` | Removes two nonexistent `/admin/tasks` links, relabels the appointment quick action and removes unsupported “Live / Updated just now” copy. Source search finds no remaining `/admin/tasks` destination. However, the hearing KPI, individual hearing priorities and empty hearing-history CTA still targeted appointments.                             |

## Package scripts and baseline checks

The repository exposes `lint`, `typecheck`, `build`, `test:unit`, `test:integration`, `db:test`, `test:migration-characterization`, `test:e2e`, `test:visual:client`, `test:functional:client`, and `format:check`. `test` aggregates unit, integration, migration-characterization and database suites. Database/seed/migration workflows were not run against the owner's data.

| Command/check                    | Baseline result                                                                                                                                      | Implementation verification                                                                                                                                                                                                                                            |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                   | Exit 0                                                                                                                                               | Exit 0; final Admin view also passes targeted ESLint.                                                                                                                                                                                                                  |
| `npm run typecheck`              | Exit 0; route type generation and TypeScript pass                                                                                                    | Exit 0.                                                                                                                                                                                                                                                                |
| `npm run test:unit`              | Initial default-worker run: 607 pass, 10 fail, including one source-scan timeout                                                                     | Direct CLI with two workers confirms 608 pass, 9 fail, before and after; failure names match exactly.                                                                                                                                                                  |
| Parent unit checks at `319d7c6`  | Reproduce the same assertions and the default-worker timeout; direct constrained verification reproduces the same nine consistent assertion failures | No new unit failure attributable to either upgrade commit or this session.                                                                                                                                                                                             |
| `npm run test:integration`       | Exit 1: two suites pass, three fail during setup; 10 tests pass, 16 skip                                                                             | Requires `DATABASE_URL` for disposable local database setup. No application assertion regression established.                                                                                                                                                          |
| `npm run build`                  | Exit 1 after successful compilation and TypeScript; page-data collection requires `DATABASE_URL`                                                     | Same environment failure after successful compilation and TypeScript. Different parallel workers report analytics versus appointment routes first. The final dark-tab color refinement was subsequently compiled and checked through the browser CSS harness.          |
| Direct Playwright `--list`       | Exit 0: 112 E2E tests in 31 files discovered                                                                                                         | Discovery only; authenticated E2E acceptance is unverified.                                                                                                                                                                                                            |
| Isolated Client functional suite | Available safe fixture architecture inspected                                                                                                        | Exit 0: 104 tests pass, including Staff/Admin shared Profile editing/security and shared Staff chat. This suite used the initial foundation CSS; the final dark-tab refinement was verified separately in the final browser matrix.                                    |
| Shared browser matrix            | Eight component samples: Staff/Admin × light/dark × 1440/360 px                                                                                      | All eight pass: Radix keyboard selection and panels, disabled tab/loading button, editable input, visible focus, no document overflow, local table/tab scrolling, restrained metric hover. Selected tab text and table headings meet 4.5:1; input boundaries meet 3:1. |
| Client screenshot preservation   | 24 healthy-state captures: 12 real Client screen components × 1440/360 px                                                                            | All 24 screenshots are byte-identical to baseline. Uses the existing isolated test adapters and pinned font.                                                                                                                                                           |
| Formatting / diff                | Whole `src/index.css` already fails Prettier                                                                                                         | Still fails because untouched legacy CSS is unformatted. Only the changed CSS block was formatted with repository settings. Admin view passes Prettier; `git diff --check` passes.                                                                                     |

The nine consistent unit failures are:

- Two assertions in `cases-r7-client.test.ts` expecting legacy hook names/implementations.
- One assertion in `cui-09-client-checklist-contract.test.ts`: an unbounded CSS regex matches gradients later in the file rather than confining itself to the Checklist rules.
- One Admin sidebar contrast assertion in `dashboard-color-system.test.ts`.
- Five assertions in `dashboard-contrast.test.ts`: Admin light actions, Admin light boundaries/charts, Staff light hero text, Client light boundaries/charts, and the source palette prohibition. These include real palette shortcomings and a hex-only parser that does not resolve the Staff hero's RGBA override correctly. They have not been disabled, weakened or relabeled as passing.

The original default-worker source-scan timeout in `frontend-data-adapter.test.ts` clears under two workers without changing its timeout or assertions.

### Exact additional verification commands

Run from the upgrade worktree, unless the parent comparison is specified:

```powershell
node node_modules/vitest/vitest.mjs run tests/unit --maxWorkers=2 --reporter=json --outputFile=.local/qa/session-1/baseline-unit-confirmed.json
node node_modules/vitest/vitest.mjs run tests/unit --maxWorkers=2 --reporter=json --outputFile=.local/qa/session-1/after-unit.json
node node_modules/@playwright/test/cli.js test --config playwright.config.ts --list
$env:CUI19_ARTIFACT_DIR = (Join-Path (Get-Location) '.local/qa/cui-19/session1-before')
node scripts/qa/build-client-visual-fixture.mjs
node .local/qa/session-1/browser-check.mjs before
node .local/qa/session-1/browser-check.mjs after
$env:CUI20_ARTIFACT_DIR = (Join-Path (Get-Location) '.local/qa/cui-20/session1-after')
node node_modules/@playwright/test/cli.js test --config playwright.functional.config.ts
node node_modules/eslint/bin/eslint.js src/views/admin/AdminDashboard.tsx --max-warnings=0
node node_modules/prettier/bin/prettier.cjs --check src/views/admin/AdminDashboard.tsx src/index.css
node .local/qa/session-1/format-check.mjs
node .local/qa/session-1/source-check.mjs
git diff --check
```

The combined Prettier command exits 1 for the pre-existing CSS formatting issue; the Admin-only check exits 0. The format comparison confirms both the original and current complete CSS are unformatted. Source preservation and browser checks exit 0. Unit commands exit 1 for the same nine baseline assertions.

Parent confirmation used the same direct Vitest CLI with two workers against `dashboard-color-system`, `dashboard-contrast`, `cases-r7-client`, `cui-09-client-checklist-contract`, and `frontend-data-adapter`, producing the same nine assertion failures.

### Execution incident and limits

Windows `npm.ps1` discarded forwarded arguments in the initial attempted `npm run test:e2e -- --list`; it started the live runner against the pre-existing localhost server. Four public accessibility checks passed and one Admin shell check failed before the runner was interrupted. This is not evidence for the isolated upgrade checkout, and no authenticated CRUD tests were completed. Subsequent argument-bearing checks used the underlying Node CLIs directly. The interrupted run's Admin failure cause is not established.

Initial local browser probes needed synchronization after Radix selection and parsing of CSS Color 4 `color(srgb ...)` values; the final probes correctly wait and calculate contrast. Repository tests and assertions were not modified.

## Files changed and rationale

| Tracked file                                                    | Minimal correction and preservation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.css`                                                 | Extends the existing Staff/Admin block. Defines missing radius/shadow tokens, aliases a semantic control border, provides readable selected-tab colors in both modes, calms card/list hover motion and shadows, aligns section heading typography and card corners, rounds filters/buttons/fields consistently, preserves invalid-input borders, gives fields explicit semantic focus outlines, improves table heading size/color and row hover, flattens empty-state decoration, and contains overflowing tab lists. Reduced-motion overrides cover shared card/list/tab and hero entry motion. Every changed rule requires Staff/Admin ownership; no Client-specific selector or shared component API changes. |
| `src/views/admin/AdminDashboard.tsx`                            | Hearing KPI opens existing Cases; individual hearing entries open their existing case Hearings tab; empty hearing-history CTA honestly says “View cases”; priorities header accurately says “View appointments”. All queries, computed data, permissions, forms and commands are unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `doc/ui-reference/staff-admin/SESSION-01-ENGINEERING-REPORT.md` | This engineering record; creates no UI requirement or revision to the locked Client specification.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

Ignored QA helpers, logs, bundles, manifests and before/after screenshots remain under `.local/qa/session-1/`, `.local/qa/cui-19/session1-before/`, and `.local/qa/cui-20/session1-after/` in the upgrade worktree. Parent comparison evidence is in the detached parent worktree's `.local/qa/`. No production mock provider, test data array, dependency, component library or business module was added.

## Client regression assessment

Source verification proves that every byte of `src/index.css` outside the existing Staff/Admin block equals starting HEAD. All changed CSS selectors explicitly require Staff/Admin classes. Client layouts, views, CSS selectors, source-of-truth documents and shared component implementations are unchanged. The original workspace's local Client edits remain intact.

The 24 exact screenshot comparisons and passing isolated interaction suite support no observed Client regression. Their synthetic adapters are test-only. They do not establish real API/session/storage persistence, production fonts/CMS artwork, owner reference acceptance, full visual state coverage, or authenticated E2E. No production-readiness claim is made while the build and repository acceptance checks remain incomplete.

## Remaining source-verified risks and next step

- Staff hero chips repeat tasks-due and unread-message KPI values; the hearing-today count also appears as KPI helper text. Deferred to a bounded Staff Home composition pass.
- Staff mobile chrome has an icon-only bottom bar using the first five navigation entries; Admin has no equivalent bottom bar. The shared nav intentionally accepts a wrapper-owned bottom bar. Navigation/focus work needs a separate per-role preservation review.
- Hardcoded status, chart/empty-state decoration and Admin page colors remain. The foundation overrides selected shared surfaces without rewriting every consumer or changing the Client defaults.
- Generic segmented controls implement `role="tablist"` with buttons and no arrow-key handler; the successful Radix tab probe does not validate that separate widget.
- Popup/dialog portals can escape semantic theme inheritance. Their content and complete Staff/Admin form state matrix were not rethemed or accepted here.
- Global search still lists “hearings” among appointment keywords. No new Admin hearing route exists; future corrections must reuse actual case hearing workflows.
- `doc/DASHBOARD_COLOR_SYSTEM.md` describes older Admin/Staff/Client palettes and overstates acceptance. Existing contrast/source tests and prior Client checkpoint documents also drift. Do not silently update the Client contract or weaken tests to obtain green results.
- All 42 portal routes have been inventoried, but they have not received live authenticated visual/workflow review. Missing isolated database/environment setup still blocks build completion and meaningful full E2E acceptance.

Recommended next implementation step: establish a disposable authenticated QA environment and review the existing contrast/documentation discrepancies with actual computed styles. Then take a small Staff/Admin navigation/focus pass, including mobile labels and popup theme inheritance, before redesigning Staff Home or any additional route. Preserve the frozen Client selectors and keep workflow changes outside this UI scope.
