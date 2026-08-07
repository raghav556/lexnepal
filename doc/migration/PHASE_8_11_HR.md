# Phase 8.11: HR Residual Migration

## Decision

**Migrate** (do not retire). `AdminHRPage` is a live admin surface; PostgreSQL already has `attendance`, `leave_requests`, `leave_balances`, `payroll_runs` / `payroll_run_lines`, and `users.baseSalary`. Retiring would remove product capability without a replacement.

### Explicitly not in HR

| Surface | Reason |
| --- | --- |
| CMS `careers` / `jobApplications` | Public recruiting content; owned by CMS domain (`PHASE_8_2`), not firm HR/payroll |

## Current status

Status: **`complete_local` for Convex→Next authority**, and **product phases HR-0…HR-6 done** on localhost (see [`AUDIT_ADMIN_HR.md`](./AUDIT_ADMIN_HR.md)).

Next.js/PostgreSQL are authoritative locally through `VITE_BACKEND_HR=next`. Convex `convex/hr.ts` remains available for rollback via the domain flag.

### Product upgrade phases (localhost)

| Phase | Focus | Status |
| --- | --- | --- |
| HR-0 | Baseline freeze + verify | Done |
| HR-1 | Authz (`hr.manage`) + audit events | Done |
| HR-2 | Staff `/staff/hr` attendance + leave | Done |
| HR-3 | Admin ops polish (date/filter/export) | Done |
| HR-4 | Leave balances + approve → attendance | Done |
| HR-5 | Payroll runs + staff payslips | Done |
| HR-6 | Leave notifications, E2E, TZ/docs | Done |

## Domains covered

- Attendance list + upsert (clock in/out, status) — clock strings = **Asia/Kathmandu**
- Leave requests list / create / admin review + balances + attendance sync on approve
- In-app + email notifications on leave submit (to `hr.manage`) and decision (to requester)
- Nepal payroll calculator (PF / SSF / simplified tax) + set base salary
- Payroll runs (draft → finalize) and staff payslip read

## Implemented vertical slice

- Zod contracts + DTOs in `src/shared/contracts/hr.ts`
- `HrRepository` + `HrService` (staff for attendance/leave create/payslips; `hr.manage` for review/payroll/salary/runs)
- Routes under `/api/v1/hr/*`
- Frontend adapters in `src/client/queries/hr.ts`; `AdminHRPage` + `StaffHRPage`
- Fixture migrate + reconcile: `tests/fixtures/convex-hr-export`
- Local verify: `npm run hr:verify-local`
- Playwright: `tests/e2e/staff-hr.spec.ts`, `tests/e2e/admin-hr.spec.ts`
- `UserDto.baseSalary` exposed from identity for payroll UI defaults

## Local commands

```powershell
npm run migration:hr -- tests/fixtures/convex-hr-export tests/fixtures/convex-identity-firm-map.json 61000000-0000-4000-8000-000000000001
npm run hr:verify-local
npm run test:e2e -- tests/e2e/staff-hr.spec.ts tests/e2e/admin-hr.spec.ts
```

**Localhost demo path:** Admin → `/admin/hr` (Attendance / Leave / Payroll). Staff → `/staff/hr` (Attendance / Leave / Payslips). Email capture: Mailpit on `:8025` (local only — never copy Mailpit wording onto production hosts; see [`PHASE_AUTH_7_PRODUCTION.md`](./PHASE_AUTH_7_PRODUCTION.md) + invite-copy scoping).

## Local exit gate

- [x] Inventory of Convex HR surface documented
- [x] CMS careers/applications explicitly out of scope for HR
- [x] Service + Route Handlers firm-scoped
- [x] Admin HR page uses HR adapters
- [x] Fixture migrate + reconcile zero unexplained differences
- [x] Associate denied payroll; admin succeeds
- [x] Local HR backend flag is `next`
- [x] Convex authority restored only by flipping `VITE_BACKEND_HR` to `convex`
- [x] Product phases HR-1…HR-6 recorded in `AUDIT_ADMIN_HR.md`

## Notes

- PG stores `attendanceDate` and clock times as timestamps; API DTO keeps Convex-shaped `date` + **Asia/Kathmandu** clock strings for the UI (`src/shared/hr/timezone.ts`).
- Leave migration must not shadow a local `toDate` helper over column values (Drizzle conflict).
- **Authority vs product:** Convex→Next authority was `complete_local` first; corporate-grade product work is the HR-0…HR-6 track in [`AUDIT_ADMIN_HR.md`](./AUDIT_ADMIN_HR.md).
- Production auth / email: cross-link [`PHASE_AUTH_7_PRODUCTION.md`](./PHASE_AUTH_7_PRODUCTION.md). Mailpit is local capture only (ADR-0009 / invite-copy); production hosts must not surface Mailpit UI copy.
