# Phase 8.11: HR Residual Migration

## Decision

**Migrate** (do not retire). `AdminHRPage` is a live admin surface; PostgreSQL already has `attendance`, `leave_requests`, and `users.baseSalary`. Retiring would remove product capability without a replacement.

### Explicitly not in HR

| Surface | Reason |
| --- | --- |
| CMS `careers` / `jobApplications` | Public recruiting content; owned by CMS domain (`PHASE_8_2`), not firm HR/payroll |

## Current status

Status: `complete_local`. Next.js/PostgreSQL are authoritative locally through `VITE_BACKEND_HR=next`. Convex `convex/hr.ts` remains available for rollback via the domain flag.

## Domains covered

- Attendance list + upsert (clock in/out, status)
- Leave requests list / create / admin review
- Nepal payroll calculator (PF / SSF / simplified tax) + set base salary

## Implemented vertical slice

- Zod contracts + DTOs in `src/shared/contracts/hr.ts`
- `HrRepository` + `HrService` (staff for attendance/leave create; admin for review/payroll/salary)
- Routes under `/api/v1/hr/*`
- Frontend adapters in `src/client/queries/hr.ts`; `AdminHRPage` off Convex
- Fixture migrate + reconcile: `tests/fixtures/convex-hr-export`
- Local verify: `npm run hr:verify-local`
- `UserDto.baseSalary` exposed from identity for payroll UI defaults

## Local commands

```powershell
npm run migration:hr -- tests/fixtures/convex-hr-export tests/fixtures/convex-identity-firm-map.json 61000000-0000-4000-8000-000000000001
npm run hr:verify-local
```

## Local exit gate

- [x] Inventory of Convex HR surface documented
- [x] CMS careers/applications explicitly out of scope for HR
- [x] Service + Route Handlers firm-scoped
- [x] Admin HR page uses HR adapters
- [x] Fixture migrate + reconcile zero unexplained differences
- [x] Associate denied payroll; admin succeeds
- [x] Local HR backend flag is `next`
- [x] Convex authority restored only by flipping `VITE_BACKEND_HR` to `convex`

## Notes

- PG stores `attendanceDate` and clock times as timestamps; API DTO keeps Convex-shaped `date` + locale clock strings for the UI.
- Leave migration must not shadow a local `toDate` helper over column values (Drizzle conflict).
