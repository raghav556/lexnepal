# Session18B — Merge-readiness closure

2026-10-23, Asia/Kathmandu. **BLOCKED for merge.** The eight outstanding assertions are resolved and the full unit/integration run passes. This does not override the failed dependency-audit, formatting and migration-bootstrap gates, missing published assets, remaining action coverage, enabled GitHub Pages deployment configuration, or disclosed test-isolation exception. Phase B is unstaged and requires owner/TL review. No deployment.

## Phase A checkpoint and safety

Phase A committed exactly the approved 14 paths (11 modified, three new), including all verified Session18 work, as `e1d4ac1b0afb3e9fde56eca7f9a87b90c9761677` — `fix(integration): resolve cross-portal integration regressions`. Parent: `a228e1658df473044b37a92cf60b4eb6cb67661a`. Normal push to `origin ui/staff-admin-upgrade`; a separate fetch/remote query verified the SHA, parent and exact committed path set. Evidence: `.local/qa/session-18/checkpoint-verified.json`. The checkpoint accurately retained 976 passing tests and eight existing failures; it was not release approval.

Worktree: `D:\lexnepal\.local\worktrees\ui-staff-admin-upgrade`; branch `ui/staff-admin-upgrade`; origin `https://github.com/raghav556/lexnepal.git`. Phase B starts at that verified commit. AGENTS.md, installed Next.js guidance, authoritative Client DOCX/Markdown and the existing Session18 report/inventories were reused. No reset, stash, clean, rebase, force push, dependency installation, application schema migration or unrelated-checkout edit. `node_modules` remains the existing junction to `D:\lexnepal\node_modules`; no dependency upgrade was attempted through that shared directory.

Protected Session08 remains the sole unrelated working-tree modification, untouched and unstaged. Required/raw SHA-256: `1ACEB9535586A43197F561057EEC9DB9409CAB5F12994629C43F86F5FE7BC78E`. Its pre-existing CRLF normalization difference is not repaired. Phase B index remains empty. Local main `268e3d3d13defa380b912b7edc0597ef58e6e957` and fresh remote main `319d7c682d13ed8833d3a1e917fc2049f59c2a02` remain unchanged.

## Eight-failure resolution matrix

The independent Session18 baseline proof is retained; no baseline audit was replayed. All original security/privacy assertions outside the identified stale expectations remain. No test was deleted, skipped or weakened.

| Old failure | Verified cause / correction | New evidence |
| --- | --- | --- |
| R0 document visibility (1) | A source slice stopped before the shared retrieval helper. Replace it with real service invocations of legacy list/search and both continued methods: authenticated Client ID, firm, authorized cases, limits/lookahead and foreign-firm Client denial. | `cases-r0-baseline.test.ts`; existing 28 real SQL/service/route retrieval tests also pass. |
| R7 Client hook assertions (2) | Status-aware Client query accessors replaced data-only hooks; Booking uses appointment queries and Signatures uses the signing inbox. AST import assertions reject every Staff case-query variant, accept the actual Client accessors, and verify the appointment/inbox dependencies. Existing DTO allowlist, other-Client denial, lifecycle, internal-data and shell checks remain. | `cases-r7-client.test.ts`; rendered Client/error/security suites retained. |
| CUI03 Staff CommandCenter (1) | Staff now opens the approved shared search palette. Check its actual open/close/portal wiring, plus browser input/focus/Escape behavior in English desktop and Nepali tablet. Approved mobile chrome continues to hide the desktop topbar. | CUI03 test and `workflow-evidence.json`. |
| CUI09 gradient regex (1) | An unbounded regex crossed unrelated later CSS. Parse actual CSS rules, inspect every checklist declaration for gradients and assert the exact solid progress fill. Other prior-phase guarantees remain. | `cui-09-client-checklist-contract.test.ts`. |
| CUI17 profile error source shape (1) | Session errors now expose retry in all portals; Client technical audit details are guarded by a conditional container. Correct the source contract and add rendered session-error/privacy assertions for all three portal variants. Existing Client cached-data denial/redaction tests remain. | CUI17 state and cached-profile suites. |
| Client light border contrast (1) | The frozen decorative border `#d7dde6` was incorrectly required to identify every control. Preserve that token and every locked accent; actual editable input/select/textarea/combobox boundaries use the existing stronger focus token. Required focus/chart contrast assertions remain. | Contrast/CUI02 tests; actual Client booking controls, keyboard focus and scoped scans in both modes. |
| Admin raw palette contract (1) | Dashboard, sidebar badges and shared primitive defaults still used raw colors. Reuse existing semantic portal/tone/chart/tooltip tokens and the existing tone map. No new palette or business calculation. | Dashboard contrast/color suites and six populated portal dashboard scans. |

