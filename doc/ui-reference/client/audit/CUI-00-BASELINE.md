# CUI-00 BASELINE AUDIT

Phase: CUI-00 only (freeze reference pack + baseline).  
No Client UI redesign. No application source changes.  
Recorded: 18 September 2026.  
Workspace: `/workspace` clone of `raghav556/lexnepal`.

---

# CUI-00 EXECUTIVE RESULT

STATUS: BLOCKED  
READY FOR CUI-01: NO

Blockers:

1. Controlling Source-of-Truth files are **not present** on this clone (`origin/main` @ `cdee66080fbdc51d47b7536d533aad60bfae54ff`).
2. Expected DOCX SHA-256 cannot be verified because the file is missing.
3. The 12 embedded JPEG references cannot be losslessly extracted.
4. Baseline screenshots are BLOCKED: no `.env.local`, no `node_modules`, no running local MySQL/app process.

Repository route/fixture/navigation audit below is complete from source evidence and does not replace the missing visual freeze.

---

## 1. GIT BASELINE

Branch: `cursor/cui-00-baseline-e976` (created from `main`)  
HEAD: `cdee66080fbdc51d47b7536d533aad60bfae54ff`  
Initial status: **clean** (`git status --short` empty; `git diff --stat` empty)

This clone does **not** contain the owner-described pre-existing dirty work. The six protected files match HEAD with empty diffs.

Protected pre-existing dirty files (owner-expected vs this clone):

| File | Owner-expected | This clone |
| --- | --- | --- |
| `src/components/cases/cases-workspace.tsx` | dirty | clean / matches HEAD |
| `src/shared/contracts/case-ui.ts` | dirty | clean / matches HEAD |
| `src/views/client/ClientCaseDetailPage.tsx` | dirty | clean / matches HEAD |
| `src/views/client/ClientCasesPage.tsx` | dirty | clean / matches HEAD |
| `src/views/staff/StaffCaseDetailPage.tsx` | dirty | clean / matches HEAD |
| `tests/unit/cases-r9-a11y.test.ts` | dirty | clean / matches HEAD |

Commands recorded:

```
git branch --show-current  →  main (then cursor/cui-00-baseline-e976)
git rev-parse HEAD         →  cdee66080fbdc51d47b7536d533aad60bfae54ff
git status --short         →  (empty)
git diff --stat            →  (empty)
git diff --name-only       →  (empty)
```

`AGENTS.md` on this clone is only the Next.js auto-generated agent-rules block. It does not contain a Client UI Source-of-Truth pointer.

---

## 2. SOURCE-OF-TRUTH VERIFICATION

DOCX path: `doc/ui-reference/client/LexNepal_Client_UI_Upgrade_Source_of_Truth_v1.0.docx` — **MISSING**  
SHA-256: **NOT VERIFIED** (file absent; expected `53601050E81EC297DF4D83A31B05B3732D0D9E22291C547CD2BAB3D4D81FD55B`)  
Markdown path: `doc/ui-reference/client/LexNepal_Client_UI_Upgrade_Source_of_Truth_v1.0.md` — **MISSING**  
README path: `doc/ui-reference/client/README.md` — created by CUI-00 to record the missing master and expected JPEG paths  
Source read completely: **NO** (files not in repository)

CUI-00 locked rules restated in the phase brief (used only where the DOCX is unavailable):

- Home is master shell authority.
- Matter Details white sidebar is rejected.
- Checklist white sidebar is rejected.
- `/client/hearings` belongs to My Matters.
- Screenshot sample values are not production truth.
- KYC copy is not regulatory authority.
- Notification preference switches require real persistence.

Do not treat this audit as a rewrite of the missing DOCX.

---

## 3. REFERENCE FREEZE

Expected: 12  
Extracted: 0/12

Table:

| Reference | Path | Dimensions | SHA-256 | Opens | Role (master/body) |
| --- | --- | --- | --- | --- | --- |
| 01 Home | `references/01-home.jpg` | n/a | n/a | NO | master shell + Home body (locked) |
| 02 My Matters | `references/02-my-matters.jpg` | n/a | n/a | NO | body; must use Home shell |
| 03 Matter Details | `references/03-matter-details.jpg` | n/a | n/a | NO | BODY only; white sidebar rejected |
| 04 Hearings | `references/04-hearings.jpg` | n/a | n/a | NO | body; route belongs to My Matters |
| 05 Checklist | `references/05-checklist.jpg` | n/a | n/a | NO | BODY only; white sidebar rejected |
| 06 Documents | `references/06-documents.jpg` | n/a | n/a | NO | body + master shell |
| 07 Messages | `references/07-messages.jpg` | n/a | n/a | NO | body + master shell |
| 08 Appointments | `references/08-appointments.jpg` | n/a | n/a | NO | body + master shell |
| 09 Identity Verification | `references/09-identity-verification.jpg` | n/a | n/a | NO | body + master shell; copy not legal authority |
| 10 Sign Documents | `references/10-sign-documents.jpg` | n/a | n/a | NO | body + master shell |
| 11 Notifications | `references/11-notifications.jpg` | n/a | n/a | NO | body + master shell; preference toggles need persistence |
| 12 Profile | `references/12-profile.jpg` | n/a | n/a | NO | body + master shell; must not restyle Staff/Admin globally |

