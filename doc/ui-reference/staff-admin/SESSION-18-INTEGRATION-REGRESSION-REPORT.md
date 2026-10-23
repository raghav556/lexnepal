# Session 18 — Application integration, regression and release readiness

2026-10-22 through 2026-10-23, Asia/Kathmandu. **NOT READY for release.** Source inventory is complete; executed gates and inherited evidence are distinguished below. Eight baseline-proven test failures remain, a published lawyer profile cannot be exercised with the available public data, and full authenticated/action/live-environment certification is not claimed. No staging, commit, push, merge, deployment, dependency addition or application migration.

## Safety and evidence policy

Worktree `D:\lexnepal\.local\worktrees\ui-staff-admin-upgrade`; branch `ui/staff-admin-upgrade`; local/fresh origin HEAD `a228e1658df473044b37a92cf60b4eb6cb67661a`. Origin `https://github.com/raghav556/lexnepal.git`. Index empty. Protected Session08 remains untouched and unstaged, the sole unrelated modification. SHA-256: `1ACEB9535586A43197F561057EEC9DB9409CAB5F12994629C43F86F5FE7BC78E`.

AGENTS.md, installed Next.js Client Component/concurrent-build/header guidance, authoritative Client DOCX/Markdown, real layouts/navigation/routes and earlier reports were read. Existing localhost:3001/full-stack infrastructure was reused. Next's documented separate dev/build directories permitted production builds; the Contact header change caused the normal development configuration reload. No original-checkout edit or new service/dependency.

Evidence resides under ignored `.local/qa/session-18/`. `evidence-summary.json` selects the latest result per test file; overlapping runs are not summed. `route-inventory.json` records all page/API files, inherited layouts, import closures, navigation declarations and 276 source-reachable form/dialog/tab/selector declarations with file/line coordinates. Conditional declarations default to NOT TESTED; import reachability is not execution proof. Existing approved Session16/17A/17C/17D/17E/17F evidence is reused for unchanged workflow implementations, without adding its hundreds of checks to this session's totals.

## Consolidated gates

| Gate | Evidence and outcome |
| --- | --- |
| Full unit/integration once, on committed baseline | `full-baseline.json/.log`: 109 files, 982 tests; **973 passed, nine failed, none skipped**, exit 1. All six integration files passed (54 tests). No full-suite PASS claim. |
| Independent baseline comparison | `independent-baseline-proof.json`: unchanged assertions read committed source bytes using read-only Git inspection; 60 passed/nine failed across seven files, exactly the same nine failure identities. The slow preliminary instrumentation attempt timed out and is preserved/excluded. |
| Current reconciled tests after focused fixes | **110 unique files, 984 assertions: 976 passed, eight failed, zero skipped**. Includes two new framing-policy tests. Latest affected/shared/branding/audit-policy runs supersede matching baseline files; the original failed full-run exit remains recorded. |
| Production build / TypeScript | `build-release-final.log` and exit file: PASS, including production TypeScript and page generation. Standalone `tsc-release-final.log`: exit 0. Earlier baseline/intermediate builds are retained, not additional coverage. Final rebuilds followed verified production fixes only. |
| ESLint / whitespace | Full baseline lint exit 0 plus final changed-file lint exit 0. `whitespace.log` / `final-safety.json`: approved diffs, new-file EOF/trailing whitespace, exact scope, index and protected hash. |
| Pages | **80/80 inventoried and visited; 79 render PASS, one positive-content BLOCKED.** Staff16, Admin27, Client12, Public17, account/token8. Invalid/missing-token and unavailable-slug responses test guards, not successful authenticated/token workflows. |
| API/security | **164 API handlers inventoried. 71 anonymous GET checks PASS** (70 authentication denials and the deliberately public/missing-avatar 404). Remaining93 have no anonymous HTTP execution claim. Authenticated cross-firm/user/Client/signing/audit/link/cursor security is covered separately by the 54 fixture integration tests and query-isolation tests. |
| Cross-session browser interactions | `browser-critical.json`: 12 groups; Staff EN/Admin NE case creation plus continued Misl/hearing commands, Client/Public calendar/counterpart/invalid recovery, stale-session denial on three portals, wrong-role Client denial. **Four POSTs fulfilled only in browser memory**, canonical English court string and authoritative A.D. dates verified. |
| Changed controls / zoom / audit | `browser-admin-controls.json`: four groups, keyboard tabs/listbox/Escape at EN1440/light and NE390/dark. `browser-visual-final.json`: two fresh 200% text dialogs, readable controls and bounds. `browser-audit.json`: two EN/NE typed actor/instant/filter checks. |
| Accessibility | **30 clean scoped WCAG A/AA scans**: 15 route scans + six critical + four Admin controls + two final zoom + two audit + one loading. Popups/labels/keyboard/focus/overflow are scoped evidence, not whole-portal certification. |
| Branding / map | `branding-evidence.json`: failed SSR image falls back to the existing emblem; a newly supplied valid URL replaces it after the existing settings-update signal. Two checks, zero writes. `contact-policy-evidence.json`: real response headers and browser frame PASS; map HTML fulfilled locally, no external map delivery. |
| Links/assets/performance | 98 distinct rendered internal hrefs: 97 resolve to source route/API/public-asset patterns; the remaining KYC fixture URL is deliberately not downloaded. Published asset404 responses remain a data/storage limitation. Development compile/warm-up times are not production benchmarks; no broad performance or external-link crawl claim. |

