# Session 17C — Staff pagination audit and standardization

2026-10-21, Asia/Kathmandu. **12/12 primary routes audited.** Independently safe frontend corrections implemented for owner/TL review. Five collection groups remain blocked by retrieval contracts; complete retrieval is not claimed. Nothing staged or committed.

## Safety and source verification

Worktree `D:\lexnepal\.local\worktrees\ui-staff-admin-upgrade`, branch `ui/staff-admin-upgrade`, local and freshly queried origin baseline `57df34fbf224ac5b534bbf7d0e119e13b608dfa0`. Origin `https://github.com/raghav556/lexnepal.git`; Git identity verified. Read AGENTS.md and installed Next.js client-component guidance. Protected Session 08 retains SHA-256 `1ACEB9535586A43197F561057EEC9DB9409CAB5F12994629C43F86F5FE7BC78E`, untouched and unstaged.

Reused localhost:3001. No other server, production build, dependency, DB/schema, API, authorization, original-checkout, staging, commit, push, merge or deployment operation. All browser writes were intercepted.

## Complete collection inventory

**64 collection/view groups: KEEP 11 / FIX 4 / ADD 21 / NONE 23 / BLOCKED 5.** Counts refer to rows below, not individual records or KPI cards. Related detail/profile routes and shared overlays supplement the twelve primary routes. The dominant decision is listed once: the blocked Documents row also received safe selection/count corrections.

Sources below use API base `/api/v1/`; `+`/`;` mean combined endpoint families, not literal combined URLs. Parameters such as `:id` are placeholders. Ordering, permissions and API filtering remain authoritative. No primary route lacks an audit: Dashboard intentionally contains bounded previews rather than an unbounded full collection.

