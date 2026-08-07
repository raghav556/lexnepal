# Audit — Admin CRM (`/admin/crm`) & related CRM surfaces

**Scope:** `http://localhost:3001/admin/crm` — lead pipeline UI, plus every related route/API/schema surface that must map without duplication.  
**Date:** 2026-08-07  
**Probed live:** `GET http://127.0.0.1:3001/admin/crm` → **200** (admin portal).  
**Standard:** Advanced SaaS CRM for a Nepal law firm — **localhost first**, then production-ready.  
**Rules:** No skip, no drift, no second CRM product, no merging Clients / Appointments / Matters into this page. One writer per concern; reuse `/api/v1/leads/*`, `/api/v1/appointments/*`, `CrmService` / `CrmRepository`.  
**Related:** Migration slice [`PHASE_8_6_CRM.md`](./PHASE_8_6_CRM.md) (`complete_local` for Convex→Next authority only — **not** corporate-grade product completion).  
**Sibling audits:** [`AUDIT_ADMIN_CLIENTS.md`](./AUDIT_ADMIN_CLIENTS.md) (client directory), [`AUDIT_ADMIN_USERS.md`](./AUDIT_ADMIN_USERS.md), [`AUDIT_ADMIN_HR.md`](./AUDIT_ADMIN_HR.md), [`AUDIT_ADMIN_APPOINTMENTS.md`](./AUDIT_ADMIN_APPOINTMENTS.md) (calendar / consultation ops).

---

## 1. Honest verdict

`/admin/crm` is a **real, wired admin lead pipeline** on Next.js + PostgreSQL (not a stub). It can list leads, show status KPIs, switch kanban/list, open a details drawer, change status/assignee/notes, generate intake links, and convert a lead into a `clients` row.

It is **not** advanced SaaS CRM because:

1. **Leads-only console** — no appointments, tasks, activity timeline, or post-convert matter workflow on this page (appointments live elsewhere; that split is correct, but **bridging is missing**).
2. **Ops UX is thin** — client-side search only; no status/source/assignee/date filters that hit the API; no manual “Add lead”; no CSV export; no stage aging; kanban has no drag-and-drop (status via selects only).
3. **Convert is incomplete as a handoff** — creates a client + sets `convertedClientId`, then stays on CRM with no deep-link to `/admin/clients`, no portal/KYC next step, no matter open.
4. **Staff assignees are locked out of the UI** — API allows any staff to list/update leads, but `/admin/crm` is **admin-portal-only** (`PortalRoleGuard: admin`). Partners/associates with `clients.manage` have **no** `/staff/crm` (or equivalent) for their assigned leads.
5. **Governance gaps** — list does not soft-delete-filter; no dedicated `crm.manage` (convert/assign lawyer use `clients.manage`); new public leads do not notify staff; no Playwright CRM E2E.
6. **Client adapter bug risk** — `useLeadCommands().createLead` always POSTs to `/api/v1/public/leads` (website path). Staff create API `POST /api/v1/leads` exists but is unused by admin UI.

**Authority migration vs product:** `PHASE_8_6_CRM.md` = Convex→Next **complete_local**. This audit = **product upgrade phases CRM-0…CRM-6**.

---

## 2. Surface & route map (canonical — do not invent duplicates)

```text
Admin Console (PortalRoleGuard: admin only)
  ├── /admin/crm              → AdminCRMPage          ← THIS AUDIT (leads pipeline)
  ├── /admin/appointments     → AdminAppointmentsPage ← KEEP SEPARATE (calendar/ops)
  ├── /admin/clients          → StaffClientsPage      ← KEEP SEPARATE (client directory)
  ├── /admin/conflict-checker → hits leads + appointments; href → /admin/crm | /admin/appointments
  └── /admin/analytics        → firm analytics        ← do NOT re-build funnel charts inside CRM

Staff Console
  ├── /staff/appointments     → StaffAppointmentsPage (assigned lawyer filter)
  ├── /staff/clients          → shared clients directory
  └── /staff/crm              → MISSING (assignees cannot work leads in UI)

Client portal
  └── /client/booking         → bookConsultation + list own appointments

Public
  ├── Contact / Resources / Chatbot → POST /api/v1/public/leads
  ├── Public appointments     → POST /api/v1/public/appointments
  └── /intake/[token]          → intake form (public)

APIs (single CrmService — no /api/crm namespace)
  ├── /api/v1/leads[+/:id, /convert, /intake-link]
  ├── /api/v1/public/leads[+ /intake/:token]
  ├── /api/v1/appointments[+ slots, book, :id/status|assign|reschedule]
  └── /api/v1/public/appointments
```

