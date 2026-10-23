# Session 17D — Complete deferred collection retrieval

2026-10-22, Asia/Kathmandu. **All five blockers VERIFIED; implementation/QA PASS for owner/TL review.** No staging, commit, push, merge, deployment, migration, dependency addition or live test mutation. Sessions 17E/17F remain preserved.

## Safety

Worktree `D:\lexnepal\.local\worktrees\ui-staff-admin-upgrade`; branch `ui/staff-admin-upgrade`. Local and freshly queried origin HEAD: `a681b4d498ddf585dbac6765155dac0fdbd23b24`; origin `https://github.com/raghav556/lexnepal.git`. Index empty. AGENTS.md, installed Next.js guidance, authoritative Client specifications and earlier retrieval findings were read. Existing localhost:3001/full-stack infrastructure was reused; no server restart or original-checkout edit.

Protected Session08 is the sole unrelated modification, untouched and unstaged: `doc/ui-reference/staff-admin/SESSION-08-ENGINEERING-REPORT.md`. SHA-256: `1ACEB9535586A43197F561057EEC9DB9409CAB5F12994629C43F86F5FE7BC78E`.

## Five blockers and exact contracts

| Blocker | Verified root cause | Correction / result |
| --- | --- | --- |
| Documents | Bounded list/search arrays were treated as complete collections; Client visibility/tag filtering after a result boundary could omit eligible rows. | One shared opt-in document continuation contract; permission/search filters precede the SQL limit. Library, trash, folders and Client collections expose explicit continuation and loaded counts. VERIFIED. |
| Case Misl | Existing case-scoped document list stopped at its first retrieval window. | Staff/Admin Misl consumes the same continued document query; case association, existing local sorting/pagination and commands remain. VERIFIED. |
| Document-derived case history | History was derived from that incomplete document window. | The history tab shares the exact Misl query/cache and identifies partial/error states until continuation completes. Source IDs, deduplication and chronological presentation remain. VERIFIED. |
| Profile audit history | Own-audit GET returned a capped array, normally 30 records. | Separate self/firm-scoped audit continuation; shared profile exposes Load more for all three portal roles. Client redaction applies to every page. VERIFIED. |
| Notifications | Notification GET returned 50 records; feeds, previews and menus inherited the cap. | Separate self/firm-scoped notification continuation in every full feed/update/activity/menu consumer; unread counts explicitly describe loaded records. Existing read actions and safe links retained. VERIFIED. |

Existing GET routes `/api/v1/documents`, `/api/v1/documents/search`, `/api/v1/users/me/audit-events` and `/api/v1/notifications` accept **`page=true`**, optional **`limit=1..100`**, and an opaque **`cursor`**. Opt-in response: `{ data: { items: [...], nextCursor: string | null, total: null } }`. Document/search/notification pages default to 50; own-audit pages default to 30. No exact lifetime total is claimed. Without opt-in, existing array responses and legacy default caps remain compatible, including the Client document-list default of 200 and search default of 100.

Each page orders by immutable `createdAt DESC, id DESC`, applies the strict tuple-before predicate and requests only `limit + 1` rows. The extra row proves continuation; an exhausted page returns `nextCursor: null`. Equal timestamps use unique IDs. Inserts ahead of the boundary appear on refresh; deletion does not shift offsets or duplicate surviving older records. This is continuation over current authorized data, not a transactional snapshot of changing records. Existing current-version/trash semantics are retained; history remains the established document-derived projection, not a newly invented forensic/version audit.

One shared query helper uses TanStack infinite queries, explicit user-triggered continuation, ID deduplication, cursor-progress validation and honest loading/error/retry states. There is no automatic fetch-all loop, new count query or per-row permission query. Account/firm/role scopes isolate both cached pages and concurrent GET deduplication; scope metadata never enters the HTTP payload. Authorization failures withhold cached rows/counts. Filter changes use distinct query keys.

Document access remains capability/firm/case scoped. Client case ownership, uploaded/signing visibility, confidentiality and search rules remain enforced before page boundaries; explicit case filtering intersects Client visibility. Own-audit and notifications always constrain both firm and authenticated user. Existing Client audit projection and role-safe notification links remain. No API mutation contract, permission policy, database schema or stored value was rewritten.

## All actual consumers

