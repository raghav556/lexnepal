# Approved premium Staff Home implementation

14 October 2026, Asia/Katmandu. Owner review is pending on the actual implementation.

## Working state and scope

Worktree: `D:\lexnepal\.local\worktrees\ui-staff-admin-upgrade`.
Branch: `ui/staff-admin-upgrade`.
HEAD remains `d705db7a805996a99539b6af67407b2d95afbc2f`.

Starting work was already uncommitted: `next.config.ts`, `src/index.css`,
`src/views/staff/StaffDashboard.tsx`, the two Session 04 reports/preview note,
Staff Home QA scripts and `tests/staff-home/`. The current Session 04 implementation
was the starting point; it was not reset or replaced with an older Git revision.
The existing development configuration and database were retained.

This refinement changes Staff Home and its existing shell presentation while Home
is mounted. Other Staff page bodies, Admin pages, Client screens, backend/auth,
permissions, queries, mutations and schemas remain unchanged. No dependency,
route, product module or new business action was added. Nothing was staged,
committed, pushed, merged or deployed. The original checkout remains protected.

## Approved reference and source-verified corrections

The owner-approved reference is `Srimar Law Staff Dashboard.png`, supplied from
`C:\Users\user\Downloads\srimar dashboard staff\`. Its visual direction controls
this Staff refinement; illustrative values and unsupported features do not become
application requirements. Client's authoritative DOCX, Markdown and freeze/QA
documents were read and left unchanged. Installed Next.js CSS, image, linked-root
and Fast Refresh documentation were consulted.

The prior Staff Home used a plain white welcome card, a sans-serif title, tall
neutral KPI cards, loose task-list spacing and repeated inset surfaces. The approved
direction calls for a Nepal banner, a gold greeting over navy, serif headings,
compact icon/value KPI compositions, quieter borders and denser operational lists.

The implementation retains the existing shared primitives and adjusts their Staff
Home selectors. The existing navy/gold sidebar now has a restrained navy gradient,
refined configured-name typography and a calm active state. The topbar search and
creation trigger receive compact presentation changes. All shell calibration uses
`.dashboard-staff:has(.staff-dashboard-home)`; other Staff routes retain their
current presentation. No account menu or navigation item was relocated or removed.

The banner reuses the existing approved Nepal mountain/temple artwork from
`doc/ui-reference/client/assets/client-home-hero.jpg`. A byte-identical 91,788-byte
copy is served at `/images/staff-home-nepal.jpg`; the original reference is untouched.
SHA-256: `3e5517fb0a19df1d4e0e6f3f92118e2ec4d867b8abaadfff21fbc25610773a55`.
Existing CMS `heroImageUrl` takes precedence through layered CSS backgrounds, with
the local artwork beneath it as a fallback. The image is decorative and aria-hidden.
Firm identity still comes from the existing branding context; no firm name is hardcoded.

The photo scrim protects the text against a bright image. Compact widths use a
uniform scrim because their text wraps farther across the banner. KPI skeleton
heights were aligned with the new 112px desktop/128px phone cards. Existing loading
labels, empty states, warning text and reduced-motion rules remain available.

## Files changed in this refinement

| File                                                                       | Purpose                                                                                                                                                                            |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/views/staff/StaffDashboard.tsx`                                       | Split the existing greeting into gold/white spans; consume the existing branding context for decorative hero artwork; label the retained shortcut collection Quick actions.        |
| `src/index.css`                                                            | Refine only the existing Staff Home block: banner, scoped sidebar/topbar, KPI layout, serif headings, list/card density, focus, skeleton geometry and responsive photo scrim.      |
| `public/images/staff-home-nepal.jpg`                                       | Serve the unchanged existing approved artwork locally without a new image dependency or CMS/database update.                                                                       |
| `scripts/qa/verify-staff-home.mjs`                                         | Add an optional ignored artifact directory with a containment check and embed the same artwork in the offline bundle; all existing assertions and accessibility thresholds remain. |
| `doc/ui-reference/staff-admin/STAFF-HOME-PREMIUM-DESIGN-IMPLEMENTATION.md` | This implementation and verification record.                                                                                                                                       |

`next.config.ts` is an inherited live-preview change and was not edited here.
No shared primitive, Staff layout, Client selector, test assertion or approved golden
was changed. The source comparison shows that the dashboard's pre-render calculations
are unchanged apart from reading its already available branding context.

## Content and interaction preservation