Browser widths in current workflow checks:390/768/1440, both EN/NE and light/dark, plus 200% text. Approved earlier six-width date/court evidence is retained; it was not replayed wholesale. Chromium only. All browser mutations were intercepted; **zero live test mutations or external test deliveries**. Existing security integrations use guarded, disposable localhost schema-only clones and synthetic records; their fixture-only schema setup/cleanup does not migrate or alter the application database. The retrieval integration executes parameterized CTE fixtures in a READ ONLY transaction.

## Verified defects and minimal corrections

| File / issue | Cause and fix | Verification |
| --- | --- | --- |
| CMS asset policy module | Missing `server-only` marker violated the architecture boundary. Added the marker; authorization logic unchanged. | Boundary tests now pass; production build. |
| Client chart series4 | Gold series was 2.45:1 against white. Reused the existing dark-gold foreground colour for that series. Locked Client accent and light border tokens remain unchanged. | Computed contrast above3:1; Client token/state/model regression tests pass. The conflicting border contract below still fails. |
| Admin Appointments | Three selector declarations (including per-record instances) lacked names; create/reschedule selectors also lacked explicit associations. Added meaningful names, localized where the existing route language is available. | Fresh route/control axe, keyboard/Escape and EN/NE mobile/desktop checks. Existing handlers and date fields unchanged. |
| Admin Users | Tabs referenced no actual tabpanel; selector names were missing. Wrapped the existing filtered table in the existing TabsContent and named the selectors. | EN/NE keyboard tab changes, real selected panel, dropdown focus restoration, four shared Admin scans. |
| Sign-in / MFA | Fast query/session resolution could change initial server/client content (branding text; spinner versus card). Matching initial hydration snapshots now adopt the existing settings/session presentation after hydration. | Exact pre-fix errors preserved; fresh cold navigations pass. Credentials, enrollment, redirect validation and commands unchanged. |
| Public footer | Reduced-opacity text fell below4.5:1 in dark mode (4.3:1 observed). Footer copy/links now use the existing full foreground. | Fresh scoped Public route axe; no new colour system. |
| Shared firm brand | A failed SSR image could complete before load/error handlers attached, leaving a broken logo. The ref checks completed failures/dummy pixels and uses the existing emblem. | Real missing local asset reproduced with `complete=true,naturalWidth=0`; fallback and valid replacement browser checks pass. No logo URL/storage rewrite. |
| Shared loading surfaces | Whole-card opacity animation reduced the Admin loading label to **2.15:1** at its real pulse minimum. Removed the whole-card pulse; loading state, cursor, aria-busy and spinner remain. | `loading-before.json` retains FAIL/opacity0.5. `loading-evidence.json` is clean/opacity1. Shared state tests pass. |
| Admin Audit | The typed API supplies `id/createdAt/actorName`; the page read legacy `_id/_creationTime`, producing missing keys and inaccurate identity/date presentation. It now uses typed fields, active locale and actor fallback by canonical user ID. Counts explicitly describe loaded entries and exact recorded action codes. | EN/NE actor/Nepal10:00 instant/resource-filter checks, two clean scans; raw audit/storage/permission/query contract unchanged. This is the existing bounded recent-event tool, not a new full-history contract. |
| Contact map / CSP | Existing Google map iframe was blocked by global default-src. Added a pinned `frame-src https://maps.google.com` exception **only on /contact**, preserving every other directive and all other routes. | Two new configuration/security tests; real Contact versus Client/Consultation response headers; synthetic map loads under actual browser CSP. No wildcard, frame-ancestor or object-policy weakening. |

No test was removed, skipped or weakened. The new policy tests cover scope and retained restrictions. No conversion/court registry/API mutation/schema/pagination architecture was rewritten.

## Cross-session and workflow coverage