Extraction was not performed. Generating, screenshotting, converting JPEG→PNG, or recompressing is forbidden.

---

## 4. CLIENT ROUTE COMPLETENESS

Expected: 12  
Found: 12/12 live portal `page.tsx` files under `src/app/(client)/`.

Extra live portal routes: **none**.  
Removed (verified 404 in `tests/e2e/route-coverage.spec.ts`): `/client/billing`, `/client/billing/return`.  
Auth entry (not a portal screen): `/sign-in/client`.

E2E static coverage list omits `/client/cases/:id`.

### Full route / component table

| Route | Route file | Owner component | Current visible terminology | Target visible name | Target active sidebar item |
| --- | --- | --- | --- | --- | --- |
| `/client` | `src/app/(client)/client/page.tsx` | `src/views/client/ClientDashboard.tsx` | Nav **Dashboard**; hero “Your legal portal”; metrics “Active matters” | Home | Home |
| `/client/cases` | `src/app/(client)/client/cases/page.tsx` | `src/views/client/ClientCasesPage.tsx` | Title **My Cases**; mixed “matters” in body | My Matters | My Matters |
| `/client/cases/:id` | `src/app/(client)/client/cases/[id]/page.tsx` | `src/views/client/ClientCaseDetailPage.tsx` | Loading **Case Details**; hero matter title; **Back to cases** | Matter Details | My Matters |
| `/client/hearings` | `src/app/(client)/client/hearings/page.tsx` | `src/views/client/ClientHearingsPage.tsx` | **Hearings** / Hearing Schedule | Hearing Schedule | My Matters |
| `/client/checklist` | `src/app/(client)/client/checklist/page.tsx` | `src/views/client/ClientChecklistPage.tsx` | Nav **Checklist**; page **Action Checklist** | Action Checklist | My Matters |
| `/client/documents` | `src/app/(client)/client/documents/page.tsx` | `src/views/client/ClientDocumentsPage.tsx` | **Documents** / Vault & Filings | Documents | Documents |
| `/client/messages` | `src/app/(client)/client/messages/page.tsx` | `src/views/client/ClientMessagesPage.tsx` | **Messages** / Matter Channels | Messages | Messages |
| `/client/booking` | `src/app/(client)/client/booking/page.tsx` | `src/views/client/ClientBookingPage.tsx` | **Book Appointment** / Book Legal Consultation | Appointments | Appointments |
| `/client/kyc` | `src/app/(client)/client/kyc/page.tsx` | `src/views/client/ClientKYCOnboarding.tsx` | **Identity (KYC)** / Identity Verification (KYC) | Identity Verification | Identity Verification |
| `/client/signatures` | `src/app/(client)/client/signatures/page.tsx` | `src/views/client/ClientSignaturesPage.tsx` | **E-Signatures** / Digital E-Signatures | Sign Documents | Sign Documents |
| `/client/notifications` | `src/app/(client)/client/notifications/page.tsx` | `src/views/client/ClientNotificationsPage.tsx` | **Notifications** | Notifications | Notifications |
| `/client/profile` | `src/app/(client)/client/profile/page.tsx` | `src/views/shared/SharedProfilePage.tsx` (`variant="client"`) | **Profile & Settings** | Profile | Profile |

Layout for all 12: `src/app/(client)/layout.tsx` with `PortalRoleGuard allowed="client"`.

---

## 5. RUNTIME/DATA MAP