| Content/workflow        | Preserved contract                                                                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Welcome                 | Existing personalized morning/afternoon/evening greeting and dual Nepali/Gregorian date; task-board primary action.                                             |
| Active cases            | Existing active filter/count; `/staff/cases`.                                                                                                                   |
| Hearings this week      | Existing scheduled next-seven-day count and today helper; `/staff/hearings`.                                                                                    |
| Tasks due today         | Existing pending-task due-date calculation and overdue helper; `/staff/tasks`.                                                                                  |
| Unread messages         | Existing case/matter unread totals; `/staff/messages`; distinct from internal chat.                                                                             |
| My Day                  | Existing today's hearing/appointment filters, clock sorting, badges and destinations.                                                                           |
| Priority Tasks          | Existing priority sorting, top-five selection, matter/due metadata, urgent/overdue warnings and task-board access; no completion checkboxes or mutations added. |
| My Cases                | Existing active records, case numbers, clients, status, hearing metadata and case-detail links; existing mobile table adaptation.                               |
| Upcoming Hearings       | Existing scheduled collection and top-four selection; dates, courts, times and urgency retained.                                                                |
| Messages & Team Updates | Existing DM query, peer names, previews, timestamps and unread indicators; `/staff/team-chat`.                                                                  |
| Recent Documents        | Existing five-record query, type, matter and relative-time metadata; documents destination.                                                                     |
| Team Workload           | Existing directory/workload queries, counts, warnings and display calculation; task-board destination.                                                          |
| Quick actions           | Same six workspaces: tasks, hearings, documents, clients, appointments and research.                                                                            |
| Shell                   | Same Staff catalog, route activation, account controls, search and mobile drawer/bottom navigation.                                                             |

Real before/after KPI values were identical: `2 / 0 / 1 / 2`. All Home destination
sets and desktop navigation href/aria-current inventories matched at every tested
width/theme. No sample screenshot names, invented trends, weather, calendar,
activity feed, support workflow or Staff settings destination were implemented.
The current local My Day is genuinely empty; it was not populated with fake events.

## Actual owner preview and screenshots

**Approved Staff Dashboard design implemented. Please open localhost:3001/staff to review.**

The primary preview is the real authenticated application at
`http://localhost:3001/staff`, served from this worktree in the existing dedicated
VS Code integrated terminal. Use the normal Staff sign-in and existing credentials.
Normal Staff authentication was verified during live-preview restoration; this
refinement used its valid local session and real APIs/data. No authentication bypass,
new database, reseed or database migration was used.

All screenshot paths below are relative to the worktree, under ignored local QA:

| Evidence                               | Path                                                                             |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| Before desktop                         | `.local/qa/staff-premium/before/staff-light-1440.png`                            |
| Before mobile                          | `.local/qa/staff-premium/before/staff-light-390.png`                             |
| Actual implemented desktop             | `.local/qa/staff-premium/after/staff-light-1440.png`                             |
| Actual implemented tablet              | `.local/qa/staff-premium/after/staff-light-768.png`                              |
| Actual implemented mobile              | `.local/qa/staff-premium/after/staff-light-390.png`                              |
| Other width/theme captures             | `.local/qa/staff-premium/after/staff-{light,dark}-{1440,1024,768,390,360}.png`   |
| Actual scrolled supporting sections    | Same after filenames ending `-bottom.png`                                        |
| Additional actual content exports      | `.local/qa/staff-premium/after/actual-staff-content-{1440,390}.png`              |
| Real loading state                     | `.local/qa/staff-premium/navigation/staff-real-loading-390.png`                  |
| Populated/loading/empty fixture states | `.local/qa/staff-premium/final-component/staff-{light,dark}-{width}-{state}.png` |

Actual application captures are authenticated real-data previews. The state/CMS
matrix is explicitly an isolated actual-component fixture, supplementary to the
live app. Full-content exports expand scroll containers only during capture; normal
viewport/overflow checks use the original application layout. The initial before
probe's bottom captures did not wait for smooth scrolling and are not used as evidence;
final after bottom captures explicitly wait for the scroll position.

Staff layout currently pins branding appearance to light. Dark CSS presentation was
also exercised by toggling the existing `dark` class in browser tests, without adding
a product theme-switch feature. The existing Next development indicator and inherited
resource diagnostics can appear in real viewport captures.

## Verification

