# Audit — Admin Appointments (`/admin/appointments`) & related scheduling surfaces

**Scope:** `http://localhost:3001/admin/appointments` — firm calendar / consultation ops, plus every related route/API/schema surface that must map **end-to-end** without duplication or drift.  
**Date:** 2026-08-07  
**Probed live:**  
- `GET http://127.0.0.1:3001/admin/appointments` → **200**  
- `GET http://127.0.0.1:3001/staff/appointments` → **200**  
- `GET http://127.0.0.1:3001/consultation` → **200**  
- `GET http://127.0.0.1:3001/client/booking` → **200**  
**Standard:** Advanced SaaS scheduling for a Nepal law firm — **localhost first**, production-ready patterns (no second calendar product, no merging into CRM).  
**Rules:** No skip, no drift, no duplicate appointments module, **do not merge calendar into `/admin/crm`**. One writer per concern; reuse `CrmService` / `CrmRepository` / `/api/v1/appointments*` / `/api/v1/public/appointments`.  
**Related authority:** [`PHASE_8_6_CRM.md`](./PHASE_8_6_CRM.md) (`complete_local` for Convex→Next leads+appointments APIs).  
**Sibling audits:** [`AUDIT_ADMIN_CRM.md`](./AUDIT_ADMIN_CRM.md) (leads bridge), [`AUDIT_ADMIN_CLIENTS.md`](./AUDIT_ADMIN_CLIENTS.md), [`AUDIT_ADMIN_HR.md`](./AUDIT_ADMIN_HR.md).

---

## 1. Honest verdict

`/admin/appointments` is a **real, wired admin scheduling console** on Next.js + PostgreSQL (not a stub). It lists appointments, filters by a few statuses, toggles list/calendar, books manually, assigns lawyers, confirms/cancels/completes, adds meeting links (via `window.prompt`), and reschedules.

It is **not** production-grade premium scheduling because:

1. **Slot canon is broken (drift)** — three different time-slot sets exist across admin book/reschedule UI, public `/consultation`, and the API (`DEFAULT_APPOINTMENT_SLOTS`). Double-booking and “slot not available” chaos are inevitable.
2. **Ops UX is incomplete** — no pagination, no search (`q`), no assignee/date range filters in UI (API already supports `status` / `assignedLawyerId` / `leadId`), no loading/error states, no ConfirmDialog on cancel, calendar is **current month only** (no prev/next), no deep-link highlight after CRM schedule.
3. **Cross-portal inconsistency** — public ConsultationPage does not call `/api/v1/appointments/slots`; admin create ignores availability; staff page fetches **all** appointments then filters client-side; client portal filters firm-wide list client-side (**privacy leak risk**).
4. **Settings are decorative** — `onlineBookingEnabled` and meeting-platform settings on Admin Settings are **not enforced** by public booking APIs.
5. **Comms are thin** — confirm may insert an in-app notification for the assigned lawyer; “email” on confirm is largely an audit stub, not the durable `communication.email` path used by CRM-4/HR-6.
6. **No appointments Playwright E2E** — only CRM E2E asserts appointments stay separate; no admin book/confirm/staff/client/public booking specs.
7. **CRM bridge is one-way incomplete** — CRM can create with `leadId` and push to `/admin/appointments`, but admin cards do not show/link `leadId` / `clientId`, and there is no `?appointment=` / `?q=` deep-link.

**Authority vs product:** API/migration authority for appointments lives under CRM phase docs (`complete_local`). This audit = **product upgrade phases APT-0…APT-6** for the calendar domain.

---

## 2. Ownership freeze (canonical — do not invent duplicates)