| Route | Major child components | Query hook(s) | API endpoint(s) | Mutation(s) | Primary actions | Risk notes |
| --- | --- | --- | --- | --- | --- | --- |
| `/client` | `PortalPageShell`, `MetricCard`, `DashboardSection`, `DashboardListRow`, `StatusBadge`, `EmptyState` | `useMyClient`, `useClientCases`, `useHearings`, `useDocuments`, `useTasks`, `useAppointments`, `useNotifications`, `usePublicCmsSettings` (`useCurrentUser` imported unused) | GET `/api/v1/clients/me`, `/api/v1/cases?clientId=`, `/api/v1/hearings`, `/api/v1/documents`, `/api/v1/tasks`, `/api/v1/appointments`, `/api/v1/notifications`, `/api/v1/public/cms/settings` | none | Navigate to messages/booking/matter/signatures/kyc/checklist/hearings/notifications/documents/cases | Client-side filtering of live queries; no page-level error UI |
| `/client/cases` | `PortalPageShell`, `CaseQueryState`, `Input`, `Pagination`, `DashboardFilterBar`, `DashboardTable`, `DashboardListRow` | `useCurrentUser`, `useMyClient`, `useClientCasesQuery`, `useHearings`, `usePagination` | GET `/api/v1/clients/me`, `/api/v1/cases?clientId=`, `/api/v1/hearings` | `casesQuery.refetch` | Search, status filter, cards/table, paginate, open matter, request consultation | Uses `case-ui` contract shared with Staff |
| `/client/cases/:id` | `PortalPageShell`, `Tabs`, `CaseQueryState`, `DocDownload`, `DashboardSection` | `useClientCaseQuery`, `useMyTeam`, `useHearings`, `useDocuments`, `useDownloadDocument`, `useTasks`, `useMessages(..., false)` | GET `/api/v1/cases/:id`, `/api/v1/clients/me/team`, `/api/v1/hearings?caseId=`, `/api/v1/documents?caseId=`, `/api/v1/tasks?caseId=`, `/api/v1/messages?caseId=&isInternal=false`, `/api/v1/documents/:id/download` | download only | Tabs; download docs; message team; signatures/documents/checklist links | Checklist client-visible only; no upload on detail |
| `/client/hearings` | `PortalPageShell`, `DashboardFilterBar`, `DashboardTable`, `Pagination` | `useMyClient`, `useClientCases`, `useHearings`, `usePagination` | GET `/api/v1/clients/me`, `/api/v1/cases`, `/api/v1/hearings` | none (client-generated ICS) | Upcoming/Past/All; cards/table; ICS export; open matter | Sidebar currently highlights Hearings, not My Matters; **no hearings in fixture** |
| `/client/checklist` | `PortalPageShell`, `DashboardListRow`, `EmptyState` | `useMyClient`, `useClientCases`, `useTasks`, `useI18n` | GET `/api/v1/clients/me`, `/api/v1/cases`, `/api/v1/tasks` | **none** (read-only) | View progress; message advocate; book appointment | Explicitly read-only; `clientVisible` filter |
| `/client/documents` | `PortalPageShell`, `Dialog`, `Select`, `Input`, `Pagination`, `DashboardTable` | `useCurrentUser`, `useMyClient`, `useClientCases`, `useDocuments`, `useUploadDocument`, `useDownloadDocument`, `usePagination` | GET docs/cases/me; POST `/api/v1/document-upload-intents` + complete + poll; GET `/api/v1/documents/:id/download` | upload, download, preview | Upload; filter; search; preview; download | `?caseId=` deep-link |
| `/client/messages` | `PortalPageShell`, **`MatterChatPanel mode="client"`** | page: `useCurrentUser`, `useMyClient`, `useMyTeam`, `useClientCases`, `useUnreadMessageCounts`; panel: `useMessages`, `useMessageCommands` | GET me/cases/team/unread/messages; POST `/api/v1/messages`, `/api/v1/messages/read`; attachment upload-intents | send, mark read, attach | Select channel; compose; attach; book consultation | Shared chat engine with Staff; **messages not seeded** |
| `/client/booking` | `PortalPageShell`, mode cards, slot grid | `useMyClient`, **`useCases` (staff hook)**, `useAvailableSlots`, `useAppointments`, `useAppointmentCommands` | GET me/cases/appointments/slots; POST `/api/v1/appointments/book` | `bookConsultation` | Pick mode/date/slot/notes; confirm; view upcoming | Uses `useCases` for `assignedLawyerId`; **appointments not seeded** |
| `/client/kyc` | `PortalPageShell`, wizard, `Input` | `useMyClient`, `useClientCommands`, `useKycFiles` | GET me + kyc-files; POST kyc-upload-intents + complete + poll; POST `/api/v1/clients/me/kyc-submissions` | upload files, submit KYC | 3-step wizard; ID + address; consent `kyc-consent-v1` | Copy mentions AML/Bar; **KYC not seeded** |
| `/client/signatures` | `PortalPageShell`, sign `Dialog`, canvas | `useCurrentUser`, `useMyClient`, `useClientCases`, `useDocuments`, `useDownloadDocument`, `useMyPendingEnvelopeActions`, `useSignDocument`, `useDeclineEnvelope`, `useIssueOtp`, `useVerifyOtp`, `useMarkDocumentViewed` | GET me/cases/documents/envelopes/pending; POST otp/sign/decline/mark-viewed; signature image upload-intent | OTP, sign, decline, mark viewed | Review/sign/decline; draw/type/upload signature; download file/certificate | OTP step-up; consent `esign-consent-v1`; **envelopes not seeded** |
| `/client/notifications` | `PortalPageShell`, `DashboardListRow` | `useCurrentUser`, `useNotifications`, `useNotificationCommands` | GET `/api/v1/notifications` (10s poll); PATCH `/:id` mark read; PATCH collection mark all | markRead, markAllRead | Mark all read; click to `notif.link` | No category filters; **no preference toggles**; **notifications not seeded** |
| `/client/profile` | `ProfileHero`, `ClientProfileExtras`, `Tabs`, MFA/session panels | `useCurrentIdentityUser`, `useOwnAuditEvents`, `useSessions`, `useProfileCommands`; extras: `useMyClient`, `useCases` | PATCH `/api/v1/users/me`; avatar intents; sessions; audit-events; Better Auth password/TOTP | profile, password, avatar, TOTP, revoke sessions | Edit profile; password; MFA; sessions; JSON export | **Shared with Staff/Admin**; language toggle is `PortalAccountMenu` i18n, not a persisted profile field |