### Ownership table (anti-duplication)

| Concern | Canonical owner | Linked from CRM? | Forbidden |
| --- | --- | --- | --- |
| Lead pipeline (status, assign, notes, intake, convert) | `/admin/crm` + `/api/v1/leads` | — | Second leads UI under Clients |
| Client master data / KYC / portal | `/admin/clients` + `/api/v1/clients` | After convert → deep-link **required** | Editing full client profile inside CRM |
| Appointment calendar / slots / meeting links | `/admin/appointments` (+ staff/client booking) | Schedule from lead → create appt + set `consultation_scheduled` | Rebuilding full calendar inside `/admin/crm` |
| Matters / cases | Staff cases | Optional “open matter” **after** client exists | Creating matters only inside CRM without clients |
| Conflict search | `/admin/conflict-checker` | Already links to CRM | Duplicate conflict engine in CRM |
| Public lead capture | Contact, Resources, Chatbot | Feeds pipeline | Admin CRM posting to public endpoint for staff creates |
| Firm analytics | `/admin/analytics` | Optional KPI deep-links later | Copying Advanced Analytics widgets into CRM |
| Careers / job applications | CMS | Out of scope | Treating recruiting as CRM leads |

---

## 3. What `/admin/crm` does today (inspected)

| Capability | Status | Notes |
| --- | --- | --- |
| List all firm leads | Wired | `useLeads({})` → `GET /api/v1/leads`; no pagination server-side |
| Status KPI chips | Wired | Client-side counts per status |
| Kanban by status | Wired | Columns; no drag-drop |
| List view + client pagination | Wired | 10/page via `usePagination` |
| Search name/email/phone | Wired | Client-side only |
| Details drawer | Wired | Source, practice area, message, status, assignee, notes |
| Update status / assignee / notes | Wired | `PATCH /api/v1/leads/:id` |
| Generate / copy intake link | Wired | `POST .../intake-link` → `/intake/{token}` |
| Convert to client | Wired | Modal type + company → `POST .../convert` |
| Manual create lead | **Missing in UI** | API `POST /api/v1/leads` exists |
| Filter by status/source/assignee | **Missing in UI** | API supports `status`, `assignedTo` only |
| Open converted client | **Missing** | `convertedClientId` in schema; UI ignores |
| Schedule consult from lead | Wired | Drawer → create appt + `leadId` + status `consultation_scheduled` → `/admin/appointments` |
| Appointments tab | **Intentionally elsewhere** | `/admin/appointments` |
| Export CSV | Missing | |
| Activity / follow-ups | Missing | Notes blob only |
| Notifications on new lead / assign | Wired | In-app + email queue (CRM-4) |
| Soft-delete / archive | Missing | `listLeads` does not filter `deletedAt` |
| E2E | Wired | `tests/e2e/admin-crm.spec.ts`, `tests/e2e/staff-crm.spec.ts` |

---

## 4. Backend inventory (facts)

### Schema (`db/schema.ts`)

**`leads`:** fullName, email, phone, source enum, practiceAreaInterest, message, status enum, assignedTo, convertedClientId, notes, intakeToken, intakeSubmitted, lifecycle (`deletedAt`).

**Statuses:** `new` → `contacted` → `consultation_scheduled` → `converted` | `lost`.

**Sources:** `website` | `referral` | `walk_in` | `phone` | `social` | `newsletter`.

**`appointments`:** clientName/email/phone, optional `clientId`, optional `leadId` FK → `leads`, practiceArea, date, timeSlot, notes, status, assignedLawyerId, meetingLink.

### Authz (`CrmService`)

| Action | Gate |
| --- | --- |
| list/create/update leads, intake link | Staff (not client) |
| convert lead; assign lawyer on appointment | `clients.manage` |
| list appointments | Staff; clients may list (portal booking) |
| public lead/appointment create | `PUBLIC_FIRM_SLUG` firm |

Portal: `/admin/crm` = **admin role only**, so partners with `clients.manage` cannot use this page even when API allows convert.

### Audit actions present