| # | Route | View/tab | Source (API/data) | Existing method | Filter/order | Action | Size/risk and reason | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | /staff | Priority tasks (5) | tasks | slice(0,5) | due/priority model | NONE | Bounded preview; View all Tasks | Source + route regression |
| 2 | /staff | Active cases (5) | cases | slice(0,5) | active scope | NONE | Bounded preview; View all Cases | Source + route regression |
| 3 | /staff | Upcoming hearings (4) | hearings | slice(0,4) | scheduled/date | NONE | Bounded preview; View all Hearings | Source + route regression |
| 4 | /staff | Team updates (5) | dm/threads | slice(0,5) | server latest-message order | NONE | Bounded preview; View all Direct messages | Source + route regression |
| 5 | /staff | Recent documents (5) | documents/recent | limit 5 | server latest | NONE | Bounded preview; View all Documents (library cap separately blocked) | Source + route regression |
| 6 | /staff | Workload preview (6) | tasks/workload | slice(0,6) | server workload order | NONE | Bounded preview; Open task board/workload | Source + route regression |
| 7 | /staff/tasks | List + archived/filter variants | tasks | usePagination 12 | scope/search/case/member/status/priority/overdue before slice | KEEP | Complete scoped array; existing controls retained; shared shrink fix applies | Source + real route + relevant focused tests |
| 8 | /staff/tasks | Kanban columns | tasks | all column cards | same filters then status | ADD | Independent 12-card incremental windows; full totals and drag targets retained | Collection browser + shared boundaries |
| 9 | /staff/tasks | Calendar grid | tasks | month grid + 3 previews/day | existing date grouping | NONE | Do not paginate ordinary grid; overflowing day drilldown separately fixed | Source + route regression |
| 10 | /staff/tasks | Overflowing calendar day | tasks | static + more label | selected day and current filters | FIX | Clickable Staff-only paged day list, 8 records; every hidden task reachable | Collection browser + shared boundaries |
| 11 | /staff/tasks | Team workload | tasks/workload | all rows | API grouping/order; permission-gated | ADD | 8 rows; capability and task-filter action unchanged | Collection browser + shared boundaries |
| 12 | /staff/tasks | Detail subtasks | tasks?parentTaskId | all rows | server createdAt descending | ADD | 6 records; existing checkbox/create actions unchanged | Collection browser + shared boundaries |
| 13 | /staff/tasks | Detail comments | tasks/:id/comments | all rows | server createdAt ascending | ADD | 6 comments; original indices/keys and composer retained | Collection browser + shared boundaries |
| 14 | /staff/tasks | Form directory/case/hearing options | users/directory; cases; hearings | native/select options | existing option filters | NONE | Choice controls, not ordinary result lists; related document options inherit document cap | Source + route regression |
| 15 | /staff/cases | List + filters | cases | usePagination 10 | query/status/staff filters | KEEP | Complete permission-scoped set; no second paginator | Source + real route + relevant focused tests |
| 16 | /staff/cases | Status board | cases | all cards/column | same filters then lifecycle status | ADD | 10-card incremental column windows; counts and links unchanged; Admin opts out | Collection browser + shared boundaries |
| 17 | /staff/cases/:id | Tasks | tasks?caseId | all rows | API order | ADD | 8 records; existing task commands unchanged | Collection browser + shared boundaries |
| 18 | /staff/cases/:id | SOP cards | sop-templates | all cards | practice-area match; API label order | ADD | 8 templates; Apply SOP action retained; no new command | Collection browser + shared boundaries |
| 19 | /staff/cases/:id | Hearings | hearings?caseId | all rows | API date ascending | ADD | 8 hearings; detail action retained | Collection browser + shared boundaries |
| 20 | /staff/cases/:id | Team roster | cases/:id + users/directory | all rows | existing team IDs/directory order | ADD | 8 members; contract allows up to 100 team IDs | Collection browser + shared boundaries |
| 21 | /staff/cases/:id | Read-only parties | cases/:id | all rows | existing side/sort order | ADD | 8 parties; editing remains a separate complete form | Collection browser + shared boundaries |
| 22 | /staff/cases/:id | Party/team editing | cases/:id | complete form rows/options | existing form ordering | NONE | Do not slice editable form fields or reorder identities | Source + route regression |
| 23 | /staff/cases/:id | Misl binder categories | documents?caseId | loaded records, no continuation | API latest; binder category | BLOCKED | 50-record cap; no cursor/total; cap notice added, no fake full count | Contract/repository cap proof + honest UI/source |
| 24 | /staff/cases/:id | Case history | cases + hearings + tasks + documents | all derived chronological events | date ascending | BLOCKED | Document contribution can be truncated; full-history completeness needs document API capability | Contract/repository cap proof + honest UI/source |
| 25 | /staff/cases/:id | Client/team chat histories | messages | cursor history / load earlier | createdAt/id cursor; chronological merge | KEEP | Existing accumulator and scroll anchors; same mechanism as Messages route | Source + real route + relevant focused tests |
| 26 | /staff/hearings | Upcoming list | hearings | all rows | case-title/number search and court | ADD | 8 hearings after current filters; date order unchanged | Collection browser + shared boundaries |
| 27 | /staff/hearings | Past archive | hearings | all rows | non-scheduled; API order; existing archive not search-filtered | ADD | 8 hearings; original date/order and update action retained | Collection browser + shared boundaries |
| 28 | /staff/hearings | Hearing prep checklist | tasks | all hearing-linked tasks | hearingId; API order | ADD | 6 tasks; full completed/total counts and checkbox actions retained | Collection browser + shared boundaries |
| 29 | /staff/hearings | Month calendar | hearings | calendar dates + all scheduled day entries | month/day | NONE | Ordinary calendar grid; records are not cut off | Source + route regression |
| 30 | /staff/documents | Library/search/folders/trash | documents; documents/search | usePagination 12 over loaded window | existing server search then local folder/type/tag filters | BLOCKED | List cap 50/search cap 100, no cursor/total. Existing window retained and explicitly labelled loaded; page selection fixed | Contract/repository cap proof + honest UI/source |
| 31 | /staff/documents | Version history | documents/:id/versions | all versions | API version order | ADD | 6 versions; repository traverses complete version tree; original current-version index retained | Collection browser + shared boundaries |
| 32 | /staff/documents | Recent activity | documents/recent | limit 5 | latest | NONE | Intentionally bounded preview; main library destination exists | Source + route regression |
| 33 | /staff/documents | Signing recipients/template form options | envelopes/signers; document-templates; cases | options/checkbox fields | existing permissions/form order | NONE | Do not paginate a signer selection form or change its submission | Source + route regression |
| 34 | /staff/research | Note library/categories/search | research | usePagination 10 | search/category then existing API order | KEEP | Complete notes array; editor selection/drafts remain outside pagination | Source + real route + relevant focused tests |
| 35 | /staff/research | Editor/citations/tags | research/:id | form/read-only attributes | existing citation order | NONE | Fields belonging to a single note, not result collections | Source + route regression |
| 36 | /staff/crm | Lead tabs/search/filters | leads | usePagination 8 | server query/source/assignee then local status/practice filters | KEEP | Complete scoped result; export remains full filtered dataset | Source + real route + relevant focused tests |
| 37 | /staff/crm | Lead appointments drawer | appointments?leadId | all rows | API date order | ADD | 8 appointments; Open preserves appointment deep link | Collection browser + shared boundaries |
| 38 | /staff/crm | Booking slots/options | appointments/slots | date-bounded options | date/lawyer availability | NONE | Selectable slot options, not paged records | Source + route regression |
| 39 | /staff/clients | Clients + filters | clients | usePagination 10 | existing filterStaffClients model | KEEP | Complete scoped array; filtered CSV scope unchanged | Source + real route + relevant focused tests |
| 40 | /staff/clients | Profile linked matters | cases | all client matters | client ID and existing order | ADD | 8 matters; links/actions unchanged | Collection browser + shared boundaries |
| 41 | /staff/clients | KYC files dialog | clients/:id/kyc-files | all files | server complete file order; kyc.review | ADD | 8 files; signed download links and review commands unchanged | Collection browser + shared boundaries |
| 42 | /staff/clients | Next appointment overview | appointments?clientId | one derived upcoming item | nextClientAppointment model | NONE | A single next appointment, not a full history list | Source + route regression |
| 43 | /staff/messages | Client conversations | cases | all matching rows | existing matter/client-name search | ADD | 8 conversations; selected chat remains outside display window | Collection browser + shared boundaries |
| 44 | /staff/messages | Case-team conversations | cases | all matching rows | same search; team stream | ADD | Independent channel reset; same matter source and confidentiality unchanged | Collection browser + shared boundaries |
| 45 | /staff/messages | Direct conversations | dm/threads | all matching rows | peer search; latest message order | ADD | 8 threads; selection/unread/composer handlers unchanged | Collection browser + shared boundaries |
| 46 | /staff/messages | New colleague picker | users/directory | hard slice 8 | peer search/existing-thread exclusion | FIX | Incremental 8-person windows expose all returned peers | Collection browser + shared boundaries |
| 47 | /staff/messages | Matter message history | messages?caseId&cursor&limit | 30-record cursor accumulator | stable createdAt/id cursor and dedup merge | KEEP | Existing Load earlier and prepend anchor preservation; no numbered paging | Source + real route + relevant focused tests |
| 48 | /staff/messages | Direct message history | dm/threads/:id/messages | 30-record cursor accumulator | same stable cursor/merge | KEEP | Existing Load earlier preserved | Source + real route + relevant focused tests |
| 49 | /staff/messages | Conversation details/attachments | Selected case/DM thread and returned message attachments (no separate collection endpoint) | single-record fields/attachments | existing contract order | NONE | Record details/attachment controls, not another conversation list | Source + route regression |
| 50 | /staff/appointments | Today/upcoming/completed/all lists | appointments?assignedLawyerId | all filtered rows | existing date/tab/search/status model before slice | ADD | 8 rows; selected detail and route-linked page reveal preserved | Collection browser + shared boundaries |
| 51 | /staff/appointments | Day/week/month calendar | appointments | calendar grid | existing date/range model | NONE | Do not paginate grid; date selection drives paged list | Source + route regression |
| 52 | /staff/appointments | Booking form/slot controls | appointments/slots | date-bounded options | existing date/lawyer rules | NONE | Form choices retain complete availability and booking behavior | Source + route regression |
| 53 | /staff/content | Blog library | staff/content/blog-posts | usePagination 10 | search/category/status; server updatedAt descending | KEEP | Filter-key guard already works; no unnecessary local rewrite | Source + real route + relevant focused tests |
| 54 | /staff/content | News library | staff/content/news | usePagination 10 | tab/search/type/status; server updatedAt descending | KEEP | Independent tab reset already present | Source + real route + relevant focused tests |
| 55 | /staff/content/write | Editor/revision input | staff/content/blog-posts; staff/content/news (selected editor record) | single draft form | current document | NONE | Single editable document, not a result history endpoint | Source + route regression |
| 56 | /staff/hr | Attendance history | hr/attendance?userId | existing 8-record pages | self/date and existing HR order | FIX | Complete self-scoped array; independent attendance page; persist the displayed clamp to prevent page resurrection after refresh | Existing navigation + real-route shrink/growth refresh |
| 57 | /staff/hr | Leave request history | hr/leave-requests?userId | existing 8-record pages | self/status and existing HR order | FIX | Independent leave page and filter clamp retained; persist the displayed clamp to prevent page resurrection after refresh | Existing navigation + real-route shrink/growth refresh |
| 58 | /staff/hr | Balances | hr/leave-balances?userId&year | all five supported leave types | server year/type | NONE | Small fixed-type collection; no invented balances or paging | Source + route regression |
| 59 | /staff/hr | Upcoming leave/balance previews | hr/leave-requests; hr/leave-balances | 4 upcoming / 3 balances | existing model | NONE | Bounded previews with working tab/shortcut destinations | Source + route regression |
| 60 | /staff/profile | Active sessions | users/:userId/sessions | current session separate / 6 other sessions | API order; revoked filtered | KEEP | Session 17A paginator retained; shared clamp fix compatible | Source + real route + relevant focused tests |
| 61 | /staff/profile | Own activity log | users/me/audit-events | six-event pages over capped returned window | server createdAt descending | BLOCKED | Endpoint default 30/max 100 without cursor or total; loaded-count wording corrected across portals, but complete-history retrieval remains unavailable | Contract/repository cap proof + cross-portal 0/1/30 loaded events and page navigation |
| 62 | Shared Staff chrome | Notifications | notifications | latest 50 | server createdAt descending | BLOCKED | No continuation/total contract; shared Admin/Client menu unchanged | Contract/repository cap proof + honest UI/source |
| 63 | Shared Staff chrome | Global search palette | cases + clients + static destinations | searchable keyboard-scrolled listbox | query/tab filter and active-option scrolling | NONE | Choice palette, not a paged workspace; no cut-off records; ordinary page controls would conflict with its selection semantics | Source + route regression |
| 64 | All 12 routes | KPI/hero/status/action icons and static controls | Existing query-derived summaries/static controls (no separate pagination endpoint) | summary/static presentation | existing calculations | NONE | Explicitly excluded; Session 17B icons and all metric behavior untouched | Source + route regression |

