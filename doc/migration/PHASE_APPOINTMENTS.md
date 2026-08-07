# Appointments product track (APT-0…APT-6)

Status: **APT-0…APT-6 done** on localhost. Canonical audit: [`AUDIT_ADMIN_APPOINTMENTS.md`](./AUDIT_ADMIN_APPOINTMENTS.md).

Authority for leads + appointments remains under [`PHASE_8_6_CRM.md`](./PHASE_8_6_CRM.md) (`complete_local`). This track is the **calendar / booking product polish** on top of that authority — not a second appointments API.

## Ownership freeze

| Surface | Owns |
| --- | --- |
| `/admin/crm` + `/staff/crm` | Leads only — schedule bridges out |
| `/admin/clients` + `/staff/clients` | Client master / KYC |
| `/admin/appointments` + `/staff/appointments` | Firm calendar |
| `/client` booking | Linked client consultations |
| `/consultation` | Public pending requests |

Do **not** embed a full calendar inside CRM. Do **not** create `/api/v2/appointments`.

## Phase status

| Phase | Focus | Status |
| --- | --- | --- |
| APT-0 | Baseline freeze + slot inventory | Done |
| APT-1 | Slot canon + client privacy + staff scope + booking toggle | Done |
| APT-2 | Admin polish (pagination/filters/calendar/deep-link/export) | Done |
| APT-3 | Staff / client / public alignment | Done |
| APT-4 | Notifications & email | Done |
| APT-5 | Settings honesty | Done |
| APT-6 | E2E + docs | Done |

## Localhost demo path

1. Admin → `/admin/appointments` (list/calendar, book, KPIs, CSV, `?appointment=`).
2. CRM → schedule consultation → lands on `/admin/appointments?appointment=…`.
3. Staff → `/staff/appointments` (self-scoped; confirm/cancel/complete + meeting link).
4. Client portal → book consultation (pending until firm confirms; firm TZ Asia/Kathmandu).
5. Public → `/consultation` (pending request; gated by `onlineBookingEnabled`).
6. Settings → Online Appointments toggle + meeting-platform **paste hint** (no fake OAuth).
7. Email capture: Mailpit `:8025` locally only — see [`PHASE_AUTH_7_PRODUCTION.md`](./PHASE_AUTH_7_PRODUCTION.md).

## Verify / E2E

```powershell
npm run crm:verify-local
npm run e2e:seed
npm run test:e2e -- tests/e2e/admin-appointments.spec.ts tests/e2e/staff-appointments.spec.ts tests/e2e/public-consultation.spec.ts
```