```text
Admin Console (PortalRoleGuard: admin)
  ├── /admin/appointments     → AdminAppointmentsPage   ← THIS AUDIT (firm calendar/ops)
  ├── /admin/crm              → AdminCRMPage            ← leads only; schedule bridges HERE
  ├── /admin/clients          → StaffClientsPage        ← client master (link if clientId)
  ├── /admin/conflict-checker → may hit appointments    ← deep-link to /admin/appointments
  └── /admin/settings         → toggles/integrations    ← must drive booking when claimed

Staff Console
  ├── /staff/appointments     → StaffAppointmentsPage   ← assignee self-service (scoped)
  └── /staff/crm              → StaffCRMPage            ← schedule → /staff/appointments

Client Portal
  └── /client/booking         → ClientBookingPage       ← own bookings only (+ bookConsultation)

Public Website
  ├── /consultation           → ConsultationPage        ← public createAppointment → public API
  ├── Lawyer profile CTA      → /consultation?lawyerId=
  ├── Home / practice / news  → link /consultation
  └── Chatbot                 → may deep-link /consultation

APIs (single backend — reuse only)
  ├── GET/POST  /api/v1/appointments
  ├── GET       /api/v1/appointments/slots
  ├── POST      /api/v1/appointments/book
  ├── PATCH     /api/v1/appointments/:id/status
  ├── POST      /api/v1/appointments/:id/assign
  ├── POST      /api/v1/appointments/:id/reschedule
  └── POST      /api/v1/public/appointments
```

| Concern | Owns | Bridge allowed | Forbidden |
| --- | --- | --- | --- |
| Firm calendar / status / assign / meeting links | `/admin/appointments` | From CRM schedule, conflict checker | Second calendar inside CRM |
| Assignee day-to-day consults | `/staff/appointments` | From staff CRM schedule | Staff rebuilding full firm calendar (unless `clients.manage`) |
| Portal client booking | `/client/booking` | Shows own rows only | Client seeing firm-wide appointments |
| Website intake booking | `/consultation` (+ public API) | Optional `lawyerId` | Hardcoded slots that ignore API availability |
| Leads pipeline | `/admin/crm` / `/staff/crm` | Create appt + `leadId` | Embedding calendar UI in CRM |

**Single backend:** `CrmRepository` + `CrmService` + contracts in `src/shared/contracts/crm.ts` + slots in `src/shared/crm/appointment-slots.ts`.

---

## 3. Surface inventory (facts)

### UI

| Route | View | Role |
| --- | --- | --- |
| `/admin/appointments` | `src/views/admin/AdminAppointmentsPage.tsx` | Firm list + month grid + book/assign/status/reschedule/meeting link |
| `/staff/appointments` | `src/views/staff/StaffAppointmentsPage.tsx` | “My Appointments”; client-side filter by `assignedLawyerId` |
| `/client/booking` | `src/views/client/ClientBookingPage.tsx` | Day picker + slots API + `bookConsultation`; lists “upcoming” |
| `/consultation` | `src/views/public/ConsultationPage.tsx` | Public booking form; hardcoded slots; optional `?lawyerId=` |

### Nav

| Portal | Link |
| --- | --- |
| Admin layout | Appointments → `/admin/appointments` |
| Staff layout | Appointments → `/staff/appointments` (under Client Relations) |
| Client layout | Book Appointment → `/client/booking` |
| Public shell / home / lawyers | Book → `/consultation` |

### Backend

| Layer | Path |
| --- | --- |
| Schema | `db/schema.ts` → `appointments` (`clientId`, `leadId`, `assignedLawyerId`, `meetingLink`, status enum, soft-delete) |
| Contracts | `appointmentListSchema`, `appointmentCreateSchema`, `appointmentSlotsSchema`, status/assign/reschedule |
| Slots constant | `DEFAULT_APPOINTMENT_SLOTS` = `10:00 AM`, `11:00 AM`, `01:30 PM`, `03:00 PM`, `04:30 PM` |
| Service | `CrmService.listAppointments` / create / book / status / assign / reschedule / slots |
| Verify | Covered inside `npm run crm:verify-local` (list/slots/public/staff create + `leadId`) — **not** a dedicated appointments UI verify |

### CRM bridge (already shipped in CRM-3)