### API evidence and pagination decisions

- Complete scoped array reads were verified in `work-management-repository.ts` (`listTasks`, `listComments`, `listHearings`, `listResearchNotes`, SOP/workload reads), `matters-repository.ts` (`listCases`, `listClients`), `crm-repository.ts` (leads/appointments), `cms-repository.ts` (Staff blog/news), `hr-repository.ts` (self attendance/leave), and `dm-repository.ts` (threads). The corresponding service/route/hook contracts return arrays, with no offset/total envelope. Windows operate on these complete returned snapshots after existing filters, preserving server/model order. They do not reduce network payloads or invent server paging arguments.
- KYC files: `kyc-service.ts:listFiles` selects all authorized client files. Version history: `document-repository.ts:listVersionHistory` traverses the version tree and sorts by descending version/date. Both can safely use client windows. Original map indices remain intact, so page two cannot incorrectly acquire the current-version flag.
- Matter and DM histories already have a real `{ page, isDone, continueCursor }` contract, `limit + 1` server reads, stable date/ID cursor logic, deduplication and accumulating hooks. Their existing 30-record Load earlier pattern and prepend anchors were retained. Browser cursors are opaque synthetic values; real cursor encoding/merging is separately covered by existing unit tests.
- **Blocked:** Staff `DocumentService.list` calls `DocumentRepository.listDocuments` with its default **50** cap. Search is capped at **100**, with no continuation or total in `documentListSchema`/`documentSearchSchema`. This affects the library/trash/folders, per-case Misl, and the document contribution to case history. Existing loaded-window paging remains; counts explicitly say **loaded**, and cap warnings never imply a full-library total. No new pagination was layered over the incomplete Misl/history.
- **Blocked:** `/users/me/audit-events` defaults to **30**, maximum **100**, and repository `listAudit` applies a limit without a cursor/total. Notifications use `listNotifications`' latest **50**, also without continuation. Shared profile/notification functionality was retained; no fictitious older pages were added.