---

## 6. SHARED DEPENDENCY MAP

| Component | Used by Client | Staff | Admin | Public | Risk | Future isolation requirement |
| --- | --- | --- | --- | --- | --- | --- |
| `PortalSidebar` (+ group/item) | layout | yes | yes | no | High | Token/className override; must not change link contract |
| `PortalTopbar` | layout `portal="client"` | yes | yes | no | High | Client branch already exists; do not change shared breadcrumb logic blindly |
| `PortalFooter` | layout `portal="client"` | yes | yes | no | Medium | Client copy branch; emerald hard-codes shared |
| `PortalMobileNav` | layout | yes | yes | no | High | Bottom bar already layout-owned; drawer is shared |
| `PortalPageShell` | 11 client views | all staff views | all admin views | no | Critical | Prefer Client wrapper / tokens; do not fork shell casually |
| `NepalDecoratedHero` | client decorated pages | no | no | no | Low for Staff/Admin | Client-safe to restyle |
| dashboard primitives (`DashboardButton`, `DashboardSection`, `DashboardListRow`, `MetricCard`, `EmptyState`, `StatusBadge`) | all client views | yes | yes | no | High | Token override; must not restyle globally |
| `DashboardTable` / `DashboardFilterBar` | cases, documents, hearings | yes | yes | no | High | Token override |
| `DashboardStatusLabel` | most client views | yes | yes | no | High | Must not touch tone mapping for cosmetics |
| `CaseQueryState` | cases list + detail | staff detail | via workspace | no | Medium | Reusable; portal prop already exists |
| `CasesWorkspace` | **no** | StaffCasesPage | admin cases | no | None if left alone | **must not touch** in Client UI work |
| Other case editors (identity, parties, create, hearing, MISL, team) | **no** | yes | some | no | None if left alone | **must not touch** |
| `MatterChatPanel` | messages `mode="client"` | messages, team chat, case detail, command center | no | no | High | Style chrome only; **must not** replace engine |
| `SharedProfilePage` | profile `variant="client"` | staff variant | admin variant | no | High | Client extras + tokens; keep shared MFA/session |
| `ClientProfileExtras` | profile only | no | no | no | Low | Client-scoped |
| `PortalRoleGuard` / `IdleSessionGuard` / `PortalAccountMenu` / `PortalFirmBrand` / `PortalBrandingProvider` | layout | yes | yes | no | High auth/brand | **must not touch** for visual-only work |
| shadcn `Input`/`Dialog`/`Select`/`Tabs`/`Pagination` | several client views | yes | yes | **yes** (public) | High public blast | **must not touch** during Client-only work |

---

## 7. FUNCTIONALITY PRESERVATION MATRIX

Verified from source. Items not present are marked absent, not assumed.

### `/client` Home

Preserve: live dashboard queries; metric counts (active matters, upcoming hearing, documents pending, actions); featured matter link; action cards to signatures/KYC/checklist; upcoming list; recent notifications; quick links to messages/booking/documents/cases; unlinked-client empty state; loading shell.

Absent: mutations; uploads.

### `/client/cases` My Matters

Preserve: search; status filters `all|active|on_hold|closed`; cards/table toggle; pagination; next-hearing enrichment; open `/client/cases/:id`; consultation CTA; `CaseQueryState` error/forbidden/not_found; unlinked empty; “No cases on file” / no-match empty.

### `/client/cases/:id` Matter Details

Preserve: breadcrumb back to cases; tabs Overview / Hearings / Documents / Messages / Checklist; parties (allowlist); team via `useMyTeam`; document download; messages client-visible only (`isInternal=false`); checklist `clientVisible` + not archived + no parent; pending-signature banner; loading/error via `CaseQueryState`.

Absent on this page: upload; send-message composer (navigates to messages); checklist mutation.

### `/client/hearings`

Preserve: Upcoming / Past / All; cards/table; pagination; ICS export (`downloadHearingsIcs`); matter links; unlinked empty.

Absent: server calendar API; appointment semantics (hearings are hearings).

### `/client/checklist`

Preserve: read-only `clientVisible` items; progress; empty CTAs to messages/booking.

Absent: complete/update task as Client.

### `/client/documents`

Preserve: upload via upload-intents; type list (pleading, evidence, contract, affidavit, correspondence, other); matter select required; drag-drop; search; matter/type/source filters; `?caseId=`; preview dialog; download; pagination.

### `/client/messages`

Preserve: `MatterChatPanel` as the engine; matter channel list; unread counts; `?caseId=` deep-link; send; auto mark-read; attachments; client `isInternal: false`; mobile channel/chat split; empty CTAs.

### `/client/booking`

Preserve: modes virtual / in-person / phone; date stepper; `useAvailableSlots`; notes; POST book; success view; upcoming appointments sidebar; lawyer from active case `assignedLawyerId`.

### `/client/kyc`

