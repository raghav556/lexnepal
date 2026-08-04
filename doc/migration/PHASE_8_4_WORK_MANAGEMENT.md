# Phase 8.4: Work Management Migration

## Current status

Status: `complete_local`. Next.js/PostgreSQL are authoritative locally through:

- `VITE_BACKEND_TASKS=next`
- `VITE_BACKEND_HEARINGS=next`
- `VITE_BACKEND_RESEARCH=next`

Convex branches remain inside the typed adapters for rollback only. Production cutover still requires an immutable export, approved firm map and production reconciliation.

## Domains covered

- **Hearings**: `hearings`
- **Tasks**: `tasks`, `taskComments`, `taskWatchers`
- **SOPs**: `sopTemplates`, `sopTemplateTasks`
- **Research Notes**: `researchNotes`, `researchNoteTags`

## Implemented vertical slice

- Zod contracts, PostgreSQL repository, work-management service and versioned Route Handlers under `/api/v1/tasks`, `/api/v1/hearings`, `/api/v1/research`, `/api/v1/sop-templates`.
- Manual overdue reminder scan at `POST /api/v1/tasks/overdue-reminders` (parity with Convex `scanOverdueReminders`).
- Hearing DTOs expose both `hearingTime` and compatibility alias `time`.
- Task create/update accepts date-only `dueDate` values and normalizes them to ISO datetimes.
- Task list supports `parentTaskId` for subtask reads.
- Frontend pages use domain adapters only (no direct `api.tasks` / `api.hearings` / `api.research` in React pages).
- Idempotent Convex importer including task watchers, with double-run reconcile.

## Frontend consumers switched

- `StaffTasksPage.tsx`
- `StaffHearingsPage.tsx`
- `StaffDashboard.tsx`
- `StaffCaseDetailPage.tsx`
- `StaffCasesPage.tsx`
- `StaffResearchPage.tsx` (already on adapters)
- `ClientChecklistPage.tsx` (already on adapters)
- `ClientDashboard.tsx`
- `ClientCasesPage.tsx`

## Local commands

```powershell
npm run migration:identity -- tests/fixtures/convex-identity-export tests/fixtures/convex-identity-firm-map.json
npm run migration:matters -- tests/fixtures/convex-matters-export tests/fixtures/convex-identity-firm-map.json 61000000-0000-4000-8000-000000000001
npm run migration:work-management -- tests/fixtures/convex-work-management-export tests/fixtures/convex-identity-firm-map.json
npm run work-management:verify-local
```

## Local exit gate

- [x] Schema/repository/service/API exist for hearings, tasks, SOPs, comments and research.
- [x] Every direct page consumer uses the domain adapter.
- [x] Overdue reminder scan works on Next.js.
- [x] Migration is idempotent and reconciliation passes on the local fixture.
- [x] Contract tests cover hearing/task/research input rules.
- [x] Local tasks/hearings/research backend flags are `next`.
- [x] Convex authority can be restored by flipping the three flags back to `convex`.

## Production gates

- Run immutable export import twice and attach reconciliation evidence.
- Confirm staff capability matrix includes `cases.view_all` / `cases.manage` for intended roles.
- Switch the three flags together in one controlled release after soak.