Complete/scalable browsing for the five blocked groups requires separately authorized backend continuation/total contracts. Increasing a limit or filtering a truncated window cannot establish completeness. Highly concurrent/live ordering and very large full-array payloads remain backend scalability considerations; no new ordering policy was imposed.

## Corrections and shared reuse

- Reused **Pagination** and **usePagination** throughout. One small **StaffPagedCollection** composes them over existing keyed children. It adds counts/live status and display windows without owning queries, sorting, permissions or mutations. Shared workspaces opt in only for Staff; Admin renders its original children. Existing paginators were retained rather than wrapped again.
- Fixed shared page-state clamping: after a collection shrinks, the clamped page is now persisted. Previously Previous could appear inert and a later refresh could resurrect an invalid old page. Added optional collection/filter `resetKey`, stable callbacks and finite/integer navigation bounds; existing call signatures remain supported.
- HR's existing independent eight-record history pagers had the same stale stored-page defect. Persisted their displayed clamps without changing attendance/leave calculations, handlers or filters. Actual intercepted Clock In/Out cache invalidation verifies both histories retain page 2 across 53 → 9 → 53 returned records.
- Kanban uses independent incremental windows (Tasks 12 / Cases 10), full column totals and existing drag/action targets. Colleague discovery now expands past its former hard eight-person cutoff. Tasks calendar's former static `+ more` label now opens an eight-record day list for Staff; the calendar grid is not paginated.
- Secondary lists use eight records by default; task subtasks/comments, hearing prep and version histories use six. Page identity resets on the existing relevant filters/selected entity. Appointment deep links reveal the linked result page once, while local selection/detail state stays outside the window.
- Document selection now compares IDs rather than equal counts. Select-all toggles only that page, preserving selections from other loaded pages. Counts remain loaded-window counts; bulk mutation/download handlers are unchanged. CRM/Client CSV exports still cover the full filtered dataset, not the visible page.
- Pagination controls explicitly use `type="button"`, named navigation/current-page semantics and scoped Staff wrapping at narrow widths. Repeated hearing-prep pagers have hearing-specific navigation names. The final footer rule prevents inherited document/KYC list-item flex styling from squeezing the count beside the controls. No new nested scroll owner was introduced.
- Corrected ambiguous history states: empty version history no longer says Loading indefinitely; KYC and version failures expose retry without fake empty rows. Reused existing `useKycFilesQuery`. The sole query-module change exposes `useDocumentVersionsQuery` with the **same query object/key/GET/enabled rule**; the old `useDocumentVersions` still returns `data ?? []` for other callers. No endpoint or request semantics changed.

## Verification

Evidence is ignored under `.local/qa/session-17c/`; Chromium 151.0.7922.34, synthetic authenticated identities and records. Original pagination totals below exclude preliminary smoke/before captures, failed harness attempts and the later review/count-correction supplements.

