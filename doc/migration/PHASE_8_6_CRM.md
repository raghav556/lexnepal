# Phase 8.6: CRM (Leads & Appointments) Migration

## Current status

Status: `complete_local`. Next.js/PostgreSQL are authoritative locally through `VITE_BACKEND_LEADS=next` and `VITE_BACKEND_APPOINTMENTS=next`. Convex branches remain inside typed adapters for rollback. Production cutover still requires an immutable export, approved firm map and production reconciliation.

## Domains covered

- Leads (create/list/update, convert to client, intake link + submit)
- Appointments (list, public/staff create, book consultation, status, assign, reschedule, available slots)
- Public website capture (contact/resources/chatbot) via `/api/v1/public/leads` and `/api/v1/public/appointments`

## Implemented vertical slice

- Zod contracts in `src/shared/contracts/crm.ts`
- Extended existing `CrmRepository` (no second repository): AND filters, `_id` DTOs, convert type/company, intake parity, Convex-matching slots
- `CrmService` with staff/`clients.manage` authorization and `PUBLIC_FIRM_SLUG` for public writes
- Versioned Route Handlers under `/api/v1/leads`, `/api/v1/appointments`, and `/api/v1/public/...` (not `/api/crm`)
- Frontend adapters use `apiClient`; ChatbotWidget uses lead adapter (no direct Convex CRM writes)
- Idempotent importer with real reconciliation checks; lead source enum normalized to schema (`walk_in`, etc.)
- Local verify: `npm run crm:verify-local`

## Local commands

```powershell
npm run migration:identity -- tests/fixtures/convex-identity-export tests/fixtures/convex-identity-firm-map.json
npm run migration:matters -- tests/fixtures/convex-matters-export tests/fixtures/convex-identity-firm-map.json 61000000-0000-4000-8000-000000000001
npm run migration:crm -- tests/fixtures/convex-crm-export tests/fixtures/convex-identity-firm-map.json
npm run crm:verify-local
```

## Local exit gate

- [x] Service + Route Handlers exist for leads and appointments (including public + intake).
- [x] Frontend pages use CRM adapters (admin/staff/client/public); chatbot uses adapter.
- [x] Migration double-run reconcile passes on local fixture.
- [x] Contract tests cover lead/appointment/intake inputs.
- [x] Local leads + appointments backend flags are `next`.
- [x] Convex authority restored only by flipping `VITE_BACKEND_LEADS` / `VITE_BACKEND_APPOINTMENTS` to `convex`.

## Production gates

- Confirm role matrix grants `clients.manage` for convert/assign to intended roles.
- Rehearse intake token uniqueness and public firm slug against production-like volumes.
- Switch CRM flags only after website lead/booking soak plan is approved.
