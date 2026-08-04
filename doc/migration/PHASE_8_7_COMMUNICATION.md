# Phase 8.7: Messages and Notifications Migration

## Current status

Status: `complete_local`. Next.js/PostgreSQL are authoritative locally through `VITE_BACKEND_MESSAGES=next` and `VITE_BACKEND_NOTIFICATIONS=next`. Convex branches remain inside typed adapters for rollback. Production cutover still requires an immutable export, approved firm map and production reconciliation.

## Domains covered

- Case messages + read receipts (+ optional attachments metadata)
- In-app notifications (list / mark one / mark all)
- Outbound email enqueue via durable `communication.email` job → local SMTP/Mailpit

## Implemented vertical slice

- Zod contracts in `src/shared/contracts/communication.ts`
- Hardened `CommunicationRepository` with `_id` DTOs, case-scoped notify-on-send
- `CommunicationService` with `requireCaseAccess`, staff/client rules, email enqueue
- Versioned Route Handlers under `/api/v1/messages`, `/api/v1/notifications`, `/api/v1/communications/email`
- Legacy `/api/communication/*` kept as thin proxies onto the same service (no second business path)
- Frontend adapters use `apiClient` with 5s message / 10s notification polling; AdminFinancePage email uses adapter
- Idempotent importer with real reconciliation checks
- Local verify: `npm run communication:verify-local` (includes Mailpit capture proof)

## Local commands

```powershell
npm run migration:identity -- tests/fixtures/convex-identity-export tests/fixtures/convex-identity-firm-map.json
npm run migration:matters -- tests/fixtures/convex-matters-export tests/fixtures/convex-identity-firm-map.json 61000000-0000-4000-8000-000000000001
npm run migration:communication -- tests/fixtures/convex-communication-export tests/fixtures/convex-identity-firm-map.json
npm run communication:verify-local
```

## Local exit gate

- [x] Service + Route Handlers exist for messages, notifications, and email enqueue.
- [x] Frontend pages use communication adapters (client/staff/admin bell + finance email).
- [x] Migration double-run reconcile passes on local fixture.
- [x] Contract tests cover message/email inputs.
- [x] Local messages + notifications backend flags are `next`.
- [x] Email path proven: enqueue → worker → Mailpit (`:1025` / `:8025`).
- [x] Convex authority restored only by flipping `VITE_BACKEND_MESSAGES` / `VITE_BACKEND_NOTIFICATIONS` to `convex`.

## Production gates

- Confirm SMTP provider and firm integration settings for non-local environments.
- Confirm SMS remains explicitly deferred (job type exists; local SMS still simulated/blocked as designed).
- Switch communication flags only after reminder/email soak plan is approved.