| Gate | Result / evidence |
| --- | --- |
| Original pagination unit/component/model/contracts, before final count correction | **17 files, 181 tests passed**, including the original 39 focused assertions; `unit.json`, `unit.log`. Fresh count-correction results are recorded below. |
| Primary route matrix | **144 checks**: 12 routes × 360/390/768/1024/1280/1440 × light/dark; `evidence.json`, `matrix.log` |
| Desktop changed collections/state fixture | **46 checks, 32 clean axe scans**; `desktop-collections-evidence.json`, `desktop-collections.log` |
| Mobile changed collections/state fixture | **46 checks, 32 clean axe scans**, actual 360/dark collection interactions; `mobile-collections-evidence.json`, `mobile-collections.log` |
| Retained primary paginators | **10 checks**: actual records differ across first/middle/last pages, search resets, Content news/blog and independent HR histories; `primary-evidence.json`, `primary.log` |
| Functional isolation/regressions | **7 checks**: matter/DM earlier history, draft/reading preservation while paging conversations, Research unsaved editor/Top, Admin board opt-out, Client isolation, delayed read and 403/retry; `regression-evidence.json`, `regressions.log` |
| Final inherited-list styling | **16 checks, 16 clean axe scans**: version panes at all six widths/light/dark plus KYC at 360/1440 light/dark; `final-presentation-evidence.json`, `final-presentation.log` |
| Explicit empty/error/retry histories | **6 checks, 2 clean error-feedback axe scans**: versions/KYC empty and 403/recovery at 390/dark, plus both independent HR history clamps after shrink/growth at 1440/light; `read-state-evidence.json`, `read-states.log` |
| Original pagination browser coverage | **275 checks, 82 scans without reported violations, zero browser exceptions**; later review/correction supplements are recorded below |
| Writes | **6 intercepted writes**: four automatic message-read receipts and two explicit synthetic HR attendance upserts, fulfilled in browser-test memory. Zero live writes; no live record created, sent, revoked, restored, archived or deleted |
| Focused ESLint / TypeScript | Exit 0; `eslint.log`, `tsc.log` |
| Whitespace/safety | `git diff --check`, new-file whitespace/EOF, empty index and protected-file hash checks pass |

Boundary tests cover 0, 1, exactly one page, one-over, 53/101 records and page sizes 6/8/10/12. The browser fixture runs the **actual shared hook/component** through shrink, Previous, growth without resurrection and filter-before-slice reset; it is not an implementation mirror. Every changed collection is exercised with a large fixture, including numbered navigation or full incremental expansion, real record differences and keyboard activation. Individual backend deletions were not performed: shrinking/query-refresh behavior is exercised safely in the actual hook fixture and both HR histories via intercepted real-command cache invalidation.

All primary matrix measurements retain positioned Staff main, twelve mounted desktop navigation links (hidden on mobile), no bottom bar, zero outer/body horizontal or double scroll, and footer flush with the workspace bottom. Calendar/internal panes preserve their existing ownership. Dialog controls remain reachable at 360px; existing confirmations and mutations were not rewritten. Admin's board retains all original cards; Client acquires no Staff controls or styles.

`scope-proof.json` records unchanged original action handlers and existing CSS. API/service/repository/permission files are untouched. The metadata-only version-query extraction is separately verified by unit tests for legacy return type, key, enablement, authenticated GET and abort signal. The only existing-test edits are the subsequently owner-approved Profile count-wording assertions detailed below; no privacy/security expectation was weakened, skipped or deleted.

Reproduce browser groups with `node scripts/qa/verify-staff-pagination.mjs` and the flags `--matrix-only`, `--collections-only`, `--collections-only --mobile-collections`, `--primary-only`, `--regressions-only`, `--visual-final`, `--read-states` respectively. Do not rerun `--before` over the preserved pre-edit evidence. Focused tests use Vitest with `--maxWorkers=1`; `unit.json` records all seventeen test files and individual assertions. The harness generates an ignored worker from the committed Session 17A interception setup and an actual-component browser bundle using installed esbuild, without a package installation or product test route.

Initial QA setup corrections included nested JSX wrapping (repaired before the successful route run), consistent synthetic `id`/`_id` values, actual Admin view labels and portal-specific main selectors. They are not represented as product passes. Final controller checks were followed by targeted rescans of the inherited list styling and explicit history read states; full expensive matrices were not repeated for metadata-only or fixture-label corrections.

## Historical exceptions and limits

These are not represented as passing or silently repaired:

- Existing Client shell contract expectation of Staff `onOpenCommandCenter`, documented before this session. Staff layout remains unchanged; that historical failing file was not rerun as a green gate.
- Session 17B's two independently proven baseline contrast/source-contract failures: Client light border contrast (1.3659:1 versus 3:1) and the existing AdminDashboard `bg-emerald-` source color. Their files/tokens remain unchanged.
- Historical Admin/light whole-card loading pulse label `color-contrast` finding. This session's 82 scans cover pagination controls and new history-error feedback; they do not claim the prior whole-card finding passed.
- Public logo HTTP 404 remains outside scope; public styling/auth was not changed.

Live authenticated persistence, exhaustive API error/data permutations, production builds and the full suite remain unverified. Most matrix data is a controlled 53-record fixture (document responses obey the real 50 cap); detailed edge sizes are tested at the shared layer. Existing complete arrays are fetched in full, so frontend windows bound mounted result DOM rather than payload size. Some inherited data-only hook error UX is outside this pagination change; no blanket certification of every business operation or provider is claimed. The five retrieval-contract blockers remain open for owner/TL disposition.

## Before/after screenshots

All paths below are relative to `.local/qa/session-17c/`:

- Before: `before-{hearings|appointments|messages|tasks|cases}-1440-light.png` (five real pre-edit captures).
- Primary after comparisons: `after-staff-{hearings|appointments|messages|tasks|cases}-1440-light.png` and matching `-360-dark.png`.
- Functional windows: `after-hearings-paged-1440-light.png`, `after-hearings-paged-360-dark.png`, `after-tasks-expanded-column-1440-light.png`, `after-tasks-expanded-column-360-dark.png`.
- Preferred final panes: `final-document-versions-1440-light.png`, `final-document-versions-390-dark.png`, `final-document-versions-360-dark.png`, `final-client-kyc-1440-light.png`, `final-client-kyc-360-dark.png`. Final versions follow the actual descending version contract.
- Shared control widths: `collection-controls-{360|390|1440}-{light|dark}.png`; other widths are measured in JSON.
- Preserved workspaces: `after-message-history-{matter|direct}-1440-light.png`, `after-research-unsaved-390-dark.png`.

