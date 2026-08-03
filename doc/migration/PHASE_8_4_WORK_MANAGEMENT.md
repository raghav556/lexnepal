# Phase 8.4: Work Management Migration

This document details the completion of Phase 8.4 of the Convex to Next.js/PostgreSQL migration, focusing on the Work Management domains (Hearings, Tasks, SOPs, Comments, and Research).

## Domains Migrated
- **Hearings**: `hearings`
- **Tasks**: `tasks`, `taskComments`, `taskWatchers`
- **SOPs**: `sopTemplates`, `sopTemplateTasks`
- **Research Notes**: `researchNotes`, `researchNoteTags`

## Backend Changes
- Created `src/server/repositories/work-management-repository.ts` to implement data access using Drizzle ORM against the PostgreSQL database.
- Implemented transactional mutations and queries with proper tenant (`firmId`) scoping.

## Frontend Changes
- Created query and mutation hooks using `useDomainBackend`:
  - `src/client/queries/hearings.ts`: `useHearings`, `useHearingCommands`
  - `src/client/queries/tasks.ts`: `useTasks`, `useTaskCommands`, `useTaskComments`, `useTaskWorkload`
  - `src/client/queries/research.ts`: `useResearchNotes`, `useResearchCommands`
- Integrated these hooks into:
  - `StaffHearingsPage.tsx`
  - `StaffTasksPage.tsx`
  - `StaffDashboard.tsx`
  - `StaffCaseDetailPage.tsx`
  - `ClientChecklistPage.tsx`
  - `StaffResearchPage.tsx`

## Data Migration
- Created the core migration service: `src/server/services/work-management-migration.ts`
- Created the CLI script: `scripts/migration/migrate-work-management-export.ts`
- Added the `migration:work-management` script to `package.json`.

## Next Steps
- Verify the migration script against a real Convex export when available (`npm run migration:work-management -- <path-to-export> <path-to-firm-map> [orphan-firm-id]`).
- Run full regression testing on the migrated frontend views to ensure no regressions in functionality.