- Schedule from lead → `POST /api/v1/appointments` with `leadId` → lead status `consultation_scheduled` → navigate to appointments path.
- Drawer lists related appts via `?leadId=`.
- **Gap:** admin appointments UI does not surface `leadId` / open CRM; no query deep-link to new row.

---

## 4. Gap analysis (prioritized)

### P0 — correctness / security / drift

| Gap | Why it matters | Where |
| --- | --- | --- |
| **Three slot catalogs** | Admin book/reschedule: `10:00 / 11:30 / 01:00 / 02:30 / 04:00`. Public consultation: `10:00 / 11:30 / 02:00 / 03:30`. API/CRM: `10:00 / 11:00 / 01:30 / 03:00 / 04:30`. | `AdminAppointmentsPage`, `ConsultationPage`, `appointment-slots.ts` |
| **Admin create ignores availability** | Can book a taken slot; no `useAvailableSlots` | `AdminAppointmentsPage` create + reschedule |
| **Client list privacy** | `listAppointments` returns firm rows for clients; UI filters by `clientId`/email. Any client can read other clients’ appointments via API. | `CrmService.listAppointments` + `ClientBookingPage` |
| **Staff over-fetch** | Staff loads all appointments then filters in browser | `StaffAppointmentsPage` — should pass `assignedLawyerId` (and API-force for non-managers) |
| **`onlineBookingEnabled` unused** | Settings claim to disable website booking; public API ignores it | `AdminSettingsPage` vs `createAppointmentPublic` |
| **Confirm “email” stub** | Audit `comms.email` without durable mail job | `CrmRepository.updateAppointmentStatus` |

### P1 — admin ops polish (same page)

| Gap | Where |
| --- | --- |
| No pagination | `AdminAppointmentsPage` renders full list |
| No search (name/phone/email) / date range / assignee filter UI | API filters incomplete for `q`/date; UI only status chips |
| Missing **Completed** filter chip | Status exists; UI has all/pending/confirmed/cancelled only |
| No loading / error empty states for query failure | `useAppointments({})` |
| Cancel without ConfirmDialog | Destructive status change |
| Meeting link via `window.prompt` | Not accessible / not mobile-friendly / no validation |
| Calendar: no month navigation; cells not clickable to open detail | Month grid is display-only |
| No KPI strip (today / pending / unassigned) | Ops needs at-a-glance |
| No export CSV | Ops/reporting |
| Create form uses raw `<select>` not shared slots + lawyer Select consistency | UX/a11y drift vs CRM |

### P2 — cross-portal alignment (no second product)

| Gap | Where |
| --- | --- |
| Public `/consultation` must use slots API (+ lawyerId in slots query) | `ConsultationPage` |
| Deep-link after CRM schedule: `?appointment=<id>` or `?q=` highlight | Admin (+ staff) appointments |
| Show `leadId` → link CRM; `clientId` → link Clients | Admin cards |
| Client booking success says “confirmed” while API creates **pending** | Copy mismatch / trust |
| Client `dateStr` via `toISOString().slice(0,10)` | UTC shift risk vs Asia/Kathmandu |
| Staff cancel / complete / reschedule missing | Staff page only confirm + meeting link |
| Paralegal/intern in assign dropdown? Admin filters partner/associate/senior only — OK if intentional; document | Admin lawyers filter |

### P3 — notifications & settings

| Gap | Where |
| --- | --- |
| Notify assignee on assign / public book / client book | Mirror CRM-4 pattern (`crm-notifications` or `appointment-notifications`) |
| Email on confirm/cancel/reschedule to client | `communication.email` job + Mailpit locally |
| Wire or remove meeting-platform / SMS appointment settings | `AdminSettingsPage` — no silent dead switches |
| Enforce `onlineBookingEnabled` on public create | Service gate |

### P4 — completeness / E2E / docs

| Gap | Where |
| --- | --- |
| Playwright admin appointments (book + confirm) | `tests/e2e/admin-appointments.spec.ts` |
| Playwright public consultation + client booking smoke | optional but recommended |
| Dedicated `appointments:verify-local` **or** extend `crm:verify-local` with slot-canon + client scope assertions | scripts |
| Product phases in this audit + cross-link `PHASE_8_6_CRM.md` | docs |