Representative desktop version pane, mobile KYC/dialog, hearing prep and control captures were visually inspected. Before/after viewports/themes and fixture labels are recorded; scroll positions can differ to expose the control being reviewed. Screenshots are actual browser captures, not design mockups.

## Exact changed files and final Git status

1. `src/client/queries/documents.ts`
2. `src/components/cases/cases-workspace.tsx`
3. `src/components/tasks/TaskCalendarView.tsx`
4. `src/components/tasks/TaskWorkloadView.tsx`
5. `src/components/ui/pagination.tsx`
6. `src/hooks/use-pagination.ts`
7. `src/index.css`
8. `src/views/shared/SharedProfilePage.tsx`
9. `src/views/staff/StaffAppointmentsPage.tsx`
10. `src/views/staff/StaffCRMPage.tsx`
11. `src/views/staff/StaffCaseDetailPage.tsx`
12. `src/views/staff/StaffClientsWorkspace.tsx`
13. `src/views/staff/StaffDocumentsPage.tsx`
14. `src/views/staff/StaffHRPage.tsx`
15. `src/views/staff/StaffHearingsPage.tsx`
16. `src/views/staff/StaffMessagesPage.tsx`
17. `src/views/staff/StaffTasksPage.tsx`
18. `tests/unit/cui-17-cached-profile-kyc.test.ts`
19. `doc/ui-reference/staff-admin/SESSION-17C-PAGINATION-REPORT.md`
20. `scripts/qa/verify-staff-pagination.mjs`
21. `src/components/dashboard/staff-paged-collection.tsx`
22. `tests/unit/staff-pagination.test.ts`

The Staff-only composition and tests/harness/report are new; other paths are existing targeted workspaces/shared primitives. Shared task/calendar components opt in for Staff, leaving Admin defaults intact. The version-query result accessor is the only shared data-module deviation and preserves the original query object and legacy return contract.

```text
 M doc/ui-reference/staff-admin/SESSION-08-ENGINEERING-REPORT.md
 M src/client/queries/documents.ts
 M src/components/cases/cases-workspace.tsx
 M src/components/tasks/TaskCalendarView.tsx
 M src/components/tasks/TaskWorkloadView.tsx
 M src/components/ui/pagination.tsx
 M src/hooks/use-pagination.ts
 M src/index.css
 M src/views/shared/SharedProfilePage.tsx
 M src/views/staff/StaffAppointmentsPage.tsx
 M src/views/staff/StaffCRMPage.tsx
 M src/views/staff/StaffCaseDetailPage.tsx
 M src/views/staff/StaffClientsWorkspace.tsx
 M src/views/staff/StaffDocumentsPage.tsx
 M src/views/staff/StaffHRPage.tsx
 M src/views/staff/StaffHearingsPage.tsx
 M src/views/staff/StaffMessagesPage.tsx
 M src/views/staff/StaffTasksPage.tsx
 M tests/unit/cui-17-cached-profile-kyc.test.ts
?? doc/ui-reference/staff-admin/SESSION-17C-PAGINATION-REPORT.md
?? scripts/qa/verify-staff-pagination.mjs
?? src/components/dashboard/staff-paged-collection.tsx
?? tests/unit/staff-pagination.test.ts
```

Session 08 is solely the protected unrelated local modification. HEAD/branch unchanged, index empty. Stop for owner/TL visual review; no staging, commit, push, merge, deployment, Session 18 or backend-pagination implementation.

## Prior owner-review gate — 2026-10-21 (historical; superseded by the count correction below)

**Review is not an unconditional PASS.** Changed pagination controls pass the reviewed visual/interaction checks, but the capped-result labeling requirement fails in an inherited, unchanged Profile activity label. No production source, test or business logic was changed during this review. Only this report and ignored review evidence were updated; the expected 20-path change set remains intact.

### Confirmed inherited labeling defect

`src/views/shared/SharedProfilePage.tsx:722` renders `{auditLog.length} total events`. The identical line exists at baseline `57df34fbf224ac5b534bbf7d0e119e13b608dfa0`; the file has no Session 17C diff. `/api/v1/users/me/audit-events` returns only a capped array (default 30, maximum 100), without an overall count. A browser fixture representing 53 available events and returning the permitted first 30 displays **30 total events**. This proves that the strict “capped loaded results must not be described as the entire dataset” gate is not met. The earlier inventory wording implying honest labeling for this group has been corrected above.

Evidence: `owner-audit-label-evidence.json`, `owner-audit-label.log`, `review-profile-audit-capped-total-label-1440-light.png`. This is one reproduced **FAIL finding**, not an additional passing check. Proposed minimal interim fix: say “30 loaded events” or “30 recent events”; true complete-history browsing remains blocked separately. Editing the shared Profile source is outside the expected 20-path allowlist and requires owner/TL authorization. No fix or Client/Admin profile change was made here.