The first combined run exposed an additional CUI04 contradiction: its literal raw-blue default assertion conflicted with the semantic palette contract. Its replacement renders all six real status-badge tones and verifies semantic hooks, text and tone classes; the other shell/primitive protections remain. This new failure was corrected, not hidden. The resulting complete unit/integration run is **112 files, 1,217 passed, zero failed/skipped** (`full-final.json`, `full-final-2.log`).

## Additional verified UI corrections

- Public profile image failure had no fallback. The existing initial/name fallback now also handles a failed portrait URL; a new URL can still render. Visual dark-mode review also found its initial and role badge blending into the hero; both now use the hero foreground, with explicit composited-color contrast checks. The successful SSR/publication guard is retained.
- The Public appointment caption failed light contrast (2.97:1); the closing call-to-action subtitle failed verified dark contrast (4.3:1). Both use the existing opaque foreground token, with no new color.
- Activating the fixture's licence expiry exposed an existing raw `2027-01-15` display, bypassing Session17E. It now calls the canonical locale formatter: English A.D. first, Nepali B.S. first. The API's original A.D. date is independently asserted unchanged. No converter, storage, expiry rule or API contract changes (`public-licence-before.log`).
- Admin invitation dialog lacked an accessible name and explicit visible-label associations. Its title, full name, email, phone, role and optional bar-council field now have linked IDs. Existing validation, invitation command, role choices and public-facing default are unchanged. EN/NE tests select Paralegal, intercept a 403 and successful retry, verify retained identical payloads and close behavior. No invitation email is sent.
- Opening the populated Admin chart exposed a text/background mismatch during the semantic-token correction. The actual month label was almost white over white in light mode. Both tooltip surfaces and item text now use matching tooltip tokens; chart-series colors no longer override text contrast. Scrolling exposed warning-chip text at 3.07:1; the small text/counters now use the existing soft/foreground pair. A direct computed-color assertion supplements axe, which did not report the transient tooltip's first defect. These pre-review regressions were caught and corrected, not labelled historical. Preserved evidence includes `tooltip-before-paired-tokens.json`, `tooltip-before-item-foreground.json`, `tooltip-before-warning-foreground.json` and `tooltip-geometry-before.log`.

## Public lawyer and CMS asset closure

The lawyer fixture uses a **schema-only disposable local database**, not live CMS records. One published active lawyer is returned; unpublished, inactive, Client-role and foreign-firm identities return 404 from both API and SSR (eight negative requests). A valid profile renders HTTP200; its actual detail DTO excludes private contact, status, salary and credential-secret fields. EN1440/light and NE390/dark exercise the failed portrait fallback, readable initial/role, locale-aware licence date and keyboard navigation to consultation with the same published `lawyerId`.

Actual document theme and language are asserted after hydration; setting a storage preference alone was insufficient. The corrected harness waits for the committed React root before changing its test theme, then allows transitions to settle. Earlier light-only/mobile results and one start attempt overlapping a production build are preserved and excluded. A TSX serialization error in a browser color probe was fixed by calculating luminance outside `page.evaluate`; no assertion was removed. No hydration warning is suppressed. Final evidence: `isolated-public-evidence.json`, `public-final-verified.log`; genuine `lawyer-en-1440.png` / `lawyer-ne-390.png`.

Read-only CMS references and promoted intents were reconciled against configured local storage and actual delivery URLs. No record or object was rewritten (`cms-asset-trace.json`).

| Published reference / asset ID | Object / HTTP result | Status |
| --- | --- | --- |
| `logoUrl` / `4c93e918-c131-49b3-b91d-384ddbd15681` | Promoted intent exists; object absent; HTTP404 | **BLOCKED: original binary restoration**. Existing brand fallback works. |
| `director_message` photo / `b3275362-ffa2-438b-8d96-837aa71b0eb6` | Promoted intent exists; object absent; HTTP404 | **BLOCKED: original binary restoration**. |
| `director_message` signature / `b31f5f58-24a9-412a-bdc3-b6354143933d` | Promoted intent exists; object absent; HTTP404 | **BLOCKED: original binary restoration**. |
| `heroImageUrl` / `7bc4ec00-6653-4d44-9074-b1a4ec72b31d` | Object readable, 91,788 bytes; HTTP200 | Available now. Earlier 404 is not claimed as current. |

Missing original data is not an application-side URL rewrite opportunity. No fake image or invented lawyer was inserted into the application database.

## Complete handler/action coverage ledger

[SESSION-18B-COVERAGE.json](SESSION-18B-COVERAGE.json) retains **all 164 handlers, 219 supported method declarations and 276 unique source workflow declarations**, with original inventory coordinates, evidence and scope. The existing 80-route matrix was reused; the previously unavailable positive lawyer profile now has isolated positive evidence. There was no second route audit.