| Surface group | Current / inherited evidence and honest scope |
| --- | --- |
| Navigation, account, responsive shells | All80 route patterns,98 rendered hrefs, stale/wrong-role gates; earlier account/navigation evidence for unchanged menus. Site inventory includes contextual team chat/content write/case detail and token/account pages, not only sidebar destinations. |
| Cases / hearings / court aliases | Current combined date+Butwal-bench selection and case/hearing string payloads in Staff/Admin; all110 identity/parent/alias tests pass. Earlier five declarations/eight contexts and historical unknown-value preservation remain applicable; canonical registry/control unchanged. |
| Nepal dates / appointments / Public booking | Current actual EN/NE pickers, canonical20Oct2026 counterpart, invalid recovery, keyboard,768px booking and200% case reflow; earlier26 declarations/three narrow exceptions and verified converter fixtures retained. No statutory deadline/holiday/storage reinterpretation. |
| Documents / Misl / history / profile / notifications | All41 Session17D paths match committed HEAD. Current55-record Misl integration, SQL/security boundaries and query tests pass; prior48 groups cover search/trash/retry/105-record lists/profile65/notifications/actions. No pretend lifetime totals or uncontrolled fetch-all. |
| Tasks / HR / CRM / appointments / clients | Every real route renders; current booking fields and changed Admin controls tested. Prior feature-specific task/HR/CRM/appointment/pagination evidence reused where source is unchanged; existing commands/calculations preserved. No live persistence certification. |
| Research / communications / content / checklist / signatures | All real pages render; existing unit/security/Client state suites and prior focused evidence reused. Signing's actual inbox shape was supplied after an initial harness mismatch. PDF/font/storage/delivery and every conditional action are not certified by route rendering. |
| CMS / Public publishing | All CMS routes render. Real published local Blog,News,Resources,Practice Area details pass; invalid slug guards retained. Team public dataset is empty: positive lawyer profile is BLOCKED, not fabricated. Successful publish-to-live propagation is not claimed. |
| Audit / security operations / settings | Typed Admin recent-audit display/filter fixed; own-profile continuation remains unchanged. Actual anonymous boundaries and isolated authenticated security tests pass. Role-permission edits, password/MFA live operations and all164 authenticated endpoint/action combinations are not exhaustively executed. |

276 conditional UI declarations have exact source coordinates in the machine inventory; their per-declaration execution status remains NOT TESTED unless supported by the named current/prior workflow evidence. Visible primary controls are recorded per route in `browser-routes.json`. The source-derived inventory does not promote every unopened dialog/action to PASS.

## Baseline failures and remaining release gates

| Remaining failed assertion(s) | Baseline proof / interpretation |
| --- | --- |
| R0 document visibility source assertion (1) | Searches the old list-method body rather than the shared retrieval implementation. Same failure in committed-byte proof; real Client/tenant SQL visibility tests pass. Assertion unchanged. |
| R7 Client hook/source names (2) | Same two committed-source failures; later status-aware query hooks no longer match the historical source expectations. Current Client projections/security tests pass. |
| CUI03 Staff CommandCenter source assertion (1) | Expects the superseded callback name rather than current shared search integration; exact baseline failure retained. |
| CUI09 checklist gradient regex (1) | Unbounded source regex crosses into later unrelated CSS; baseline-proven failure retained, not relabelled green. |
| CUI17 Client-only profile error source assertion (1) | Exact old source condition conflicts with shared continued profile/audit status handling. Same baseline failure; Client audit privacy and denial tests pass. |
| Client light border contrast contract (1) | The locked Client token test requires `#d7dde6`, while the blanket boundary test requires3:1 (measured1.3659:1 on white). Preserved the approved token; no assertion weakened or speculative palette redesign. Requires reconciliation/review. |
| Admin raw-palette source contract (1) | Existing approved AdminDashboard uses raw colour utilities; identical baseline failure. Current observed route scans do not turn this architecture/source-contract failure into PASS. |

**NOT READY:** eight failed assertions above; one unavailable positive Public lawyer profile; published asset404/storage reconciliation; remaining conditional/authenticated/API/action/live-environment gates. Authenticated API methods not covered by the fixture suites remain NOT TESTED, as shown below. Cross-browser, live delivery/security enrollment/persistence, native/PDF legal rendering, external services, production runtime/performance and deployment are unverified. No claim of exhaustive accessibility or every possible workflow permutation. No newly introduced high/critical failure was observed in the executed gates; this is not a security certification of unexecuted surfaces.

## Harness corrections and evidence integrity

An early theme helper set the html dark class during hydration. All53 attribute warnings had that exact root-class mismatch across38 routes; the paired hydration-ready proof records no such warning after the test-only theme change waits for a committed React root. The38 affected routes were rerun; remaining representative targets refreshed. This did not add warning suppression or alter production html. The stale issue badges in earlier captures are preserved; final zoom captures are fresh and visually inspected.

Other failed attempts are preserved/excluded: analytics/signing/token fixtures were corrected to the real contracts; iframe initialization was restricted to the top window; calendar keyboard checks wait for actual focus; locale waits for real global controls, with Public inheriting the existing preference; count assertions normalize both digit sets; visible article titles avoid hidden navigation copies; settings replacement uses the existing refresh signal. One screenshot-readiness failure generated a duplicate route record; explicit targeted retry removed the superseded duplicate, leaving exactly80 unique final entries. No forced clicks, hidden production overlays or live mutations.

## Complete page / role matrix

PASS here means observed route rendering/navigation/containment; action, authenticated security and conditional states use the separate gates above. A11y is the current route-level scan, not every dialog. Every row is linked by route key to `browser-routes.json`; parent guards/dependencies/conditional declarations are in `route-inventory.json`.