`lead.created`, `lead.updated`, `lead.converted`, `lead.intake_link`, appointment create/status/assign/reschedule. Public creates may omit actor audit.

### Verify

`npm run crm:verify-local` — migration reconcile + list/slots/public create. **Does not** prove admin UI, convert deep-link, or notifications.

---

## 5. Gap analysis vs advanced SaaS CRM (law-firm)

Prioritized for LexNepal (reuse existing domains; no Salesforce clone).

### P0 — correctness & handoff

| Gap | Why it matters | Where to fix |
| --- | --- | --- |
| No post-convert navigation | Ops lose the new client | `AdminCRMPage` → toast + `Link`/`router.push` `/admin/clients` (open drawer if supported) using `clientId` from convert response |
| Converted lead shows no client link | `convertedClientId` unused in UI | Details drawer for `status=converted` |
| Staff createLead adapter → public API | Wrong firm/audit path if used | `src/client/queries/crm.ts`: staff create → `POST /api/v1/leads`; keep public for Contact/Chatbot |
| Soft-delete not filtered on list | Deleted rows can reappear | `CrmRepository.listLeads` / `listAppointments` → `isNull(deletedAt)` |
| Admin-only CRM vs staff assignees | Assigned associate cannot work pipeline in product UI | Either `/staff/crm` (self-scoped) **or** allow partner on admin CRM later — pick one, no duplicate pages |

### P1 — ops console polish (same page)

| Gap | Where |
| --- | --- |
| Add lead (walk-in / phone) form | `/admin/crm` modal → `POST /api/v1/leads` |
| Filters: status, source, assignee (+ search) | UI + extend `leadListSchema` for `source` / `q` if needed |
| CSV export of filtered set | Client export like Clients/HR |
| Stage aging (“days in status”) | Derive from `updatedAt`/`createdAt` in UI (no new table first) |
| Confirm dialogs on convert / mark lost | Reuse `ConfirmDialog` |
| KPI chips as filter toggles | Click chip → filter status |

### P2 — CRM ↔ Appointments bridge (no calendar fork)

| Gap | Where |
| --- | --- |
| “Schedule consultation” from lead drawer | Create appointment via existing `useAppointmentCommands` with lead name/phone/email; set lead status `consultation_scheduled`; deep-link `/admin/appointments` |
| Optional schema `appointments.leadId` | Migration only if hard link required; until then store `leadId` in appointment notes or add FK in a dedicated phase |
| Related appointments list on lead | `GET /api/v1/appointments` filtered client-side by phone/email **or** by `leadId` after FK |

### P3 — engagement & governance

| Gap | Where |
| --- | --- |
| Notify `clients.manage` (or assignee) on public lead create | Wired | `crm-notifications` + email job |
| Notify assignee on assign | Wired | `updateLead` → `notifyLeadAssigned` |
| Intake submitted → notify assignee | Wired | `submitIntake` → `notifyIntakeSubmitted` |
| Activity log (status changes) | Prefer audit log query scoped to `resource=leads` in drawer before inventing `lead_activities` table |
| Dedup warning same email/phone | Soft check on create/convert — warn, don’t block first |

### P4 — product completeness

| Gap | Where |
| --- | --- |
| Server-side pagination / sort | Contracts + repo when volume grows |
| Lost reason / win reason | Optional field on lead or notes convention |
| Funnel metrics | Small widgets on CRM **or** deep-link Analytics — not a third dashboard |
| Playwright admin CRM E2E | Wired | `tests/e2e/admin-crm.spec.ts` (+ staff) |
| Capability `crm.manage` | Only if product wants CRM ≠ clients manage; default keep `clients.manage` to avoid role matrix sprawl |

### Explicitly out of scope (anti-drift)

- Merging `/admin/appointments` into `/admin/crm` as one mega-page.
- Building marketing automation / email campaigns inside CRM.
- ATS / careers (CMS).
- Replacing Clients KYC/portal flows.
- Multi-firm CRM (product is single-firm SaaS).

---

## 6. Deep-link & routing matrix (implement these, don’t invent new hubs)