| Gate | Execution / truthful boundary |
| --- | --- |
| 184 direct session methods | Real handlers, missing-session fixture, HTTP401 before any SQL. The database adapter refuses I/O. Includes previously unexecuted mutation methods. |
| Remaining 35 methods | Actual isolated HTTP: public CMS/operational routes, auth adapter, local legacy session contract, public avatar, invalid intake/share/resource submissions and storage token/grant failures. Public requests are not incorrectly required to return401. |
| All 93 previously unswept handlers | Now have the appropriate method-contract evidence in the ledger. This is anonymous/public branch coverage, **not authenticated success certification**. |
| 46 sensitive-service cases | Real Client capabilities and services deny user/role/settings/audit/case/CMS/payroll/envelope management before I/O. Client document-upload capability is preserved: three document actions instead test same-firm non-owner denial, foreign-firm404 and legitimate owner access at the policy boundary. |
| Existing stronger domain evidence | Full suite includes isolated signing, own-audit, cross-firm policies, safe notification links, repository cursor/visibility boundaries, cache isolation and date/court/pagination tests. Service-level evidence is not relabelled as HTTP success for every route. |
| UI conditional declarations | **35** have specific or inherited evidence, including approved retention; **241** remain **NOT TESTED** individually. Default route rendering does not prove every conditional dialog/action. |

Remaining critical UI certification gaps include the user-management drawer's status/MFA/session actions, signing final/consent dialogs and several document share/version/envelope/hold dialogs. The approved retention policy/date evidence is retained separately; its read-only date and policy-only payload were not changed. Service/API denial tests do not certify every frontend success path. Positive authenticated HTTP and cross-tenant HTTP execution are marked separately in every method row; no inferred blanket PASS.

The ledger covers exported method declarations. Framework-generated verbs and every auth-provider subpath are not separately certified. Source permission references describe actual code, not inferred successful authorization tests.

## Consolidated gates and failed release prerequisites

Evidence under `.local/qa/session-18b/`; historical failed attempts remain. Overlapping runs are not summed.