| Route | Role contract | Render | Route a11y | Source |
| --- | --- | --- | --- | --- |
| `/` | Public | PASS | PASS | `src/app/(public)/page.tsx` |
| `/about-us` | Public | PASS | NOT TESTED | `src/app/(public)/about-us/page.tsx` |
| `/admin` | Admin only | PASS | PASS | `src/app/(admin)/admin/page.tsx` |
| `/admin/analytics` | Admin only | PASS | NOT TESTED | `src/app/(admin)/admin/analytics/page.tsx` |
| `/admin/appointments` | Admin only | PASS | PASS | `src/app/(admin)/admin/appointments/page.tsx` |
| `/admin/audit` | Admin only | PASS | NOT TESTED | `src/app/(admin)/admin/audit/page.tsx` |
| `/admin/cases` | Admin only | PASS | NOT TESTED | `src/app/(admin)/admin/cases/page.tsx` |
| `/admin/cases/[id]` | Admin only | PASS | NOT TESTED | `src/app/(admin)/admin/cases/[id]/page.tsx` |
| `/admin/cases/new` | Admin only | PASS | NOT TESTED | `src/app/(admin)/admin/cases/new/page.tsx` |
| `/admin/clients` | Admin only | PASS | NOT TESTED | `src/app/(admin)/admin/clients/page.tsx` |
| `/admin/cms` | Admin only | PASS | NOT TESTED | `src/app/(admin)/admin/cms/page.tsx` |
| `/admin/cms/about` | Admin only | PASS | NOT TESTED | `src/app/(admin)/admin/cms/about/page.tsx` |
| `/admin/cms/blog` | Admin only | PASS | NOT TESTED | `src/app/(admin)/admin/cms/blog/page.tsx` |
| `/admin/cms/careers` | Admin only | PASS | NOT TESTED | `src/app/(admin)/admin/cms/careers/page.tsx` |
| `/admin/cms/governance` | Admin only | PASS | NOT TESTED | `src/app/(admin)/admin/cms/governance/page.tsx` |
| `/admin/cms/homepage` | Admin only | PASS | NOT TESTED | `src/app/(admin)/admin/cms/homepage/page.tsx` |
| `/admin/cms/navigation` | Admin only | PASS | NOT TESTED | `src/app/(admin)/admin/cms/navigation/page.tsx` |
| `/admin/cms/news` | Admin only | PASS | NOT TESTED | `src/app/(admin)/admin/cms/news/page.tsx` |
| `/admin/cms/practice-areas` | Admin only | PASS | NOT TESTED | `src/app/(admin)/admin/cms/practice-areas/page.tsx` |
| `/admin/cms/resources` | Admin only | PASS | NOT TESTED | `src/app/(admin)/admin/cms/resources/page.tsx` |
| `/admin/cms/team` | Admin only | PASS | NOT TESTED | `src/app/(admin)/admin/cms/team/page.tsx` |
| `/admin/cms/testimonials` | Admin only | PASS | NOT TESTED | `src/app/(admin)/admin/cms/testimonials/page.tsx` |
| `/admin/crm` | Admin only | PASS | NOT TESTED | `src/app/(admin)/admin/crm/page.tsx` |
| `/admin/document-generator` | Admin only | PASS | NOT TESTED | `src/app/(admin)/admin/document-generator/page.tsx` |
| `/admin/hr` | Admin only | PASS | NOT TESTED | `src/app/(admin)/admin/hr/page.tsx` |
| `/admin/profile` | Admin only | PASS | NOT TESTED | `src/app/(admin)/admin/profile/page.tsx` |
| `/admin/settings` | Admin only | PASS | NOT TESTED | `src/app/(admin)/admin/settings/page.tsx` |
| `/admin/templates` | Admin only | PASS | NOT TESTED | `src/app/(admin)/admin/templates/page.tsx` |
| `/admin/users` | Admin only | PASS | PASS | `src/app/(admin)/admin/users/page.tsx` |
| `/auth/callback` | Account / token contract | PASS | NOT TESTED | `src/app/auth/callback/page.tsx` |
| `/blog` | Public | PASS | NOT TESTED | `src/app/(public)/blog/page.tsx` |
| `/blog/[slug]` | Public | PASS | NOT TESTED | `src/app/(public)/blog/[slug]/page.tsx` |
| `/careers` | Public | PASS | NOT TESTED | `src/app/(public)/careers/page.tsx` |
| `/client` | Client only | PASS | PASS | `src/app/(client)/client/page.tsx` |
| `/client/booking` | Client only | PASS | PASS | `src/app/(client)/client/booking/page.tsx` |
| `/client/cases` | Client only | PASS | NOT TESTED | `src/app/(client)/client/cases/page.tsx` |
| `/client/cases/[id]` | Client only | PASS | NOT TESTED | `src/app/(client)/client/cases/[id]/page.tsx` |
| `/client/checklist` | Client only | PASS | NOT TESTED | `src/app/(client)/client/checklist/page.tsx` |
| `/client/documents` | Client only | PASS | PASS | `src/app/(client)/client/documents/page.tsx` |
| `/client/hearings` | Client only | PASS | NOT TESTED | `src/app/(client)/client/hearings/page.tsx` |
| `/client/kyc` | Client only | PASS | NOT TESTED | `src/app/(client)/client/kyc/page.tsx` |
| `/client/messages` | Client only | PASS | NOT TESTED | `src/app/(client)/client/messages/page.tsx` |
| `/client/notifications` | Client only | PASS | PASS | `src/app/(client)/client/notifications/page.tsx` |
| `/client/profile` | Client only | PASS | NOT TESTED | `src/app/(client)/client/profile/page.tsx` |
| `/client/signatures` | Client only | PASS | NOT TESTED | `src/app/(client)/client/signatures/page.tsx` |
| `/consultation` | Public | PASS | PASS | `src/app/(public)/consultation/page.tsx` |
| `/contact` | Public | PASS | NOT TESTED | `src/app/(public)/contact/page.tsx` |
| `/intake/[token]` | Account / token contract | PASS | NOT TESTED | `src/app/intake/[token]/page.tsx` |
| `/lawyers` | Public | PASS | NOT TESTED | `src/app/(public)/lawyers/page.tsx` |
| `/lawyers/[id]` | Public | BLOCKED | NOT TESTED | `src/app/(public)/lawyers/[id]/page.tsx` |
| `/mfa-enroll` | Account / token contract | PASS | NOT TESTED | `src/app/mfa-enroll/page.tsx` |
| `/news` | Public | PASS | NOT TESTED | `src/app/(public)/news/page.tsx` |
| `/news/[slug]` | Public | PASS | NOT TESTED | `src/app/(public)/news/[slug]/page.tsx` |
| `/practice-areas` | Public | PASS | NOT TESTED | `src/app/(public)/practice-areas/page.tsx` |
| `/practice-areas/[slug]` | Public | PASS | NOT TESTED | `src/app/(public)/practice-areas/[slug]/page.tsx` |
| `/privacy-policy` | Public | PASS | NOT TESTED | `src/app/(public)/privacy-policy/page.tsx` |
| `/reset-password` | Account / token contract | PASS | NOT TESTED | `src/app/reset-password/page.tsx` |
| `/resources` | Public | PASS | NOT TESTED | `src/app/(public)/resources/page.tsx` |
| `/resources/[slug]` | Public | PASS | NOT TESTED | `src/app/(public)/resources/[slug]/page.tsx` |
| `/setup-account` | Account / token contract | PASS | NOT TESTED | `src/app/setup-account/page.tsx` |
| `/share/[token]` | Account / token contract | PASS | NOT TESTED | `src/app/share/[token]/page.tsx` |
| `/sign-in` | Account / token contract | PASS | PASS | `src/app/sign-in/page.tsx` |
| `/sign-in/[portal]` | Account / token contract | PASS | NOT TESTED | `src/app/sign-in/[portal]/page.tsx` |
| `/staff` | Staff (five approved roles) | PASS | PASS | `src/app/(staff)/staff/page.tsx` |
| `/staff/appointments` | Staff (five approved roles) | PASS | NOT TESTED | `src/app/(staff)/staff/appointments/page.tsx` |
| `/staff/cases` | Staff (five approved roles) | PASS | PASS | `src/app/(staff)/staff/cases/page.tsx` |
| `/staff/cases/[id]` | Staff (five approved roles) | PASS | NOT TESTED | `src/app/(staff)/staff/cases/[id]/page.tsx` |
| `/staff/clients` | Staff (five approved roles) | PASS | NOT TESTED | `src/app/(staff)/staff/clients/page.tsx` |
| `/staff/content` | Staff (five approved roles) | PASS | NOT TESTED | `src/app/(staff)/staff/content/page.tsx` |
| `/staff/content/write` | Staff (five approved roles) | PASS | NOT TESTED | `src/app/(staff)/staff/content/write/page.tsx` |
| `/staff/crm` | Staff (five approved roles) | PASS | NOT TESTED | `src/app/(staff)/staff/crm/page.tsx` |
| `/staff/documents` | Staff (five approved roles) | PASS | PASS | `src/app/(staff)/staff/documents/page.tsx` |
| `/staff/hearings` | Staff (five approved roles) | PASS | NOT TESTED | `src/app/(staff)/staff/hearings/page.tsx` |
| `/staff/hr` | Staff (five approved roles) | PASS | NOT TESTED | `src/app/(staff)/staff/hr/page.tsx` |
| `/staff/messages` | Staff (five approved roles) | PASS | NOT TESTED | `src/app/(staff)/staff/messages/page.tsx` |
| `/staff/profile` | Staff (five approved roles) | PASS | PASS | `src/app/(staff)/staff/profile/page.tsx` |
| `/staff/research` | Staff (five approved roles) | PASS | NOT TESTED | `src/app/(staff)/staff/research/page.tsx` |
| `/staff/tasks` | Staff (five approved roles) | PASS | PASS | `src/app/(staff)/staff/tasks/page.tsx` |
| `/staff/team-chat` | Staff (five approved roles) | PASS | NOT TESTED | `src/app/(staff)/staff/team-chat/page.tsx` |
| `/terms` | Public | PASS | NOT TESTED | `src/app/(public)/terms/page.tsx` |