---

## 5. Data-flow map (intended end-to-end)

```text
Public /consultation
  → POST /api/v1/public/appointments  (pending)
  → Admin /admin/appointments (ops: assign → confirm → meeting link)
  → optional: notify clients.manage / assignee

CRM Schedule consultation
  → POST /api/v1/appointments { leadId }
  → lead.status = consultation_scheduled
  → navigate /admin|/staff/appointments (?appointment=…)

Client /client/booking
  → POST /api/v1/appointments/book { clientId }
  → pending (or policy: auto-confirm)
  → list ONLY own appointments

Staff /staff/appointments
  → GET /api/v1/appointments?assignedLawyerId=self
  → confirm / meeting link / (later) complete
```

**Seeding:** CRM fixtures seed appointments via `tests/fixtures/convex-crm-export` + `crm:verify-local`. E2E users via `npm run e2e:seed`. There is **no** dedicated appointments demo seed for empty calendars beyond CRM migrate.

---

## 6. What already works (do not rebuild)

- Soft-delete filters on list/slots/mutations (CRM-1).
- `leadId` FK + schedule-from-lead + list by lead (CRM-3).
- Staff/admin/public/client routes exist and resolve (200).
- Assign / status / reschedule / book APIs exist and are used by UI.
- CRM verify covers public + staff create + slots + lead bridge.
- Ownership split CRM ≠ Appointments ≠ Clients is correct — **keep it**.

---

## 7. Phase plan (execute in order)

### Phase APT-0 — Baseline freeze (≤0.5 day) — **DONE 2026-08-07**

1. Confirm live routes 200; record this audit as authority for product work.  
2. Freeze ownership map (section 2).  
3. Snapshot slot constants from all three UIs + `DEFAULT_APPOINTMENT_SLOTS`.  
4. Extend verify **or** note blockers before coding.

**Exit:** Written freeze; no new UI modules invented.

#### APT-0 execution record

| Check | Result |
| --- | --- |
| Live routes | `/admin/appointments` **200**, `/staff/appointments` **200**, `/consultation` **200**, `/client/booking` **200**, `/admin/crm` **200** |
| `crm:verify-local` | **PASS** (`ok: true`; appointments reconcile 2/2; `scheduleFromLeadOk`, soft-delete, notifications, staff lead scope) |
| Ownership freeze | Section 2 frozen — calendar ≠ CRM ≠ Clients; reuse `CrmService` / `/api/v1/appointments*` only |
| New modules | **None invented** |

#### Slot catalog snapshot (APT-0 inventory — drift confirmed)

| Source | Slots |
| --- | --- |
| **Canon (API)** `src/shared/crm/appointment-slots.ts` → `listAvailableSlots` / CRM schedule | `10:00 AM`, `11:00 AM`, `01:30 PM`, `03:00 PM`, `04:30 PM` |
| Admin book + reschedule (`AdminAppointmentsPage`) | `10:00 AM`, `11:30 AM`, `01:00 PM`, `02:30 PM`, `04:00 PM` |
| Public `/consultation` (`ConsultationPage`) | `10:00 AM`, `11:30 AM`, `02:00 PM`, `03:30 PM` |
| Client `/client/booking` | Uses `useAvailableSlots` → **aligned with canon** |
| CRM schedule modal | Uses `useAvailableSlots` → **aligned with canon** |

**Intersection with API canon:** only `10:00 AM` is shared across all three hardcoded catalogs. Admin and public offer slots the API never treats as bookable defaults; API offers slots admin/public UIs never show.

#### Blockers deferred to APT-1 (do not skip)

1. Unify all UIs on `DEFAULT_APPOINTMENT_SLOTS` + `useAvailableSlots` (admin create/reschedule + public consultation).  
2. Server-side client appointment scoping (privacy).  
3. Staff list `assignedLawyerId` API filter / self-scope.  
4. Honor or remove `onlineBookingEnabled`.  
5. Verify assertions for slot-canon match + client isolation.