### Compact visual acceptance set

All filenames below are under `.local/qa/session-17c/`. Existing captures were reused; only missing controls/selection evidence and the stale HR fixture capture were refreshed.

| Area | Result | Selected actual browser evidence |
| --- | --- | --- |
| Tasks Kanban before/after | PASS | `before-tasks-1440-light.png` → `review-tasks-kanban-window-1440-light.png` (12 of 53; Show more exposes 41 remaining) |
| Hearings before/after | PASS | `before-hearings-1440-light.png` → `after-hearings-paged-1440-light.png` (prep and archive controls) |
| Appointments list/calendar | PASS | `review-appointments-page2-1440-light.png` (9–16 of 53; calendar/detail selection retained) |
| Messages conversation window | PASS | `review-messages-conversations-page2-390-dark.png`; prior matter/DM reading-anchor checks retained |
| Document versions / selected-page scope | PASS | `final-document-versions-1440-light.png`; `review-documents-selected-page2-1440-light.png` (IDs 13 onward; 24 selected across two pages) |
| HR mobile | PASS | `review-hr-valid-balances-360-dark.png`, `review-hr-attendance-page2-360-dark.png` |
| Staff Clients/KYC mobile | PASS | `final-client-kyc-360-dark.png` |
| Profile capped audit count | FAIL — inherited | `review-profile-audit-capped-total-label-1440-light.png` |

The original `after-staff-hr-360-dark.png` contains obsolete malformed balance-fixture text (“undefined days”). It is not valid final visual acceptance evidence. The current harness already uses the actual `entitledDays`/`usedDays`/`pendingDays`/`remainingDays` contract; the refreshed capture shows 17 of 20 days without an application change. Other before/after captures may differ in scroll position or prep fixtures; they demonstrate controls rather than pixel equality.

Existing evidence was reconciled again: **64 rows; KEEP 11 / FIX 4 / ADD 21 / NONE 23 / BLOCKED 5; 181 passing tests; 275 existing browser checks; 82 clean scoped accessibility scans**. The evidence-only supplement adds **6 passing targeted screenshot/interaction checks**, zero browser errors and zero writes (`owner-review-evidence.json`, `owner-review.log`). All six retain zero outer/body scroll ranges and horizontal overflow, relative Staff main, twelve navigation links, no bottom bar and a flush footer. The separate audit-label reproduction is the failed review finding above. No expensive matrix, unit suite, TypeScript or ESLint run was repeated because application/test source did not change. Fresh whitespace and scope/index/protected-hash checks passed.

Source and existing interaction evidence cover every added wrapper label, first/middle/last record changes, incremental expansion, reset/clamp behavior, document ID selection and full-filtered exports. Tasks list/calendar/detail, Cases list/board/detail, Hearings prep/archive, CRM, Clients, Research, Content and independent HR histories retain their existing handlers. Dashboard previews remain bounded with destinations. Profile sessions remain current-session-plus-six-others; its source is unchanged and focused session tests remain passing. Shared task/case windows explicitly opt in for Staff; append-only CSS is Staff-scoped. Admin board opt-out, Client isolation, message prepend/reading anchors and Research unsaved drafts retain their recorded passes. No new interaction, layout, keyboard or scroll defect was found in the reviewed pagination controls.

### Deferred retrieval dependencies — three shared capability families

These are dependencies for a separately authorized phase, not APIs implemented or schema changes approved here:

1. **Documents, case Misl and document-derived case history share one document retrieval capability.** Existing `/api/v1/documents` and `/api/v1/documents/search` route handlers parse `documentListSchema` / `documentSearchSchema` in `src/shared/contracts/documents.ts`; neither accepts continuation or returns a total. `DocumentService.list/search` in `src/server/services/document-service.ts` delegates to `DocumentRepository.listDocuments/searchDocuments` in `src/server/repositories/document-repository.ts` (50/100 limits). A future compatible continuation/total contract must be implemented once through those existing layers and `src/client/queries/documents.ts`, then reused by the library/search/folders/trash and case-detail consumers. Preserve firm/case access, Client restrictions, current-version/trash rules and stable ordering; apply supported filtering before page boundaries/counts (search currently applies tag filtering after the 100-row limit). Do not build three duplicated APIs. Case history must accumulate all relevant document contributions before claiming completeness, or explicitly remain partial.
2. **Own profile audit:** `src/app/api/v1/users/me/audit-events/route.ts` → `IdentityService.listOwnAudit` → `IdentityRepository.listAudit` (`src/server/services/identity-service.ts`, `src/server/repositories/identity-repository.ts`) → `useOwnAuditEventsQuery` in `src/client/queries/identity.ts`. Future continuation/total semantics must retain self/firm scoping and the restricted Client audit projection. The independent “total events” copy defect can be corrected without inventing a backend total, subject to its own scope approval.
3. **Notifications:** `src/app/api/v1/notifications/route.ts` → `CommunicationService.listNotifications` → `CommunicationRepository.listNotifications` (`src/server/services/communication-service.ts`, `src/server/repositories/communication-repository.ts`, default latest 50) → `useNotifications` in `src/client/queries/communication.ts`. Continuation/count metadata and compatible cache/read-state behavior are missing. Preserve self/firm scoping, role-safe destination projection and existing read actions; the unchanged shared notification menu currently provides no complete-history navigation.