Staff roles are partner,senior_associate,associate,paralegal,intern, exactly as `STAFF_ROLES` specifies. Admin and Client shells use their respective role guards; server/API permissions remain authoritative. Account/token pages enforce their own session/token contracts; missing-token checks are not successful enrollment/reset/intake/share claims.

## Complete API inventory

PASS below means only the observed anonymous GET boundary;93 NOT TESTED rows do not inherit a blanket security PASS from source review. Auth handler catch-all methods are extracted from its actual destructured exports. Direct guards and reachable capability names are recorded in JSON without guessing a per-method role grant. Fixture authenticated/action/security evidence is separate.

| API pattern | Exported methods | Anonymous HTTP gate |
| --- | --- | --- |
| `/api/auth/[...all]` | GET, POST, PATCH, PUT, DELETE | NOT TESTED |
| `/api/v1/analytics/dashboard` | GET | PASS (401) |
| `/api/v1/appointments` | GET, POST | PASS (401) |
| `/api/v1/appointments/[id]/assign` | POST | NOT TESTED |
| `/api/v1/appointments/[id]/reschedule` | POST | NOT TESTED |
| `/api/v1/appointments/[id]/status` | PATCH | NOT TESTED |
| `/api/v1/appointments/book` | POST | NOT TESTED |
| `/api/v1/appointments/slots` | GET | NOT TESTED |
| `/api/v1/audit-events` | GET | PASS (401) |
| `/api/v1/auth/session` | GET, POST, DELETE | PASS (401) |
| `/api/v1/cases` | GET, POST | PASS (401) |
| `/api/v1/cases/[id]` | GET, PATCH | PASS (401) |
| `/api/v1/cases/[id]/parties` | GET, POST | PASS (401) |
| `/api/v1/cases/[id]/parties/[partyId]` | PATCH, DELETE | NOT TESTED |
| `/api/v1/clients` | GET, POST | PASS (401) |
| `/api/v1/clients/[id]` | GET, PATCH | PASS (401) |
| `/api/v1/clients/[id]/kyc-files` | GET | PASS (401) |
| `/api/v1/clients/[id]/kyc-review` | POST | NOT TESTED |
| `/api/v1/clients/[id]/portal-access` | POST | NOT TESTED |
| `/api/v1/clients/me` | GET, PATCH | PASS (401) |
| `/api/v1/clients/me/kyc-submissions` | POST | NOT TESTED |
| `/api/v1/clients/me/kyc-upload-intents` | POST | NOT TESTED |
| `/api/v1/clients/me/kyc-upload-intents/[intentId]` | GET | PASS (401) |
| `/api/v1/clients/me/kyc-upload-intents/[intentId]/complete` | POST | NOT TESTED |
| `/api/v1/clients/me/team` | GET | PASS (401) |
| `/api/v1/cms/[collection]` | GET, POST | PASS (401) |
| `/api/v1/cms/[collection]/[id]` | PATCH, DELETE | NOT TESTED |
| `/api/v1/cms/applications` | GET | PASS (401) |
| `/api/v1/cms/applications/[id]` | PATCH | NOT TESTED |
| `/api/v1/cms/asset-upload-intents` | POST | NOT TESTED |
| `/api/v1/cms/asset-upload-intents/[intentId]` | GET | PASS (401) |
| `/api/v1/cms/asset-upload-intents/[intentId]/complete` | POST | NOT TESTED |
| `/api/v1/cms/blog-posts/[id]/review` | POST | NOT TESTED |
| `/api/v1/cms/legal-pages/[slug]` | GET, PUT | PASS (401) |
| `/api/v1/cms/navigation/reorder` | POST | NOT TESTED |
| `/api/v1/cms/news/[id]/review` | POST | NOT TESTED |
| `/api/v1/cms/newsletter` | GET | PASS (401) |
| `/api/v1/cms/newsletter/[id]` | PATCH | NOT TESTED |
| `/api/v1/cms/settings` | GET, PUT | PASS (401) |
| `/api/v1/cms/team` | GET | PASS (401) |
| `/api/v1/cms/team/[id]` | PATCH | NOT TESTED |
| `/api/v1/communications/email` | POST | NOT TESTED |
| `/api/v1/dm/threads` | GET, POST | PASS (401) |
| `/api/v1/dm/threads/[threadId]/messages` | GET, POST | PASS (401) |
| `/api/v1/dm/threads/[threadId]/read` | POST | NOT TESTED |
| `/api/v1/document-tags` | GET, POST | PASS (401) |
| `/api/v1/document-tags/[id]` | DELETE | NOT TESTED |
| `/api/v1/document-templates` | GET, POST | PASS (401) |
| `/api/v1/document-templates/[id]` | PUT, DELETE | NOT TESTED |
| `/api/v1/document-templates/seed` | POST | NOT TESTED |
| `/api/v1/document-upload-intents` | POST | NOT TESTED |
| `/api/v1/document-upload-intents/[intentId]` | GET | PASS (401) |
| `/api/v1/document-upload-intents/[intentId]/complete` | POST | NOT TESTED |
| `/api/v1/documents` | GET | PASS (401) |
| `/api/v1/documents/[id]` | GET, PATCH, DELETE | PASS (401) |
| `/api/v1/documents/[id]/download` | GET | PASS (401) |
| `/api/v1/documents/[id]/extract-text` | POST | NOT TESTED |
| `/api/v1/documents/[id]/restore` | POST | NOT TESTED |
| `/api/v1/documents/[id]/share` | GET, POST, DELETE | PASS (401) |
| `/api/v1/documents/[id]/trash` | POST | NOT TESTED |
| `/api/v1/documents/[id]/versions` | GET | PASS (401) |
| `/api/v1/documents/[id]/versions/[versionId]/restore` | POST | NOT TESTED |
| `/api/v1/documents/download-zip` | POST | NOT TESTED |
| `/api/v1/documents/recent` | GET | PASS (401) |
| `/api/v1/documents/search` | GET | PASS (401) |
| `/api/v1/envelopes` | GET, POST | PASS (401) |
| `/api/v1/envelopes/[id]/decline` | POST | NOT TESTED |
| `/api/v1/envelopes/[id]/expire` | POST | NOT TESTED |
| `/api/v1/envelopes/[id]/remind` | POST | NOT TESTED |
| `/api/v1/envelopes/[id]/send` | POST | NOT TESTED |
| `/api/v1/envelopes/[id]/void` | POST | NOT TESTED |
| `/api/v1/envelopes/mark-viewed` | POST | NOT TESTED |
| `/api/v1/envelopes/otp/issue` | POST | NOT TESTED |
| `/api/v1/envelopes/otp/verify` | POST | NOT TESTED |
| `/api/v1/envelopes/pending` | GET | PASS (401) |
| `/api/v1/envelopes/request-signature` | POST | NOT TESTED |
| `/api/v1/envelopes/sign` | POST | NOT TESTED |
| `/api/v1/envelopes/signature-artifact-intents` | POST | NOT TESTED |
| `/api/v1/envelopes/signature-artifact-intents/[intentId]` | GET | PASS (401) |
| `/api/v1/envelopes/signature-artifact-intents/[intentId]/complete` | POST | NOT TESTED |
| `/api/v1/envelopes/signers` | GET | PASS (401) |
| `/api/v1/envelopes/signing-inbox` | GET | PASS (401) |
| `/api/v1/firm` | GET | PASS (401) |
| `/api/v1/health` | GET | NOT TESTED |
| `/api/v1/hearings` | GET, POST | PASS (401) |
| `/api/v1/hearings/[id]` | GET, PATCH | PASS (401) |
| `/api/v1/hr/attendance` | GET, POST | PASS (401) |
| `/api/v1/hr/base-salary` | POST | NOT TESTED |
| `/api/v1/hr/leave-balances` | GET, POST | PASS (401) |
| `/api/v1/hr/leave-requests` | GET, POST | PASS (401) |
| `/api/v1/hr/leave-requests/review` | POST | NOT TESTED |
| `/api/v1/hr/payroll` | GET | PASS (401) |
| `/api/v1/hr/payroll/payslips` | GET | PASS (401) |
| `/api/v1/hr/payroll/runs` | GET, POST | PASS (401) |
| `/api/v1/hr/payroll/runs/[id]` | GET | PASS (401) |
| `/api/v1/hr/payroll/runs/[id]/finalize` | POST | NOT TESTED |
| `/api/v1/jobs` | GET | PASS (401) |
| `/api/v1/jobs/[jobId]` | GET | PASS (401) |
| `/api/v1/jobs/[jobId]/retry` | POST | NOT TESTED |
| `/api/v1/leads` | GET, POST | PASS (401) |
| `/api/v1/leads/[id]` | PATCH | NOT TESTED |
| `/api/v1/leads/[id]/convert` | POST | NOT TESTED |
| `/api/v1/leads/[id]/intake-link` | POST | NOT TESTED |
| `/api/v1/messages` | GET, POST | PASS (401) |
| `/api/v1/messages/read` | POST | NOT TESTED |
| `/api/v1/messages/unread` | GET | PASS (401) |
| `/api/v1/notifications` | GET, PATCH | PASS (401) |
| `/api/v1/notifications/[id]` | PATCH | NOT TESTED |
| `/api/v1/public/appointments` | POST | NOT TESTED |
| `/api/v1/public/cms/[collection]` | GET | NOT TESTED |
| `/api/v1/public/cms/assets/[assetId]` | GET | NOT TESTED |
| `/api/v1/public/cms/blog-posts/[slug]` | GET | NOT TESTED |
| `/api/v1/public/cms/careers/[id]/applications` | POST | NOT TESTED |
| `/api/v1/public/cms/legal-pages/[slug]` | GET | NOT TESTED |
| `/api/v1/public/cms/news/[id]` | GET | NOT TESTED |
| `/api/v1/public/cms/news/by-slug/[slug]` | GET | NOT TESTED |
| `/api/v1/public/cms/newsletter` | POST | NOT TESTED |
| `/api/v1/public/cms/practice-areas/[slug]` | GET | NOT TESTED |
| `/api/v1/public/cms/resources/[slug]` | GET | NOT TESTED |
| `/api/v1/public/cms/resources/download/[id]` | POST | NOT TESTED |
| `/api/v1/public/cms/settings` | GET | NOT TESTED |
| `/api/v1/public/cms/team` | GET | NOT TESTED |
| `/api/v1/public/cms/team/[id]` | GET | NOT TESTED |
| `/api/v1/public/document-shares/[token]` | POST | NOT TESTED |
| `/api/v1/public/document-shares/[token]/download` | POST | NOT TESTED |
| `/api/v1/public/leads` | POST | NOT TESTED |
| `/api/v1/public/leads/intake/[token]` | GET, POST | NOT TESTED |
| `/api/v1/readiness` | GET | NOT TESTED |
| `/api/v1/research` | GET, POST | PASS (401) |
| `/api/v1/research/[id]` | GET, PATCH, DELETE | PASS (401) |
| `/api/v1/settings` | GET, PATCH | PASS (401) |
| `/api/v1/settings/role-permissions` | GET, PUT | PASS (401) |
| `/api/v1/sop-templates` | GET, POST | PASS (401) |
| `/api/v1/sop-templates/hearing-prep` | POST | NOT TESTED |
| `/api/v1/sop-templates/run` | POST | NOT TESTED |
| `/api/v1/staff/content/blog-posts` | GET, POST | PASS (401) |
| `/api/v1/staff/content/blog-posts/[id]` | PATCH | NOT TESTED |
| `/api/v1/staff/content/blog-posts/[id]/submit` | POST | NOT TESTED |
| `/api/v1/staff/content/news` | GET, POST | PASS (401) |
| `/api/v1/staff/content/news/[id]` | PATCH | NOT TESTED |
| `/api/v1/staff/content/news/[id]/submit` | POST | NOT TESTED |
| `/api/v1/storage/objects/[...key]` | GET | NOT TESTED |
| `/api/v1/storage/uploads/[grantId]` | POST | NOT TESTED |
| `/api/v1/tasks` | GET, POST | PASS (401) |
| `/api/v1/tasks/[id]` | GET, PATCH, DELETE | PASS (401) |
| `/api/v1/tasks/[id]/archive` | POST | NOT TESTED |
| `/api/v1/tasks/[id]/comments` | GET, POST | PASS (401) |
| `/api/v1/tasks/[id]/restore` | POST | NOT TESTED |
| `/api/v1/tasks/overdue-reminders` | POST | NOT TESTED |
| `/api/v1/tasks/workload` | GET | PASS (401) |
| `/api/v1/users` | GET, POST | PASS (401) |
| `/api/v1/users/[userId]` | GET, PATCH, DELETE | PASS (401) |
| `/api/v1/users/[userId]/avatar` | GET | PASS (404) |
| `/api/v1/users/[userId]/mfa` | DELETE | NOT TESTED |
| `/api/v1/users/[userId]/password-reset` | POST | NOT TESTED |
| `/api/v1/users/[userId]/sessions` | GET, DELETE | PASS (401) |
| `/api/v1/users/directory` | GET | PASS (401) |
| `/api/v1/users/me` | GET, PATCH | PASS (401) |
| `/api/v1/users/me/audit-events` | GET | PASS (401) |
| `/api/v1/users/me/avatar` | DELETE | NOT TESTED |
| `/api/v1/users/me/avatar-upload-intents` | POST | NOT TESTED |
| `/api/v1/users/me/avatar-upload-intents/[intentId]/complete` | POST | NOT TESTED |
| `/api/v1/users/me/sessions/[sessionId]` | DELETE | NOT TESTED |
| `/api/v1/version` | GET | NOT TESTED |