---

### Phase APT-1 — Correctness & security (P0) (1–2 days) — **DONE 2026-08-07**

1. **Single slot source:** all UIs import `DEFAULT_APPOINTMENT_SLOTS` / `useAvailableSlots` only.  
2. Admin book + reschedule: load available slots for selected date (+ lawyer).  
3. Public `/consultation`: same slots API; respect `lawyerId` in availability.  
4. `CrmService.listAppointments`: clients **forced** to own `clientId` (and/or email match server-side); never return firm-wide.  
5. Staff list: pass `assignedLawyerId=self` for non-managers (mirror CRM-5); managers may see all if product decides — default **self on staff portal**.  
6. Gate public create on `onlineBookingEnabled` (or remove toggle from Settings).  
7. Extend `crm:verify-local` (or new script) for: slot list matches constant; client cannot list peer appointments.

**Exit:** No slot drift; client privacy fixed; public toggle honest.

#### APT-1 execution record

| Check | Result |
| --- | --- |
| Canon | Server rejects non-`DEFAULT_APPOINTMENT_SLOTS` on create/book/reschedule/public |
| Admin UI | Create + reschedule use `useAvailableSlots` (no hardcoded 11:30 catalog) |
| Public UI | `/consultation` uses slots API + `lawyerId` |
| Client UI | Lists via API-scoped `useAppointments({})` (no firm-wide fetch) |
| Client privacy | `listAppointments` for role=client forced to linked `clientId` (+ legacy email OR) |
| Staff scope | `!clients.manage` → force `assignedLawyerId=self`; staff page passes self filter |
| Booking toggle | `onlineBookingEnabled=false` → public create **503** |
| `crm:verify-local` | **PASS** (`appointmentSlotCanonOk`, `staffAppointmentScopeOk`, `onlineBookingToggleOk`) |

**Code:** `appointment-slots.ts` (canon), `crm-service.ts`, `crm-repository.ts`, `AdminAppointmentsPage.tsx`, `ConsultationPage.tsx`, `StaffAppointmentsPage.tsx`, `ClientBookingPage.tsx`, `scripts/crm/verify-local.ts`.

---

### Phase APT-2 — Admin appointments ops polish (1–2 days) — **DONE 2026-08-07**

1. Pagination (`usePagination`) + search (client then API `q` if needed).  
2. Filters: status (incl. completed), assignee, date from/to.  
3. Loading / error / empty states; ConfirmDialog on cancel.  
4. Meeting-link dialog (not `prompt`); validate URL.  
5. Calendar month prev/next; click day → filter list or open create prefilled.  
6. Deep-link `?appointment=<id>` highlight/scroll; show lead/client links when FKs set.  
7. KPI chips (pending today, unassigned, confirmed upcoming).  
8. CSV export of filtered set.  
9. Prefer shared UI primitives (Select) over raw selects.

**Exit:** Admin page usable for daily ops at firm volume without drowning.

#### APT-2 execution record

| Check | Result |
| --- | --- |
| Pagination | `usePagination` + shared `Pagination` (10/page) |
| Search / filters | Client search; status (incl. completed); assignee (+ unassigned); date from/to |
| Loading / error / empty | Spinner, error banner, empty + Book CTA |
| Cancel | `ConfirmDialog` (destructive) |
| Meeting link | Dialog + http(s) URL validate (no `window.prompt`) |
| Calendar | Month prev/next/Today; day click → list filter; `+` → create prefilled |
| Deep-link | `?appointment=<id>` highlight + scroll; CRM schedule pushes same query |
| FK links | Client → `/admin/clients?client=`; lead → `/admin/crm` |
| KPIs | Pending today / Unassigned / Confirmed upcoming (clickable chips) |
| Export | CSV of filtered set |
| Selects | Shared `Select` for status, assignee, slots, lawyer |

**Code:** `AdminAppointmentsPage.tsx`, `AdminCRMPage.tsx` (schedule deep-link), `queries/crm.ts` (`isError`).