| Gate | Result / evidence |
| --- | --- |
| Complete unit/integration | **PASS: 112 files, 1,217 tests; zero failed/skipped.** `full-final.json`. Final presentation changes receive **four files / 37 passing focused tests** (`final-presentation-tests.json`) and dedicated real-browser verification; unchanged unit/model/security results are reused. Overlapping results are not added to 1217. |
| Migration characterization | **PASS: four tests**, `characterization.log`. |
| Drizzle/checksums | **PASS:** `db-check.log`, eight immutable SQL checksums in `db-integrity.log`. |
| Production build / TypeScript | **PASS, exit0:** `build-final-closure.log`, `typecheck-final-closure.log`; final harness adjustment also typechecks (`typecheck-final-harness.log`). Earlier failed test-fixture literal typing was corrected without runtime or production-contract change. |
| ESLint | **PASS, exit0:** full repository (`lint-final.log`), final production deltas (`eslint-final-closure.log`) and final harness (`qa-harness-eslint-final.log`). |
| Focused browser/accessibility | **16 groups / 18 clean scoped scans:** portal dashboards/search, Client date boundaries, Public profile, Admin invitation, open tooltip and lower dashboard cards. Artifacts are reconciled in `evidence-summary.json`; prior Session18 scans are not added. Four invitation requests fulfilled in browser memory; **zero live test mutations or external deliveries**. |
| Formatting | **FAIL: 120 files.** All120 also fail Prettier when their exact committed HEAD bytes are checked; 119 are byte-equivalent and the remaining file is existing `src/index.css` with the scoped control-border addition. `format-baseline-proof.json`. Touched TS/JS files are formatted. No mass rewrite of unrelated files. |
| Migration bootstrap | **FAIL before assertions** at existing `drizzle/0004_nullable_timestamps.sql`, `UPDATE appointments ... deleted_at = '0000-00-00 00:00:00.000'`. Committed SQL, original test and fixtures are unchanged. This gate is not called passing because migration integrity passes. `migrations.json` / `migrations.log`. |
| Production dependency audit | **FAIL:** unchanged lockfile graph currently reports **2 critical, 4 high, 9 moderate** (`audit-production.json`). Critical packages include Next.js and DOMPurify. No exploit or non-applicability waiver is inferred. See the reviewed [Next advisory](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j) and [DOMPurify advisory](https://github.com/advisories/GHSA-mrv2-3pqr-j5jr). Dependency/security remediation and renewed validation remain necessary. |

**Migration-runner exception:** the first ignored fixture configuration used `mergeConfig`, which concatenated include lists and also executed the repository's fixed-name `dit_lexnepal_test` bootstrap. Both that schema and the randomized fixture failed setup and were removed by test teardown. Their absence is independently verified in `migration-cleanup-proof.json`; the application database `/lexnepal` was not targeted. Prior contents of the fixed-name test schema were not captured, so none are claimed preserved. The corrected configuration explicitly includes only the randomized fixture, confirmed by `migration-corrected-inventory.log`. No failing migration assertion was weakened or skipped; setup did not reach those assertions. This runner error is disclosed rather than counted as successful isolation.

Focused reproduction uses `scripts/qa/verify-merge-workflows.mjs` with its default, `--actions-only` and `--tooltip-only` modes, reusing the retained Session18 fixture worker (hash in `evidence-summary.json`). Do not regenerate/overwrite prior comparisons. After a completed production build, run `node --env-file-if-exists=.env.local --conditions=react-server --import tsx scripts/qa/verify-merge-readiness.ts`; it creates and removes only a schema-copy fixture. Do not overlap that gate with a build. `--browser-only` reuses the separately retained successful API-method artifact.

## Merge and deployment gate

Tracked CI on this branch **and current main** runs on pull requests and pushes to main. Its gates include production audit, generated inventories, formatting, types, lint, unit/integration/characterization, database integrity/tests and build. The observed audit, formatting and bootstrap failures prevent a CI-ready claim. Feature-head check-runs were empty; passing remote CI is not claimed.

GitHub read-only settings inspection found **Pages enabled and built from main**, `build_type: workflow`, an active `pages-build-deployment` workflow and prior `github-pages` deployments from main. Repository webhooks returned an empty list; this does not establish absence of installed hosting apps or external polling. Main protection API reports “Branch not protected.” Evidence: `pages-settings.json`, `workflows.json`, `deployments.json`, `main-ci.yml`, `hooks.json`, `main-protection.json`.

Main's effective rules API returned an empty list. Pages has a branch-policy protection rule, not an observed required-reviewer rule (`main-rules.json`, `pages-protection.json`). `deploy.sh` is operator-driven and was only read. No deployment configuration or GitHub setting was changed. Before any merge, the owner must resolve Pages/other hosting triggers, accept this report, close applicable failed gates and coverage gaps, and approve a separate complete Phase B checkpoint. There is **no merge or deployment authorization from a local build PASS**.

Live delivery, original asset restoration, full storage/PDF/font certification, every authenticated branch, all conditional actions and cross-browser behavior remain unverified. These limitations are distinct from the concrete failed gates above. All 40 other Session17D paths match HEAD; its cached-profile test is extended with all historical assertion bodies retained (AST comparison, `preservation.json`). Canonical retrieval, calendars, court identities, string payloads, pagination, schema and dependency files remain unchanged. No new legal calculation or application migration.

## Exact Phase B manifest and final state

**20 paths: 14 modified, six new.** Protected Session08 is excluded. All six new files belong to this checkpoint; none may be silently omitted after approval.

1. `doc/ui-reference/staff-admin/SESSION-18B-MERGE-READINESS-REPORT.md`
2. `doc/ui-reference/staff-admin/SESSION-18B-COVERAGE.json`
3. `scripts/qa/verify-merge-readiness.ts`
4. `scripts/qa/verify-merge-workflows.mjs`
5. `src/app/(admin)/layout.tsx`
6. `src/components/dashboard/dashboard-primitives.tsx`
7. `src/index.css`
8. `src/views/admin/AdminDashboard.tsx`
9. `src/views/admin/AdminUsersPage.tsx`
10. `src/views/public/PublicLawyerProfilePage.tsx`
11. `tests/integration/application-route-guards.test.ts`
12. `tests/integration/sensitive-service-denial.test.ts`
13. `tests/unit/cases-r0-baseline.test.ts`
14. `tests/unit/cases-r7-client.test.ts`
15. `tests/unit/cui-03-client-shell-contract.test.ts`
16. `tests/unit/cui-04-client-primitives-contract.test.ts`
17. `tests/unit/cui-09-client-checklist-contract.test.ts`
18. `tests/unit/cui-17-cached-profile-kyc.test.ts`
19. `tests/unit/cui-17-client-states-contract.test.ts`
20. `tests/unit/dashboard-contrast.test.ts`

Final branch/local/fresh origin feature HEAD: `e1d4ac1b0afb3e9fde56eca7f9a87b90c9761677`; empty index. The 20 paths above remain unstaged; protected Session08 is the only other nonignored change. `final-safety.json` records the exact porcelain status, path hashes, preservation checks and protected hash. No Phase B staging, commit, push, merge or deployment. **Stop for owner/TL review; merge recommendation BLOCKED.**
