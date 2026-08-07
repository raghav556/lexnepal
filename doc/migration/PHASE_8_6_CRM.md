# Phase 8.6: CRM (Leads & Appointments) Migration

## Current status

Status: **`complete_local` for Convex→Next authority**, and **product phases CRM-0…CRM-6 done** on localhost (see [`AUDIT_ADMIN_CRM.md`](./AUDIT_ADMIN_CRM.md)). Appointments calendar product track **APT-0…APT-6** is also done — see [`PHASE_APPOINTMENTS.md`](./PHASE_APPOINTMENTS.md) + [`AUDIT_ADMIN_APPOINTMENTS.md`](./AUDIT_ADMIN_APPOINTMENTS.md).

Next.js/PostgreSQL are authoritative locally through `VITE_BACKEND_LEADS=next` and `VITE_BACKEND_APPOINTMENTS=next`. Convex branches remain inside typed adapters for rollback. Production cutover still requires an immutable export, approved firm map and production reconciliation.

### Product upgrade phases (localhost)

| Phase | Focus | Status |
| --- | --- | --- |
| CRM-0 | Baseline freeze + verify | Done |
| CRM-1 | Convert handoff + soft-delete + createLead fix | Done |
| CRM-2 | Admin polish (add/filter/export/aging) | Done |
| CRM-3 | Lead → appointment bridge (`leadId` FK) | Done |
| CRM-4 | Notifications & intake signal | Done |
| CRM-5 | Staff `/staff/crm` assignee surface | Done |
| CRM-6 | E2E + docs | Done |

## Ownership freeze (do not violate)

| Surface | Owns |
| --- | --- |
| `/admin/crm` + `/staff/crm` | Leads pipeline only |
| `/admin/clients` + `/staff/clients` | Client master / KYC / portal |
| `/admin/appointments` (+ staff/client booking) | Calendar — bridge from CRM, **do not merge calendar into CRM** |
| Public Contact/Resources/Chatbot + `/intake/[token]` | Lead capture / intake |

Reuse: `CrmService` / `CrmRepository` / `/api/v1/leads*` / `/api/v1/appointments*`.

## Domains covered

- Leads (create/list/update, convert to client, intake link + submit)
- Appointments (list, public/staff create, book consultation, status, assign, reschedule, available slots)
- Public website capture (contact/resources/chatbot) via `/api/v1/public/leads` and `/api/v1/public/appointments`
- Lead↔appointment bridge via `appointments.leadId`
- In-app + email notifications on public lead / assign / intake
- Staff assignee CRM (`/staff/crm`) with `clients.manage` convert gate + self-scope for non-managers

## Implemented vertical slice

- Zod contracts in `src/shared/contracts/crm.ts`
- Extended existing `CrmRepository` (no second repository): AND filters, `_id` DTOs, convert type/company, intake parity, Convex-matching slots
- `CrmService` with staff/`clients.manage` authorization and `PUBLIC_FIRM_SLUG` for public writes
- Versioned Route Handlers under `/api/v1/leads`, `/api/v1/appointments`, and `/api/v1/public/...` (not `/api/crm`)
- Frontend adapters use `apiClient`; ChatbotWidget uses lead adapter (no direct Convex CRM writes)
- Idempotent importer with real reconciliation checks; lead source enum normalized to schema (`walk_in`, etc.)
- Local verify: `npm run crm:verify-local`
- Playwright: `tests/e2e/admin-crm.spec.ts`, `tests/e2e/staff-crm.spec.ts`
- Appointments product E2E: `tests/e2e/admin-appointments.spec.ts`, `staff-appointments.spec.ts`, `public-consultation.spec.ts` (see [`PHASE_APPOINTMENTS.md`](./PHASE_APPOINTMENTS.md))

## Local commands

```powershell
npm run migration:identity -- tests/fixtures/convex-identity-export tests/fixtures/convex-identity-firm-map.json
npm run migration:matters -- tests/fixtures/convex-matters-export tests/fixtures/convex-identity-firm-map.json 61000000-0000-4000-8000-000000000001
npm run migration:crm -- tests/fixtures/convex-crm-export tests/fixtures/convex-identity-firm-map.json
npm run crm:verify-local
npm run e2e:seed
npm run test:e2e -- tests/e2e/admin-crm.spec.ts tests/e2e/staff-crm.spec.ts
npm run test:e2e -- tests/e2e/admin-appointments.spec.ts tests/e2e/staff-appointments.spec.ts tests/e2e/public-consultation.spec.ts
```

**Localhost demo path:** Admin → `/admin/crm` (pipeline, add/filter/export, schedule consultation → `/admin/appointments`, convert → `/admin/clients`). Staff → `/staff/crm` (assigned / managed leads; appointments stay on `/staff/appointments`). Public capture → Contact/Resources/Chatbot → notification bell. Calendar polish → [`PHASE_APPOINTMENTS.md`](./PHASE_APPOINTMENTS.md). Email capture: Mailpit on `:8025` (local only — never copy Mailpit wording onto production hosts; see [`PHASE_AUTH_7_PRODUCTION.md`](./PHASE_AUTH_7_PRODUCTION.md)).

## Local exit gate

- [x] Service + Route Handlers exist for leads and appointments (including public + intake).
- [x] Frontend pages use CRM adapters (admin/staff/client/public); chatbot uses adapter.
- [x] Migration double-run reconcile passes on local fixture.
- [x] Contract tests cover lead/appointment/intake inputs.
- [x] Local leads + appointments backend flags are `next`.
- [x] Convex authority restored only by flipping `VITE_BACKEND_LEADS` / `VITE_BACKEND_APPOINTMENTS` to `convex`.
- [x] Product phases CRM-0…CRM-6 recorded in `AUDIT_ADMIN_CRM.md`.

## Production gates

- Confirm role matrix grants `clients.manage` for convert/assign to intended roles.
- Rehearse intake token uniqueness and public firm slug against production-like volumes.
- Switch CRM flags only after website lead/booking soak plan is approved.

## Notes

- **Authority vs product:** Convex→Next authority was `complete_local` first; product upgrade is the CRM-0…CRM-6 track in [`AUDIT_ADMIN_CRM.md`](./AUDIT_ADMIN_CRM.md).
- Production auth / email: cross-link [`PHASE_AUTH_7_PRODUCTION.md`](./PHASE_AUTH_7_PRODUCTION.md). Mailpit is local capture only; production hosts must not surface Mailpit UI copy.