---

### Phase APT-3 — Staff + client + public alignment (1–2 days) — **DONE 2026-08-07**

1. Staff: confirm/cancel/complete + meeting link; reuse patterns from admin (thin shared components OK — **one** implementation, not a second page fork).  
2. Client: Asia/Kathmandu date helper; honest pending vs confirmed copy; show meeting link when present.  
3. Public: availability + success UX aligned with pending ops.  
4. CRM schedule deep-link lands on highlighted appointment.

**Exit:** Four portals tell the same slot/status story.

#### APT-3 execution record

| Check | Result |
| --- | --- |
| Shared | `appointment-dates.ts` (Asia/Kathmandu); `MeetingLinkDialog` used by admin + staff |
| Staff | Confirm / cancel (`ConfirmDialog`) / complete + meeting link; status Select; `?appointment=` highlight |
| Client | Firm-TZ calendar dates; success + list say **pending** until confirmed; meeting join/copy when present |
| Public | Success shows date+slot as pending; min date = firm today; empty-slot helper |
| CRM deep-link | Schedule → `?appointment=`; confirm notification link includes same query |

**Code:** `StaffAppointmentsPage.tsx`, `ClientBookingPage.tsx`, `ConsultationPage.tsx`, `MeetingLinkDialog.tsx`, `appointment-dates.ts`, `AdminAppointmentsPage.tsx` (shared dialog), `crm-repository.ts` (notif link).

---

### Phase APT-4 — Notifications & email (1 day) — **DONE 2026-08-07**

1. In-app (+ email queue) on: public/client book → `clients.manage` or assignee; assign change → lawyer; confirm/cancel/reschedule → client email when present.  
2. Reuse communication path / Mailpit locally; no Mailpit copy on production hosts ([`PHASE_AUTH_7_PRODUCTION.md`](./PHASE_AUTH_7_PRODUCTION.md)).  
3. Replace confirm audit-only email stub with real job **or** delete misleading audit action.

**Exit:** Ops sees new bookings in notification bell without refreshing by luck.

#### APT-4 execution record

| Check | Result |
| --- | --- |
| Public book | In-app + email to assignee or `clients.manage` (`New public consultation request`) |
| Client book | Same path with source `client` |
| Assign | In-app + email to new lawyer (`Appointment assigned to you`) |
| Confirm / cancel / reschedule | Real `communication.email` jobs to client when email present |
| Stub removed | Repo no longer writes fake `comms.email` audit or misleading assignee “confirmed” notif |
| Links | `/admin/appointments?appointment=` or `/staff/appointments?appointment=` |
| `crm:verify-local` | **PASS** (`appointmentNotificationsOk`) |

**Code:** `crm-notifications.ts`, `crm-service.ts`, `crm-repository.ts` (`getAppointment`), `scripts/crm/verify-local.ts`.

---

### Phase APT-5 — Settings honesty (0.5–1 day) — **DONE 2026-08-07**

1. Either wire meeting-platform defaults into “Add meeting link” UX **or** remove/disable dead settings.  
2. Document SMS appointment alerts as future (do not fake).  
3. Ensure `onlineBookingEnabled` matches APT-1 gate.

**Exit:** No settings that lie.

#### APT-5 execution record

| Check | Result |
| --- | --- |
| `onlineBookingEnabled` | Copy states API 503 when off; gate already enforced (APT-1 / `onlineBookingToggleOk`) |
| Meeting platform | `defaultMeetingPlatform` persisted in system settings; MeetingLinkDialog paste hints only — no fake OAuth auto-create |
| SMS | Provider UI disabled; copy says appointment SMS is future; email used today |
| Save honesty | Settings PATCH sends contracted fields only (no silent `integrations` blob) |
| Fake QR upload toast | Replaced with “not connected” message |

**Code:** `identity.ts` contract, `identity-repository.ts`, `AdminSettingsPage.tsx`, `MeetingLinkDialog.tsx`, `appointment-dates.ts` (`meetingPlatformHint`).