Preserve: status card; wizard; `government_id` + `proof_of_address` uploads; address + ID number + consent; submit; resubmit when rejected; kyc files list.

Do not treat on-screen “Nepal AML / Bar compliance” copy as legal/regulatory authority.

### `/client/signatures`

Preserve: pending envelopes + docs requiring signature; OTP issue/verify; draw/type/upload signature; consent; decline with reason; mark viewed; download signed file; client-generated certificate PDF.

### `/client/notifications`

Preserve: list; unread styling; mark one read; mark all read; navigate via `notif.link`.

Absent (verified): category tabs; Today/This Week/Earlier grouping; Important Dates section; **preference toggles** (no Client UI and no notification-preference API in `src/app/api/v1/notifications`).

### `/client/profile`

Preserve: General edit (name/phone); Security password; TOTP enroll/disable; Active Sessions revoke; Data & Privacy JSON export; avatar upload/remove; `ClientProfileExtras` KYC + case counts + `/contact`; language toggle in `PortalAccountMenu` (i18n, not a saved profile field).

---

## 8. FIXTURE CAPABILITY MATRIX

Scripts: `scripts/e2e/fixtures.ts`, `scripts/e2e/seed-e2e-users.ts`, `scripts/e2e/seed-e2e-client-portal.ts`.  
npm: `e2e:seed`, `e2e:seed:portal`.

Current Client identity: `client@srimarlaw.com.np` / **Sarita Ray** / password `client@1234`.  
Current matter: `E2E-PORTAL-001` title **E2E Portal Matter**.

| Domain | Current fixture status | Existing seed path | CUI-01 requirement |
| --- | --- | --- | --- |
| Client identity | PARTIALLY SUPPORTED | users + CRM `clients` row (phone `9800000001`) | Keep existing smoke identity; add or parameterize a **separate UI-preview fixture** (SoT forbids casually changing smoke identities). Do not use screenshot name as production data. |
| Matters | PARTIALLY SUPPORTED | 1 case, minimal fields, no court/parties | Multiple matters with titles, types, numbers, courts, advocates, status variation, activity |
| Hearings | NOT SEEDED | — | Next + upcoming + completed + adjourned/past |
| Checklist | PARTIALLY SUPPORTED | 1 todo `Provide ID copy` `clientVisible: true` | Overdue / due soon / upcoming / completed |
| Documents | PARTIALLY SUPPORTED | 3 public PDFs + storage objects | PDF/DOCX mix, shared/recent/uploaded/signature-related, multiple matters |
| Messages | NOT SEEDED | runtime-only in `verify:client-portal-messaging` | Read/unread Matter conversation with legal-team participants |
| Appointments | NOT SEEDED | — | Upcoming + past; office/online/phone where supported |
| Identity / KYC | NOT SEEDED | schema default `pending` only | Completed / pending / under-review / missing using existing domain |
| Signatures | NOT SEEDED | — | Pending / due / completed using existing envelope contracts |
| Notifications | NOT SEEDED | — | Today/week/earlier, read/unread, multiple categories |
| Profile fields | PARTIALLY SUPPORTED | name/email/phone | Address, language, emergency contact, account metadata **using existing fields only** |
| Case team | PARTIALLY SUPPORTED | `assignedLawyerId` + optional `staff2` team row | Coherent legal-team participants for messages/matter details |
| Storage objects | SUPPORTED BY CURRENT FIXTURE | 3 PDF blobs | Extend with preview fixture docs, not a second storage layer |

CUI-01 must extend `e2e:seed:portal` / fixture family. Do **not** revive Convex mocks or hard-code arrays in React pages.

---

## 9. NAVIGATION BASELINE

### Current desktop (`src/app/(client)/layout.tsx` `NAV`)

Headings and items:

- Overview → Dashboard `/client`
- Your Matters → My Cases `/client/cases`; Hearings `/client/hearings`; Checklist `/client/checklist`; Documents `/client/documents`; Messages `/client/messages`
- Services → Identity (KYC) `/client/kyc`; E-Signatures `/client/signatures`; Book Appointment `/client/booking`; Notifications `/client/notifications`
- Account → Profile & Settings `/client/profile`

Active-state: `/client` exact; every other item exact or `pathname.startsWith(href + "/")`. Therefore `/client/cases/:id` activates **My Cases**. `/client/hearings` activates **Hearings**, not My Cases.

Desktop chrome: `PortalSidebar` dark-gradient tokens; `PortalTopbar` (no search/command); `PortalFooter`; `PortalAccountMenu` in sidebar footer.

### Current mobile

- Header/drawer: full `NAV` via `PortalMobileNav`.
- Bottom bar (icon-only, `aria-label` only): Dashboard `/client`, Cases `/client/cases`, Messages `/client/messages`, Profile `/client/profile`.
- Visible text labels on bottom bar: **NO**.

### Target desktop (locked)

Primary: Home, My Matters, Documents, Messages, Appointments  
Secondary: Identity Verification, Sign Documents, Notifications, Profile  
Contextual (not permanent sidebar): Hearings → My Matters; Checklist → My Matters

