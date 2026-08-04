# Phase 8.10: Analytics Migration

## Current status

Status: `complete_local`. Next.js/PostgreSQL are authoritative locally through `VITE_BACKEND_ANALYTICS=next`. Convex remains available for rollback via the domain flag. Analytics is a **read model** over already-migrated source domains (cases, clients, invoices, time entries, leads, expenses, users) — there is no separate analytics export to import.

## Domains covered

- Admin/partner firm dashboard KPIs
- Revenue by practice, hours by staff, monthly revenue trend, case status distribution

## Implemented vertical slice

- Zod contract in `src/shared/contracts/analytics.ts`
- `AnalyticsRepository` firm-scoped aggregates (soft-deleted rows excluded)
- `AnalyticsService` enforces admin/partner role
- Route Handler `GET /api/v1/analytics/dashboard`
- Frontend adapter `useDashboardData` + `AdminAnalyticsPage` wired off Convex
- Local verify: `npm run analytics:verify-local` (role deny + payload schema + dual-firm load)

## Local commands

```powershell
npm run analytics:verify-local
```

## Local exit gate

- [x] Source domains used by the dashboard already run on `next` locally (matters/finance/CRM/etc.).
- [x] Service + Route Handler return firm-scoped dashboard DTO.
- [x] Admin analytics page uses the analytics adapter.
- [x] Associate role is denied; admin/partner succeed.
- [x] Local analytics backend flag is `next`.
- [x] Convex authority restored only by flipping `VITE_BACKEND_ANALYTICS` to `convex`.

## Notes

- `analytics.aggregate` durable job remains the background operational counter path (Phase 7); the interactive dashboard is live SQL aggregation, matching Convex behavior.
- No `migration:analytics` script: nothing to reconcile beyond source-domain data already proven in earlier phases.