| From | To | Purpose |
| --- | --- | --- |
| `/admin/crm` convert success | `/admin/clients` (+ highlight/open client) | Handoff |
| `/admin/crm` lead drawer | `/admin/appointments` (optional `?q=` / new booked id) | After schedule |
| `/admin/crm` converted | `/admin/clients` via `convertedClientId` | Always |
| `/admin/clients` drawer | `/admin/crm` | Already: “CRM pipeline” |
| `/admin/conflict-checker` lead hit | `/admin/crm` | Already |
| `/admin/conflict-checker` appt hit | `/admin/appointments` | Already |
| Public Contact/Chatbot | leads appear on `/admin/crm` | Already (data path) |
| Intake complete | lead updates; notify → CRM | Gap (notify) |
| Staff assignee (future `/staff/crm`) | own leads only | Mirror HR staff scoping |

---

## 7. Phase plan (execute in order — no skipping)

### Phase CRM-0 — Baseline freeze (½ day) — **DONE 2026-08-07**

1. Run `npm run crm:verify-local` on localhost; record PASS/FAIL.  
2. Freeze ownership map in this doc (leads ≠ clients ≠ appointments).  
3. Screenshot / note current AdminCRMPage behaviors.

**Exit:** Verify green; scope frozen.

#### CRM-0 execution record

| Check | Result |
| --- | --- |
| `crm:verify-local` | **PASS** (`ok: true`, reconcile leads/appointments 2/2, API list + public/staff create) |
| Auth boundary | PASS (prerequisite) |
| Identity + matters migrate | PASS (prerequisites for CRM fixture firm) |
| Live route | `http://127.0.0.1:3001/admin/crm` reachable (200) |
| Scope freeze | Leads → `/admin/crm`; clients → `/admin/clients`; appointments → `/admin/appointments` (+ staff/client booking). No merge, no second CRM API. |
| Baseline UI (AdminCRMPage) | Kanban + list, status KPIs, search, drawer (status/assignee/notes), intake link, convert modal. No add-lead, API filters UI, export, convert deep-link, or appointment bridge. |

**Frozen for CRM-1+:** Reuse `CrmService` / `CrmRepository` / `/api/v1/leads*` + existing appointment routes only.

---

### Phase CRM-1 — Correctness & authz hardening (1 day) — **P0** — **DONE 2026-08-07**

1. Soft-delete filters on lead/appointment lists.  
2. Fix staff `createLead` client mutation to use `POST /api/v1/leads` (public path only for website/chatbot).  
3. Convert response → navigate / deep-link to `/admin/clients`; show `convertedClientId` on converted leads.  
4. Confirm dialogs for convert + mark lost.  
5. Extend `crm:verify-local` for convert + soft-delete hide.

**Exit:** Convert handoff works; lists ignore deleted; staff create path correct.

#### CRM-1 execution record

| Check | Result |
| --- | --- |
| Soft-delete | `listLeads` / `listAppointments` / slots + mutations gate on `isNull(deletedAt)` |
| createLead | Staff → `POST /api/v1/leads`; public Contact/Resources/Chatbot → `createPublicLead` |
| Convert handoff | UI → `/admin/clients?client=<id>`; Clients drawer opens via search param |
| Converted drawer link | “Open in Clients” when `convertedClientId` set |
| Confirms | Mark lost + convert use `ConfirmDialog` |
| `crm:verify-local` | **PASS** (`softDeletedHidden`, `convertHandoffClientId`) |

**Code:** `crm-repository.ts`, `client/queries/crm.ts`, `AdminCRMPage.tsx`, `StaffClientsPage.tsx`, public/chatbot callers, `scripts/crm/verify-local.ts`.

---

### Phase CRM-2 — Admin CRM ops polish (1–2 days) — **DONE 2026-08-07**

1. **Add lead** modal (source, contact, practice area, assignee).  
2. Filters: status, source, assignee + search; KPI chips toggle status filter.  
3. Prefer API filters where schemas already allow (`status`, `assignedTo`); add `source`/`q` only if needed.  
4. CSV export of filtered leads.  
5. Stage aging badge (days since `updatedAt`).  
6. Table density option optional; keep kanban + list.

**Exit:** Ops can create, filter, export without leaving the page for basic pipeline work.

#### CRM-2 execution record

| Check | Result |
| --- | --- |
| Add lead | Modal → `POST /api/v1/leads` (staff path) |
| Filters | API `status` / `source` / `assignedTo` / `q`; UI selects + debounced search |
| KPI chips | Toggle status filter; counts from KPI query (ignores status) |
| Export | CSV of current filtered set |
| Aging | `Nd in stage` from `updatedAt` |
| Contracts | `leadListSchema` + `source`/`q` |
| `crm:verify-local` | **PASS** (`listFiltersOk`) |