### Target mobile (locked)

Home, Matters, Documents, Messages, More — with visible text labels.

### Verified differences (no implementation)

1. Labels: Dashboard vs Home; My Cases vs My Matters; Identity (KYC) vs Identity Verification; E-Signatures vs Sign Documents; Book Appointment vs Appointments; Profile & Settings vs Profile.
2. Hearings and Checklist are permanent desktop sidebar items.
3. `/client/hearings` does not highlight My Matters.
4. Mobile bottom bar set and icon-only presentation differ from locked target.
5. Footer includes “256-bit AES Encrypted”, “All Systems Operational”, keyboard Command Center hints (Staff-oriented chrome on Client).

---

## 10. REFERENCE CONFLICT MATRIX

Only verified items. Visual pixel conflicts are **not** listed because references were not extracted.

| ID | Source-of-Truth requirement | Current repository evidence | Reference evidence | Affected files | Why it matters | CUI-01 can safely proceed? |
| --- | --- | --- | --- | --- | --- | --- |
| C00-SOT-MISSING | Controlling DOCX must be readable from the repo | Files absent on `origin/main` | n/a | `doc/ui-reference/client/*` | Future sessions cannot freeze visuals | **NO** until DOCX is placed |
| C00-NAV-HEARINGS | `/client/hearings` belongs to My Matters | Sidebar item Hearings; `useIsActive("/client/hearings")` true on that route | not extracted | `src/app/(client)/layout.tsx` | Active-state / IA vs locked nav | Yes for fixture work; not a fixture blocker |
| C00-NAV-CHECKLIST | Checklist is contextual Matter journey, not a permanent sidebar item | Permanent `NAV` entry `/client/checklist` | not extracted | `layout.tsx` | Same | Yes for fixture work |
| C00-NAV-LABELS | Locked visible names Home / My Matters / Appointments / etc. | Dashboard / My Cases / Book Appointment / KYC / E-Signatures / Profile & Settings | not extracted | `layout.tsx`, client views, i18n keys | Vocabulary freeze | Yes for fixture work |
| C00-MOBILE-NAV | Home, Matters, Documents, Messages, More with visible labels | Icon-only Dashboard, Cases, Messages, Profile | not extracted | `layout.tsx` `bottomNav` | Mobile IA | Yes for fixture work |
| C00-NOTIF-PREFS | Preference switches only if persistence exists | No toggles in `ClientNotificationsPage`; notifications API is list + mark-read only | not extracted | `ClientNotificationsPage.tsx`, `src/app/api/v1/notifications/route.ts` | Must not fake switches later | Yes |
| C00-KYC-COPY | KYC screenshot/copy is not regulatory authority | Page copy includes “Nepal AML / Bar compliance” | not extracted | `ClientKYCOnboarding.tsx` | Do not invent extra compliance requirements from copy | Yes |
| C00-BOOKING-HOOK | Client screens should use Client DTOs unless a verified exception exists | `ClientBookingPage` and `ClientProfileExtras` use `useCases` | n/a | those views; documented in `cases-r7-client.test.ts` | Staff DTO fields (`assignedLawyerId`) | Yes; do not silently switch hooks |
| C00-FIXTURE-GAP | All 12 screens need coherent populated data through real APIs | Seed covers 1 matter, 1 task, 3 docs; not messages/hearings/appointments/KYC/signatures/notifications | n/a | `scripts/e2e/seed-e2e-client-portal.ts` | This is the CUI-01 job | CUI-01 is the response; do not start it in CUI-00 |
| C00-SHARED-PROFILE | Client styling must not globally alter Staff/Admin profile | `SharedProfilePage` is one component for all three variants | not extracted | `SharedProfilePage.tsx` | Staff/Admin drift | Yes for fixtures; later UI must be scoped |
| C00-SHARED-CHAT | Existing `MatterChatPanel` remains the engine | Client messages imports it `mode="client"` | not extracted | `ClientMessagesPage.tsx`, `MatterChatPanel.tsx` | No second chat system | Yes |

Unresolved visual conflicts (white sidebar on Matter Details / Checklist, Home master-shell deltas): **cannot be verified** until JPEG freeze.

---

## 11. BASELINE SCREENSHOTS

Capture status: **BLOCKED**

Why:

- No `.env` / `.env.local`
- No `node_modules` (Next not installed)
- No `/tmp/cursor/start-user` app process
- No evidence MySQL/local infra is running
- Standing up a full stack would require dependency and environment changes outside CUI-00 allowed files