| Check                          | Actual result                                                                                                                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint                           | `npm run lint`: exit 0.                                                                                                                                                                             |
| Typecheck                      | `npm run typecheck`: exit 0, route types generated.                                                                                                                                                 |
| Units                          | 631 passed / five inherited failures / 636 total; exact failure identities and count match the starting baseline.                                                                                   |
| Staff Home component contracts | 44 passed: 30 width/theme/state cells plus 14 CMS-palette cells; zero serious/critical Axe violations and zero network/database contact.                                                            |
| Actual responsive browser      | 1440, 1024, 768, 390 and 360px, light/dark CSS: all seven sections, four KPIs, unchanged destinations/nav activation, no viewport or main horizontal overflow, visible focus.                       |
| Actual navigation              | Staff-only search, Enter selection, browser back, mobile drawer keyboard entry/Tab containment/Escape/focus return; real loading and empty schedule passed.                                         |
| Continuous Fast Refresh        | Temporary presentation edit and exact restoration passed in the same browser document; listener PID 1828 unchanged.                                                                                 |
| Photo-header contrast          | Actual computed scrim plus worst-case pure-white-image compositing at glyph bounds: minimum normal text 10.32:1 and large title 6.03:1 across the ten width/theme cells.                            |
| CMS/control contrast           | Minimum link/accent 4.74:1, primary CTA 17.56:1, muted text 6.55:1 and focus 3.91:1 in the 14 default/extreme palette cells. Thresholds remain 4.5:1 normal text and 3:1 focus.                     |
| Client functional regressions  | All 104 retained offline interaction tests passed; no real database writes.                                                                                                                         |
| Client visual preservation     | All twelve Client screens at 1440/360px: 24 exact-pixel pairs match the prior Session 04 fixture baseline; Client More/Escape/focus return retained. No approved golden/reference was regenerated.  |
| Source/worktree preservation   | 836 existing source/test/Client reference files byte-identical; entire CSS prefix outside Staff Home unchanged; original owner edits, prior Client checkout and branch/HEAD preserved; index empty. |
| Data/server                    | Domain counts unchanged; no HTTP 5xx or database connection error found in the current development log. Existing public asset 404s remain.                                                          |
| Diff                           | `git diff --check`, empty staged-diff check and changed-file formatting passed.                                                                                                                     |

Exact commands, from the upgrade worktree:

```powershell
npm run lint
npm run typecheck
node node_modules/vitest/vitest.mjs run tests/unit --maxWorkers=2 --reporter=json --outputFile=.local/qa/staff-premium/unit-results.json
$env:STAFF_HOME_ARTIFACT_DIR=Join-Path (Get-Location) '.local/qa/staff-premium/final-component'
node scripts/qa/verify-staff-home.mjs after
$env:CUI20_ARTIFACT_DIR=Join-Path (Get-Location) '.local/qa/cui-20/staff-premium'
node node_modules/@playwright/test/cli.js test --config playwright.functional.config.ts
$env:CUI19_ARTIFACT_DIR=Join-Path (Get-Location) '.local/qa/cui-19/staff-premium-after'
node scripts/qa/build-client-visual-fixture.mjs
node .local/qa/staff-premium/client-comparison.mjs
node .local/qa/staff-premium/live-browser.mjs before
node .local/qa/staff-premium/live-browser.mjs after
node .local/qa/staff-premium/hero-contrast.mjs
node .local/qa/staff-premium/verify-navigation.mjs
node .local/qa/staff-premium/verify-refresh.mjs
node .local/qa/staff-premium/capture-content.mjs
node .local/qa/staff-premium/guarded-check.mjs
git diff --check
git diff --cached --check
```

The offline matrix was run before and after the final photo-scrim/skeleton refinement;
both runs passed 44 cells. Live captures were refreshed after the final changes.
Evidence JSON files remain in `.local/qa/staff-premium/`; session cookies/private
configuration remain ignored and are not included in this report.

## Inherited failures and limitations

These five unit assertions are unchanged, with no reduction in test count or
claim of unrelated baseline repairs:

| File                                       | Assertion                                                               | Inherited classification                                             |
| ------------------------------------------ | ----------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `cases-r7-client.test.ts`                  | consumes useClientCases / useClientCase, not Staff CaseDto hooks        | Older composition/source expectation; untouched.                     |
| `cases-r7-client.test.ts`                  | does not change Client shell, KYC, booking, or STAFF_ROLES              | Older composition/source expectation; untouched.                     |
| `cui-09-client-checklist-contract.test.ts` | uses solid progress fill and freezes prior Client phases                | Existing unbounded CSS-regex contract drift; untouched.              |
| `dashboard-contrast.test.ts`               | client light keeps boundaries, focus, and chart series distinguishable  | Existing frozen Client boundary versus generic contract; unresolved. |
| `dashboard-contrast.test.ts`               | rejects pure black and unapproved one-off colors in dashboard UI source | Existing source palette debt outside this refinement; untouched.     |

Existing CMS logo metadata still points to a missing image object, producing 404s
and the existing legal-emblem fallback. The unchanged external font import/CSP
warning can leave the established local font fallbacks in use. No asset records,
security policy or Client fonts were changed to hide these diagnostics.

This is UI implementation and local preview verification, not complete authenticated
release/CRUD/upload/scanner QA or approved Client-reference acceptance. The isolated
release-QA database and ClamAV prerequisites from earlier reports remain separate.
No database-dependent test setup, seed or production-style write check was run.

## Review boundary

The implementation is ready for the owner's visual review on the live application.
Approval of the reference does not imply approval of these exact rendered results.
Review the banner/card density and responsive layouts before applying these patterns
to another Staff screen. No further Staff/Admin page redesign or checkpoint commit
will proceed automatically.