## Exact changed paths and Git state

**14 Session18 paths:11 modified,three new.** No prior report or protected file is edited. Numbered review manifest:

1. `doc/ui-reference/staff-admin/SESSION-18-INTEGRATION-REGRESSION-REPORT.md`
2. `scripts/qa/verify-application-integration.mjs`
3. `next.config.ts`
4. `src/app/(public)/public-layout-shell.tsx`
5. `src/components/branding/firm-brand.tsx`
6. `src/components/dashboard/dashboard-primitives.tsx`
7. `src/index.css`
8. `src/server/policies/cms-asset-access.ts`
9. `src/views/admin/AdminAppointmentsPage.tsx`
10. `src/views/admin/AdminAuditPage.tsx`
11. `src/views/admin/AdminUsersPage.tsx`
12. `src/views/auth/MfaEnrollmentPage.tsx`
13. `src/views/auth/SignInPage.tsx`
14. `tests/unit/contact-frame-policy.test.ts`

All41 Session17D paths, canonical date/court controls/data, API contracts, existing pagination engine, schema, dependencies and authentication/authorization runtime match HEAD. Session17E caller changes are limited to verified Admin names/tabs/audit presentation and one chart colour; no date callbacks or named payloads changed. Final porcelain status and SHA-256 hashes are in `final-safety.json`. Index empty; local/origin HEAD remains `a228e1658df473044b37a92cf60b4eb6cb67661a`. Protected Session08 hash remains `1ACEB9535586A43197F561057EEC9DB9409CAB5F12994629C43F86F5FE7BC78E`.

**Stop for owner/TL review. No staging, commit, push, merge, deployment or next session.**