| Route | 1440 | 1024 | 390 | Notes |
| --- | --- | --- | --- | --- |
| `/client` | BLOCKED | BLOCKED | BLOCKED | Runtime not available |
| `/client/cases` | BLOCKED | BLOCKED | BLOCKED | |
| `/client/cases/:id` | BLOCKED | BLOCKED | BLOCKED | Also not in e2e static list |
| `/client/hearings` | BLOCKED | BLOCKED | BLOCKED | Fixture would be empty even if app ran |
| `/client/checklist` | BLOCKED | BLOCKED | BLOCKED | Partial fixture (1 task) |
| `/client/documents` | BLOCKED | BLOCKED | BLOCKED | Partial fixture (3 PDFs) |
| `/client/messages` | BLOCKED | BLOCKED | BLOCKED | BASELINE NOT POPULATED — FIXTURE GAP |
| `/client/booking` | BLOCKED | BLOCKED | BLOCKED | BASELINE NOT POPULATED — FIXTURE GAP |
| `/client/kyc` | BLOCKED | BLOCKED | BLOCKED | BASELINE NOT POPULATED — FIXTURE GAP |
| `/client/signatures` | BLOCKED | BLOCKED | BLOCKED | BASELINE NOT POPULATED — FIXTURE GAP |
| `/client/notifications` | BLOCKED | BLOCKED | BLOCKED | BASELINE NOT POPULATED — FIXTURE GAP |
| `/client/profile` | BLOCKED | BLOCKED | BLOCKED | Auth + CRM name/phone only |

Do not manufacture frontend data to force screenshots.

---

## 12. STATE COVERAGE BASELINE

Legend: YES / NO / PARTIAL / NOT APPLICABLE

| Screen | Loading | Empty | Error | Populated | Partial | Disabled | Long-content | Mobile |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Home | YES | YES | PARTIAL (`useMyClient` error → unlinked empty) | YES | PARTIAL (section empties) | NOT APPLICABLE | PARTIAL | YES |
| My Matters | YES | YES | YES (`CaseQueryState`) | YES | YES (filter no-match) | NOT APPLICABLE | PARTIAL (pagination) | YES (`CASE_LIST_HERO_CLASS`) |
| Matter Details | YES | YES (per tab) | YES (`CaseQueryState`) | YES | YES (tab skeletons) | NOT APPLICABLE | PARTIAL | YES (`CASE_DETAIL_TABS_LIST_CLASS`) |
| Hearings | YES | YES | NO | YES | PARTIAL (hearings undefined skeleton) | NOT APPLICABLE | PARTIAL (pagination) | YES |
| Checklist | YES | YES | NO | YES | PARTIAL | NOT APPLICABLE | PARTIAL | YES |
| Documents | YES | YES | PARTIAL (toasts only) | YES | PARTIAL | YES (upload needs matter) | PARTIAL (pagination) | YES |
| Messages | YES | YES | PARTIAL (send toast) | YES | PARTIAL | NOT APPLICABLE | PARTIAL | YES (list/chat split) |
| Appointments | YES | YES | PARTIAL (book toast) | YES | PARTIAL (slots skeleton) | PARTIAL (no slots) | PARTIAL | YES |
| Identity Verification | YES | YES | PARTIAL (toasts) | YES | PARTIAL | PARTIAL (wizard steps) | PARTIAL | YES |
| Sign Documents | YES | YES | PARTIAL (toasts) | YES | PARTIAL | YES (OTP gate) | PARTIAL | YES (dialog/canvas) |
| Notifications | PARTIAL (`!currentUser` loading includes null) | YES | PARTIAL (mark-all toast; mark-one swallowed) | YES | NO category empty | NOT APPLICABLE | PARTIAL (`break-words`) | YES |
| Profile | YES | PARTIAL (not signed in; empty audit) | PARTIAL (toasts) | YES | PARTIAL | PARTIAL (2FA disable if required) | PARTIAL | YES (tab scroll) |

This is the CUI-17 starting inventory, not an implementation.

---

## 13. DESIGN-SYSTEM BASELINE

Tokens: `.dashboard-theme.dashboard-client` in `src/index.css` (primary `#3157d5`, sidebar `#1e3a6e` / `#0f2040`, width `15rem`, hero navy→teal). CMS `PortalBrandingProvider` can override primary/focus/hero.

Hard-coded styling:

- Signature canvas `strokeStyle = "#1a1a2e"` in `ClientSignaturesPage.tsx`
- Footer emerald / `#10b981` in `portal-footer.tsx`
- Layout sidebar gradient uses CSS variables (token-based, not raw hex)

Shared coupling: `PortalPageShell`, sidebar/topbar/footer/mobile nav, dashboard primitives/tables/status labels, `MatterChatPanel`, `SharedProfilePage`, shadcn Input/Dialog/Tabs/Pagination (also public site).

Client-specific styling: `dashboard-client` token block; layout sidebar classNames; `NepalDecoratedHero` when `decorated`; client footer copy; client topbar omits search/command.

`tests/unit/dashboard-contrast.test.ts` guards `ClientDashboard.tsx` and client layout against raw Tailwind palette classes.

No design changes in CUI-00.

---

## 14. PROTECTED DIRTY-WORK ASSESSMENT

On this clone all six files are **unstaged-clean and identical to HEAD**. They were not reset, reverted, formatted, or edited.