---

### Phase APT-6 — E2E + docs (1 day) — **DONE 2026-08-07**

1. Playwright `tests/e2e/admin-appointments.spec.ts` (open, book, see row).  
2. Optional: `staff-appointments.spec.ts`, public consultation smoke.  
3. Update `PHASE_8_6_CRM.md` (or add `PHASE_APPOINTMENTS.md` pointer) with APT-0…APT-6 status + localhost demo path.  
4. Cross-link CRM / Clients ownership.

**Exit:** E2E green; docs match product.

#### APT-6 execution record

| Check | Result |
| --- | --- |
| Admin E2E | `tests/e2e/admin-appointments.spec.ts` — open, book, search row |
| Staff E2E | `tests/e2e/staff-appointments.spec.ts` — assignee surface + CRM ownership freeze |
| Public E2E | `tests/e2e/public-consultation.spec.ts` — pending request success |
| Docs | [`PHASE_APPOINTMENTS.md`](./PHASE_APPOINTMENTS.md); pointer from [`PHASE_8_6_CRM.md`](./PHASE_8_6_CRM.md) |
| Ownership | CRM ≠ Clients ≠ Appointments calendar (cross-linked in phase docs) |

---

## 8. Suggested build order

```text
APT-0  baseline freeze + slot inventory
APT-1  slot canon + client privacy + staff API scope + booking toggle
APT-2  admin polish (pagination/filters/calendar/deep-link/export)
APT-3  staff/client/public alignment
APT-4  notifications & email
APT-5  settings honesty
APT-6  E2E + docs   ← done
```

Do **not** embed a full calendar inside `/admin/crm`. Do **not** create `/api/v2/appointments` or a second repository. Do **not** invent a Salesforce-style multi-resource scheduler before APT-1–2.

---

## 9. File inventory (canonical — reuse these)

| Layer | Path |
| --- | --- |
| Admin UI | `src/views/admin/AdminAppointmentsPage.tsx` |
| Staff UI | `src/views/staff/StaffAppointmentsPage.tsx` |
| Client UI | `src/views/client/ClientBookingPage.tsx` |
| Public UI | `src/views/public/ConsultationPage.tsx` |
| CRM bridge | `src/views/admin/AdminCRMPage.tsx` (schedule modal) |
| Queries | `src/client/queries/crm.ts` |
| Slots | `src/shared/crm/appointment-slots.ts` |
| Contracts | `src/shared/contracts/crm.ts` |
| Service / repo | `crm-service.ts`, `crm-repository.ts` |
| Routes | `src/app/api/v1/appointments/**`, `public/appointments` |
| Schema | `db/schema.ts` → `appointments` |
| Verify | `scripts/crm/verify-local.ts` → `npm run crm:verify-local` |
| E2E | `tests/e2e/admin-appointments.spec.ts`, `staff-appointments.spec.ts`, `public-consultation.spec.ts` |
| Phase pointer | [`PHASE_APPOINTMENTS.md`](./PHASE_APPOINTMENTS.md) |
| CRM product done | [`AUDIT_ADMIN_CRM.md`](./AUDIT_ADMIN_CRM.md) CRM-0…CRM-6 |

---

## 10. Owner checkpoint

| Question | Answer |
| --- | --- |
| Is `/admin/appointments` duplicated by `/admin/crm`? | **No** — CRM bridges; calendar stays here |
| Is staff appointments a second product? | **No** — same APIs; must stay assignee-scoped |
| Is backend authority migrated? | **Yes** (`PHASE_8_6_CRM.md` complete_local) |
| Is product production-polished? | **No** — follow APT-0…APT-6 |
| Biggest risk? | Slot drift + client list leak + dead settings |
| Wrong work? | Merging calendar into CRM, or a second appointments API — **forbidden** |

---

**Report status:** APT-0…APT-6 **complete** on localhost. Canonical phase pointer: [`PHASE_APPOINTMENTS.md`](./PHASE_APPOINTMENTS.md).