| Consumer | Integration / preservation |
| --- | --- |
| Staff Documents | Continued list/search, list/folders/trash, tags/type/case filters, current-version rules, loaded counts and existing actions. General-folder comparison now recognizes documents with absent case IDs. Search controls stay mounted during query loading, preserving draft/filter state. |
| Staff/Admin CaseDetail | One continued case-document query shared by Misl/history; partial/error history notices; existing source ordering, associations and local page controls. |
| Client Documents | Authorized continued collection; existing read/sign/download/search/filter presentation. |
| Client CaseDetail | Continued documents and notification-derived updates; existing case filtering/read-only behavior. |
| Client Cases | Continued notification-derived recent activity; existing case filters and navigation. |
| Shared Profile: Staff/Admin/Client | Continued own audit history, existing chronological renderer and Client privacy projection. |
| Shared NotificationBell: all portals | Continued menu; loaded-unread wording, existing mark-all-read command and keyboard/menu semantics. Client notification feed uses the same query. |
| Client Notifications | Continued feed, existing date/category/read filtering, older-page read action and navigation. |
| Admin DocumentGenerator | Continued uploaded file templates; existing creation/upload command. |
| Staff Tasks | Continued linked-document choices; existing authoritative linked ID retained even when outside loaded results; same Task PATCH. |
| Existing Staff/Admin/Client dashboard previews | Intentional bounded previews retain existing full-collection destinations; underlying applicable queries reuse the shared contract. Recent-document preview remains intentionally bounded and now account-scoped. |

No actual consumer remains on the bare `useDocuments`/`useDocumentSearch` array wrappers. They remain compatibility facades. Privileged Admin `/api/v1/audit-events` is a different contract from own-profile history and is unchanged. Public has no authenticated document/audit/notification collection to add. No duplicate pagination engine, new scroll owner or navigation redesign.

## Focused verification

Evidence is ignored under `.local/qa/session-17d/`; `evidence-summary.json` reconciles overlapping runs once. **15 distinct test files: 375 passed, zero failed/skipped. 48 browser groups, 46 clean scoped accessibility scans, zero browser exceptions. Seven intercepted requests, zero live test mutations.** These totals do not include historical Session17E/17F evidence.

| Gate | Evidence / result |
| --- | --- |
| Real repository/service/routes | `retrieval-continuation.test.ts`: 28 passing tests. Actual Drizzle-generated SQL runs against parameterized CTE fixtures inside a local MySQL READ ONLY transaction, rolled back; no application table reads, writes or DDL. Zero/one/limit/limit+1/multiple pages, equal-time ordering, inserts/deletes, filters/tags/trash/current versions, Client boundaries, foreign firm/user denial, redaction, legacy arrays, invalid parameters and unauthenticated routes. |
| Shared query / command contracts | New collection tests: 19 plus one in-flight isolation test; malformed metadata, empty identity, cursor cycles, deduplication, retry, access denial, role/firm/account changes, existing document update/trash/restore/delete invalidations and policy payloads. Existing query/security/Client/date/court/pagination tests contribute the reconciled total. |
| Browser core | 32 retained passing groups / 30 clean scans from `browser-before-menu-semantics.json`; old menu groups/scans/writes explicitly excluded. Staff Documents, Staff/Admin Misl/history, all three profiles, Client Documents/feed/matter documents/updates/activity, Admin templates, search and failure recovery. Documents/notifications reach 105; audit reaches 65. |
| Final notification menus | `browser-menu-evidence.json`: four groups, eight clean scans, four intercepted mark-all-read requests. Staff/Admin, EN1440/light and NE360/dark. |
| Edge consumers / shared retrieval | `browser-extra-evidence.json`: nine groups, six clean scans, two intercepted Task PATCHs. Older-document selection, 360px control containment, all three collections empty/single, and Misl-to-history reuse without another request. |
| Older-page notification action | `browser-action-evidence.json`: one group, one clean scan, one intercepted Client read PATCH; keyboard continuation, older record retained, read state refreshed. |
| General folders / trash search | `browser-filter-evidence.json`: two groups, one clean scan, no writes. All 55 General documents accessible; trash search sends `inTrash=true` on both pages and retains its actual input. |
| TypeScript / ESLint | Exit 0: `tsc-final.log`, `eslint-final.log`, `eslint-bell-final.log`, `eslint-general-final.log`; latest touched production/test/harness files checked again after the final focused fixes. |
| Git / whitespace / scope | `final-safety.json` and `whitespace.log`: exact 41-path scope, empty index, protected hash, new-file EOF/trailing whitespace, `git diff --check`, branch/HEAD/origin guards. |

Final unit sources: `focused-tests.json`, `fixture-final.json`, `unit-final.json`, `integration-general-final.json`, `staff-general-final.json`; the reconciler selects the latest result for each file. No overlapping test counts are summed. No existing assertion was removed, skipped or weakened. Existing test fixtures were extended for the real locale/collection provider dependency, supported calendar dates, and account-scoped cache keys; direct helper tests independently verify the new behavior.