| File | Diff status | Classification | Relevance | Future risk | Protection requirement |
| --- | --- | --- | --- | --- | --- |
| `src/components/cases/cases-workspace.tsx` | clean / HEAD | Staff/Admin (not imported by Client) | Staff/Admin case list workspace | High if Client work “unifies” with Client list | Do not modify during Client UI; owner may have unpushed local edits elsewhere |
| `src/shared/contracts/case-ui.ts` | clean / HEAD | contract/schema, **shared Client/Staff** | Labels, hero/tab classes, filters used by `ClientCasesPage` + `ClientCaseDetailPage` + Staff | High shared blast | Treat as protected shared contract; Client vocabulary changes must not break Staff lifecycle labels |
| `src/views/client/ClientCaseDetailPage.tsx` | clean / HEAD | Client-only | Matter Details owner view | Direct CUI-07 target | Preserve all current functions; owner may have unpushed local edits |
| `src/views/client/ClientCasesPage.tsx` | clean / HEAD | Client-only | My Matters owner view | Direct CUI-06 target | Same |
| `src/views/staff/StaffCaseDetailPage.tsx` | clean / HEAD | Staff-only | Staff matter detail | Indirect via `case-ui` and case components | Out of scope until Client freeze |
| `tests/unit/cases-r9-a11y.test.ts` | clean / HEAD | test | Static a11y/hero/query-state contract for Case UI | Will fail if Client heroes/tabs change without updating tests | Do not “clean up” as part of Client cosmetics |

If the owner’s local machine still has dirty diffs, those diffs are **not in this cloud clone**. Reconcile before CUI-06/CUI-07.

---

## 15. STAFF/ADMIN IMPACT RISKS

Verified shared-component risks only:

1. Editing `PortalPageShell`, `PortalSidebar`, `PortalTopbar`, `PortalMobileNav`, or dashboard primitives will change Staff and Admin immediately.
2. Editing `SharedProfilePage` / MFA / session panels will change Staff and Admin profile.
3. Editing `MatterChatPanel` or `LuxuryChat*` will change Staff messaging.
4. Editing `case-ui.ts` hero/tab/filter helpers will change Staff case list/detail density.
5. Editing shadcn `ui/input`, `ui/dialog`, `ui/tabs`, `ui/pagination` will also hit the public site.
6. `CasesWorkspace` is Staff/Admin-only today; merging Client into it would be a Staff/Admin change and is out of scope.

Safe later strategy (not implemented): Client token overrides, layout-owned nav, Client wrappers, do not globally restyle.

---

## 16. SKIPPED ITEMS

| Item | Status | Reason |
| --- | --- | --- |
| Read DOCX in full | BLOCKED | File missing from this clone |
| Read Markdown companion in full | BLOCKED | File missing |
| Verify DOCX SHA-256 | BLOCKED | File missing |
| Lossless JPEG extract 12/12 | BLOCKED | No DOCX `word/media` |
| Open/dimension/hash extracted images | BLOCKED | Not extracted |
| Pixel comparison vs current UI | BLOCKED | No references + no runtime screenshots |
| Baseline screenshots 12 × 3 viewports | BLOCKED | No local app/runtime |
| Inspect owner dirty diffs | SKIPPED on this clone | Working tree clean; files match HEAD |

No other CUI-00 audit items were skipped by choice.

---

## 17. CUI-00 EXIT GATE

| Gate | Result |
| --- | --- |
| Reference pack complete | **FAIL** |
| Preservation matrix complete | **PASS** (repository-backed) |
| All 12 routes accounted for | **PASS** |
| Fixture gaps identified | **PASS** |
| No UI redesign performed | **PASS** |
| Protected dirty work untouched | **PASS** |

Overall CUI-00: **BLOCKED / FAIL** until the owner-approved DOCX is in-tree and the 12 JPEGs are losslessly frozen.

---

## 18. CUI-01 PREREQUISITES

Do **not** start CUI-01 until CUI-00 reference freeze is unblocked. When unblocked, CUI-01 must (repository-backed only):

1. Confirm the DOCX is present and SHA-256 still `53601050E81EC297DF4D83A31B05B3732D0D9E22291C547CD2BAB3D4D81FD55B`.
2. Confirm 12 lossless JPEGs exist under `doc/ui-reference/client/references/` with recorded hashes.
3. Extend the **existing** fixture family (`scripts/e2e/seed-e2e-client-portal.ts` / `e2e:seed:portal`), not a new frontend data layer.
4. Keep current smoke identity `client@srimarlaw.com.np` / Sarita Ray stable; add or parameterize a UI-preview fixture so screenshot calibration does not break unrelated E2E.
5. Seed through real path: fixture → local MySQL → existing API routes → existing Client query hooks.
6. Cover fixture gaps: multiple matters; hearings; checklist state variety; richer documents; messages; appointments; KYC states; envelopes; notifications; profile fields that **already exist**.
7. Remain idempotent.
8. Do not hard-code screenshot arrays in React pages.
9. Do not revive the removed Convex mock provider.
10. Do not modify Staff/Admin UI, authorization, tenancy, or database architecture for visual reasons.

STOP. Do not start CUI-01 in this phase.