**Code:** `shared/contracts/crm.ts`, `crm-repository.ts`, `client/queries/crm.ts`, `AdminCRMPage.tsx`.

---

### Phase CRM-3 — Lead ↔ appointment bridge (1–2 days) — **DONE 2026-08-07**

1. Lead drawer action **Schedule consultation** → existing appointment create API + set lead `consultation_scheduled`.  
2. Deep-link to `/admin/appointments`.  
3. Migration `appointments.leadId` FK (preferred) — applied.  
4. Show related appointments on lead drawer (read-only list via `?leadId=`).  
5. Do **not** embed full calendar UI on `/admin/crm`.

**Exit:** Consultation stage is backed by a real appointment row.

#### CRM-3 execution record

| Check | Result |
| --- | --- |
| Schema | `appointments.lead_id` → `leads.id` ON DELETE SET NULL; `appointments_firm_lead_idx` |
| Migration | `drizzle/0014_appointment_lead_id.sql` applied + journal recorded |
| Create | `POST /api/v1/appointments` accepts `leadId`; validates lead; sets status `consultation_scheduled` (skips converted/lost) |
| List | `GET /api/v1/appointments?leadId=` filters related rows |
| Admin UI | Schedule consultation modal → create + toast + push `/admin/appointments`; drawer Consultations list |
| Ownership | Calendar stays on `/admin/appointments` — no calendar fork in CRM |
| `crm:verify-local` | **PASS** (`scheduleFromLeadOk`, `appointmentLeadId`) |

**Code:** `db/schema.ts`, `drizzle/0014_*`, `shared/contracts/crm.ts`, `crm-repository.ts`, `shared/crm/appointment-slots.ts`, `client/queries/crm.ts`, `AdminCRMPage.tsx`, `scripts/crm/verify-local.ts`.

---

### Phase CRM-4 — Notifications & intake signal (1 day) — **DONE 2026-08-07**

1. In-app (+ email queue) on public lead create → users with `clients.manage` (or assignee if set).  
2. Notify on assign change and intake submit.  
3. Reuse communication path / Mailpit locally; no Mailpit copy on production hosts ([`PHASE_AUTH_7_PRODUCTION.md`](./PHASE_AUTH_7_PRODUCTION.md)).

**Exit:** New website lead is visible in notification bell without refreshing CRM only by luck.

#### CRM-4 execution record

| Check | Result |
| --- | --- |
| Module | `src/server/services/crm-notifications.ts` (same pattern as HR-6) |
| Public lead | `createLeadPublic` → in-app + `communication.email` job to `clients.manage` (or assignee) |
| Assign | `updateLead` when `assignedTo` changes → notify new assignee (skips self-assign) |
| Intake | `submitIntake` → assignee if set, else `clients.manage` |
| Link | Notifications deep-link `/admin/crm` |
| `crm:verify-local` | **PASS** (`notificationsOk`: public create, assign, intake) |

**Code:** `crm-notifications.ts`, `crm-service.ts`, `crm-repository.ts` (`getLead`), `scripts/crm/verify-local.ts`.

---

### Phase CRM-5 — Staff assignee surface (1–2 days) — **DONE 2026-08-07**

1. Add `/staff/crm` — **one** implementation (reuse `AdminCRMPage` with `portal="staff"`).  
2. Non-managers: forced `assignedTo = self` (same pattern as HR list scoping via `clients.manage`).  
3. Convert still requires `clients.manage`.  
4. Nav: Staff → CRM (leads); keep Appointments separate.

**Exit:** Assigned associate can work their leads without admin portal.

#### CRM-5 execution record

| Check | Result |
| --- | --- |
| Route | `/staff/crm` → `StaffCRMPage` → `AdminCRMPage portal="staff"` |
| Nav | Staff → Client Relations → CRM |
| API scope | `listLeads` / create / update / intake-link force self when `!clients.manage` |
| Convert | Hidden in UI without cap; API still `403` without `clients.manage` |
| Deep-links | Staff portal → `/staff/clients`, `/staff/appointments` |
| Notify links | Admin → `/admin/crm`; other staff → `/staff/crm` |
| `crm:verify-local` | **PASS** (`staffAssigneeScopeOk`) |