Browser coverage uses actual routes/populated components at 1440/light and 390/dark in EN/NE, plus affected narrow task/menu controls at 360/dark. Assertions cover cursor requests, final record visibility, loaded counts, keyboard/focus, retained state, body/page containment and scoped axe. Existing Client body scrolling is measured against its initial state rather than imposing the Staff shell contract. Representative Nepali mobile library and notification screenshots were visually inspected. Genuine screenshots are `retrieval-*.png`; no fabricated screenshots, forced clicks or suppressed warnings.

QA found and corrected actual defects: Next's bundled browser Buffer rejects the `base64url` encoding name (shared cursor now uses equivalent base64 substitutions, preserving cursor bytes); a status region inside the notification menu violated required menu children (live announcement moved outside, continuation uses menu semantics); General-folder filtering excluded absent case IDs; query loading unmounted the search input. Failed attempts and pre-fix evidence remain preserved and excluded. Harness-only corrections are also retained: existing Client scroll ownership, reset notification read fixtures, actual request-body capture and accessible notification-text matching.

## Preservation and limits

The canonical Nepal date converter/facade/field, shared Dialog, DueDateFields, court registry/types/select/constants, Pagination/usePagination, all existing CSS, DB schema and authorization/security/auth files match committed HEAD exactly. Existing document-service mutation methods and document/notification/profile command-hook tails also match HEAD. The preservation list is recorded in `evidence-summary.json`; focused court/date/pagination tests pass.

This closes the five retrieval blockers within their existing authorized record projections. It does not certify live persistence, background delivery, storage/PDF rendering, all browser engines or whole-portal accessibility. No full-suite/build pass is claimed. Earlier unrelated historical Client/source-contract/color/public-logo failures remain documented in prior reports; they were not silently fixed or declared passing. The prior 455-date-surface and 250-court browser audits were not replayed. No Session18 work.

## Exact scope and final Git state

**41 Session17D paths: 32 modified, nine new.** Protected Session08 is excluded. Complete approved implementation manifest:

1. `doc/ui-reference/staff-admin/SESSION-17D-RETRIEVAL-REPORT.md`
2. `scripts/qa/verify-retrieval-continuation.mjs`
3. `src/app/api/v1/documents/route.ts`
4. `src/app/api/v1/documents/search/route.ts`
5. `src/app/api/v1/notifications/route.ts`
6. `src/app/api/v1/users/me/audit-events/route.ts`
7. `src/client/api/client.ts`
8. `src/client/queries/collection.ts`
9. `src/client/queries/communication.ts`
10. `src/client/queries/documents.ts`
11. `src/client/queries/identity.ts`
12. `src/components/ui/collection-continuation.tsx`
13. `src/components/ui/notification-bell.tsx`
14. `src/server/repositories/collection-continuation.ts`
15. `src/server/repositories/communication-repository.ts`
16. `src/server/repositories/document-repository.ts`
17. `src/server/repositories/identity-repository.ts`
18. `src/server/services/communication-service.ts`
19. `src/server/services/document-service.ts`
20. `src/server/services/identity-service.ts`
21. `src/shared/collection-page.ts`
22. `src/shared/contracts/documents.ts`
23. `src/shared/contracts/domains.ts`
24. `src/shared/message-cursor.ts`
25. `src/views/admin/AdminDocumentGenerator.tsx`
26. `src/views/client/ClientCaseDetailPage.tsx`
27. `src/views/client/ClientCasesPage.tsx`
28. `src/views/client/ClientDocumentsPage.tsx`
29. `src/views/client/ClientNotificationsPage.tsx`
30. `src/views/shared/SharedProfilePage.tsx`
31. `src/views/staff/StaffCaseDetailPage.tsx`
32. `src/views/staff/StaffDocumentsPage.tsx`
33. `src/views/staff/StaffTasksPage.tsx`
34. `tests/integration/retrieval-continuation.test.ts`
35. `tests/unit/collection-query.test.ts`
36. `tests/unit/collection-request-isolation.test.ts`
37. `tests/unit/cui-17-b1-query-status.test.ts`
38. `tests/unit/cui-17-b1-rendered-states.test.ts`
39. `tests/unit/cui-17-cached-profile-kyc.test.ts`
40. `tests/unit/cui-20-query-workflows.test.ts`
41. `tests/unit/staff-pagination.test.ts`

Final status: the 32 existing paths above are modified; the nine new paths are this report, the QA script, collection query/control/server-boundary/shared-contract helpers and three new test files. Session08 is the sole additional modified path. No other tracked/untracked nonignored paths; index empty; local/origin HEAD unchanged at `a681b4d498ddf585dbac6765155dac0fdbd23b24`. Full porcelain status and file hashes are saved in `final-safety.json`.

**Stop for owner/TL review. No staging, commit, push, merge, deployment or Session18.**