The five groups remain BLOCKED. Historical Client contract/contrast failures, Admin loading-label contrast and public logo 404 remain as documented; no claim of live persistence, full-suite or production-build verification is added. Owner/TL acceptance and authorization for the inherited label correction remain required. No staging or Git checkpoint was performed.

## Final audit-count correction — 2026-10-21

**The inherited count-label finding is corrected; owner/TL review remains pending.** The owner authorized `SharedProfilePage.tsx` as path 21 and separately approved updating the obsolete wording assertions in `tests/unit/cui-17-cached-profile-kyc.test.ts` (“Authorize the assertion updates”), making the final scope **22 paths**. No additional production path was added.

- Root cause: the shared Activity Log badge described the length of the returned array as a total, although the existing self-audit endpoint returns a capped window (default 30, maximum 100), with no lifetime total or continuation.
- Exact replacement: `{auditLog.length} loaded event{auditLog.length === 1 ? "" : "s"}`. The UI now says **1 loaded event** / **30 loaded events**. Empty, initial-loading and denied Client states retain no badge; existing recoverable cached-data behavior is preserved.
- This is the sole production change in the correction. The existing six-event page size, all activity details, Staff/Admin behavior, Client restricted audit projection, security, permissions, API calls and query keys remain unchanged. No total, cursor, load-more action or endpoint was invented.
- The existing Client regression file changes only six count-wording assertion lines. Loading, cache recovery, 401/403/404 withholding, private-detail/IP protection and every KYC assertion remain intact. Three returned-window boundary cases were added to the existing Session 17C test file; the existing browser harness gained `--audit-counts`.

### Fresh focused verification

| Gate | Result |
| --- | --- |
| Focused regression tests | **6 files, 97 tests passed**: Staff pagination (now 42 tests), existing hook/session paging, cached Profile/KYC, identity contracts and account/profile commands. `audit-count-unit.json`, `audit-count-unit.log` |
| Cross-portal actual-route browser checks | **22 passed**. Staff/Admin/Client × 0/1/30 returned events × 1440/light and 360/dark = 18 cases, plus three controlled initial-loading cases and Client 403/retry. `audit-count-evidence.json`, `audit-count-browser.log` |
| Accessibility | **18 active Activity Log panel scans, zero reported violations**; actual six-event records and numbered/Previous/Next/keyboard navigation checked |
| Data/privacy | Synthetic available history 53, returned window 30; exactly five pages, six visible records, first/middle/last/Previous/keyboard-first navigation, no false 53-loaded or lifetime-total claim. Client receives/displays no private audit details/IP. **Zero writes, live mutations or browser exceptions** |
| TypeScript / focused ESLint / whitespace | Exit 0; `audit-count-tsc.log`, `audit-count-eslint.log`; fresh `git diff --check` and new-file whitespace/EOF checks passed |

The fresh unit command is `npx vitest run tests/unit/staff-pagination.test.ts tests/unit/use-pagination.test.ts tests/unit/cui-17-cached-profile-kyc.test.ts tests/unit/session-list-pagination.test.ts tests/unit/identity-contracts.test.ts tests/unit/session-17a-account-profile.test.ts --maxWorkers=1`. The browser command is `node scripts/qa/verify-staff-pagination.mjs --audit-counts`. These focused checks supplement, rather than repeat or add duplicate unit totals to, the earlier 181-test run. Current browser evidence consists of the original 275 checks, six review checks and these 22 correction checks (**303 passing checks and 100 scoped clean scans**). The old failed-label reproduction is historical evidence, not a passing check or unresolved count-label defect.

### Final before/after evidence and limits

Evidence remains ignored under `.local/qa/session-17c/`:

- Before: `review-profile-audit-capped-total-label-1440-light.png` — historical **30 total events**.
- Staff after: `audit-count-staff-30-1440-light.png`, `audit-count-staff-1-360-dark.png`.
- Admin after: `audit-count-admin-30-1440-light.png`, `audit-count-admin-1-360-dark.png`.
- Client after: `audit-count-client-30-1440-light.png`, `audit-count-client-30-360-dark.png`.
- Matching one-event and thirty-event captures exist for all three portals at both tested width/theme combinations. Representative Staff desktop, Admin mobile and Client mobile captures were visually inspected; no count clipping or horizontal overflow was found.

**Five backend retrieval groups remain unresolved for Session 17D:** Documents, case Misl, document-derived case history, own profile audit history and notifications. The three shared capability families and exact existing dependencies above remain authoritative; this wording fix adds no retrieval capability. Historical unrelated Client contract/contrast failures, Admin loading-label contrast and public logo 404 remain documented. Real authenticated persistence and the full suite/production build remain unverified. Existing Staff/Admin fresh audit failures retain their prior loading fallback; this copy-only correction does not claim a new error UX.

Final branch/local and remote baseline remain `ui/staff-admin-upgrade` / `57df34fbf224ac5b534bbf7d0e119e13b608dfa0`. Session 08 retains its original protected hash, unchanged and unstaged. Final exact paths/status are listed above with the approved 22-path scope. Index empty; no staging, commit, push, merge, deployment, Session 17D implementation or Session 18. **Stop for owner/TL visual approval.**
