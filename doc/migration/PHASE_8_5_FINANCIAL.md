# Phase 8.5: Financial Domain Migration

> **Retired domain record.** Finance and billing were deliberately removed from LexNepal. This file
> is preserved only as migration history and must not be used to restore finance routes or runtime
> behavior.

## Historical status

Status: `complete_local`. Next.js/PostgreSQL are authoritative locally through `VITE_BACKEND_FINANCE=next`. Convex branches remain inside typed adapters for rollback. Production cutover still requires an immutable export, approved firm map and production reconciliation.

## Domains covered

- Invoices + line items (create from unbilled time)
- Time entries
- Trust transactions (firm-scoped `idempotency_key`; double-submit replays)
- Expenses + stats
- Payments (mark paid + gateway initiate; same idempotency + already-paid replay)

## Implemented vertical slice

- Zod contracts in `src/shared/contracts/financial.ts`
- `PostgresFinancialRepository` with transactional mutations via `runFinancialTransaction`
- `FinancialService` with `finance.manage` / `cases.manage` authorization and client-owned invoice payment
- Versioned Route Handlers under `/api/v1/financial/...`
- Frontend adapters use `apiClient` (no raw fetch; no direct page Convex finance calls)
- Idempotent importer with real reconciliation checks
- Local verify: `npm run financial:verify-local`

## Local commands

```powershell
npm run migration:identity -- tests/fixtures/convex-identity-export tests/fixtures/convex-identity-firm-map.json
npm run migration:matters -- tests/fixtures/convex-matters-export tests/fixtures/convex-identity-firm-map.json 61000000-0000-4000-8000-000000000001
npm run migration:financial -- tests/fixtures/convex-financial-export tests/fixtures/convex-identity-firm-map.json
npm run financial:verify-local
```

## Local exit gate

- [x] Service + Route Handlers exist for invoices, time, trust, expenses, payments.
- [x] Frontend pages use finance adapters (staff/admin/client).
- [x] Migration double-run reconcile passes on local fixture.
- [x] Contract tests cover invoice/time/trust/expense inputs.
- [x] Local finance backend flag is `next`.
- [x] Convex authority restored only by flipping `VITE_BACKEND_FINANCE=convex`.

## Production gates

- Confirm role matrix grants `finance.manage` to intended roles.
- Rehearse VAT/total math against production-like volumes.
- Switch finance flag only after billing/signature soak plan is approved.