**Code:** `crm-service.ts`, `crm-notifications.ts`, `AdminCRMPage.tsx`, `StaffCRMPage.tsx`, `(staff)/staff/crm/page.tsx`, `(staff)/layout.tsx`, `scripts/crm/verify-local.ts`.

---

### Phase CRM-6 — E2E + docs (1 day) — **DONE 2026-08-07**

1. Playwright `tests/e2e/admin-crm.spec.ts` (open CRM, filter/add).  
2. Update `PHASE_8_6_CRM.md` status: authority `complete_local` + product phases CRM-0…CRM-6 done.  
3. Document localhost demo path; cross-link Clients + Appointments ownership.  
4. Staff CRM Playwright (`tests/e2e/staff-crm.spec.ts`).

**Exit:** E2E green; docs match product.

#### CRM-6 execution record

| Check | Result |
| --- | --- |
| Admin E2E | `tests/e2e/admin-crm.spec.ts` — open `/admin/crm`, add lead, search |
| Staff E2E | `tests/e2e/staff-crm.spec.ts` — open `/staff/crm`, appointments stay separate |
| Docs | `PHASE_8_6_CRM.md` product phases CRM-0…CRM-6 + demo path + ownership freeze |
| Ownership | CRM = leads; Clients = master; Appointments = calendar |

**Code:** `tests/e2e/admin-crm.spec.ts`, `tests/e2e/staff-crm.spec.ts`, `PHASE_8_6_CRM.md`, this audit.

---

## 8. Suggested build order

```text
CRM-0 baseline verify
CRM-1 convert handoff + soft-delete + createLead fix   ← P0
CRM-2 admin polish (add/filter/export/aging)
CRM-3 lead → appointment bridge (no calendar fork)
CRM-4 notifications
CRM-5 staff assignee CRM
CRM-6 E2E + docs
```

Do **not** start CRM-3 calendar merge fantasies before CRM-1 handoff. Do **not** build a second clients module inside CRM.

---

## 9. File inventory (canonical — reuse these)

| Layer | Path |
| --- | --- |
| Admin CRM UI | `src/views/admin/AdminCRMPage.tsx` (`portal` admin\|staff) |
| Staff CRM UI | `src/views/staff/StaffCRMPage.tsx` → `/staff/crm` |
| Admin CRM route | `src/app/(admin)/admin/crm/page.tsx` |
| Admin appointments | `src/views/admin/AdminAppointmentsPage.tsx` → `/admin/appointments` |
| Staff appointments | `src/views/staff/StaffAppointmentsPage.tsx` → `/staff/appointments` |
| Clients directory | `src/views/staff/StaffClientsPage.tsx` (admin + staff) |
| Queries | `src/client/queries/crm.ts` |
| Contracts | `src/shared/contracts/crm.ts` |
| Service | `src/server/services/crm-service.ts` |
| Repository | `src/server/repositories/crm-repository.ts` |
| Routes | `src/app/api/v1/leads/**`, `appointments/**`, `public/leads/**`, `public/appointments/**` |
| Schema | `db/schema.ts` → `leads`, `appointments` |
| Intake page | `src/app/intake/[token]/page.tsx` |
| Verify | `scripts/crm/verify-local.ts` → `npm run crm:verify-local` |
| E2E | `tests/e2e/admin-crm.spec.ts`, `tests/e2e/staff-crm.spec.ts` |
| Migration note | `doc/migration/PHASE_8_6_CRM.md` |

---

## 10. Owner checkpoint

| Question | Answer |
| --- | --- |
| Is `/admin/crm` duplicated by `/admin/clients`? | **No** — Clients = client master; CRM = **pre-client leads** |
| Is `/admin/crm` duplicated by `/admin/appointments`? | **No** — Appointments = scheduling; CRM should **bridge**, not absorb |
| Is backend “complete_local”? | **Yes** for Convex→Next (`PHASE_8_6_CRM.md`) |
| Is product advanced SaaS CRM? | **No** — follow Phases CRM-1…CRM-6 |
| Biggest E2E hole? | Closed for CRM-0…CRM-6 scope (Playwright admin + staff CRM) |
| Risk of wrong work? | Merging calendar into CRM, or a second leads API — **forbidden** |

---

**Report status:** CRM-0…CRM-6 executed on localhost. Authority + product upgrade track closed for the audit scope.
