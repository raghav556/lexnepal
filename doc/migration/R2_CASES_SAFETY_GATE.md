# R2 Cases migration safety gate

Stage A expands `cases.status` with `closed` and adds nullable `client_summary` / `closure_outcome`, plus an empty `case_parties` table. Stage B backfills `closed_won` → `closed` + `won` and `closed_lost` → `closed` + `lost`. Leftover enum members stayed until the dedicated R12 cleanup (`doc/migration/R12_LEGACY_STATUS_CLEANUP.md`).

MySQL `MODIFY ENUM` is not a trustworthy down migration. Recovery is restore from backup, not a reverse SQL file.

## Next required action (C-DATE-001)

There is no `deadlines` table. The next required action for a case is the next scheduled hearing date, or else the earliest incomplete case-task due date.

## Responsible Lawyer vs Case Team

- The Responsible Lawyer (`assignedLawyerId`) is always a `case_team_members` row.
- Auth remains lead **or** team member (`requireCaseAccess`).
- Staff cannot remove the current Responsible Lawyer from the Case Team; reassign the lead first.
- Changing the lead adds the new lawyer and keeps the previous lead on the team unless Staff explicitly omits them in `teamMemberIds`.

## Gate (copy first)

1. `npm run local:mysql:backup`
2. `npm run db:r2-gate` — clones `DATABASE_URL` into `{db}_r2_gate`, applies pending Drizzle migrations, then checks:
   - `client_summary` was not copied from `description`
   - `case_parties` has zero rows
   - converted closed rows keep `closedDate` unchanged
   - lifecycle `closed` is present; leftover `closed_won`/`closed_lost` rows are 0 (R12 may then drop those enum members)
3. Only after the copy passes: `npm run db:migrate` on the primary local database.

If MySQL denies `CREATE DATABASE` (typical for a least-privilege app user), take `npm run local:mysql:backup` first, apply `npm run db:migrate` to the primary working copy, and treat restore of that dump as the recovery path. Do not shrink the status enum in place.

Keep the copy with `KEEP_R2_GATE=1` if you need to inspect it.

## Recovery

1. Stop writers (`npm run dev` off).
2. Restore the newest dump from `%LOCALAPPDATA%\LexNepal\backups\lexnepal-*.sql` (or `/tmp/lexnepal/backups` on Unix) into the original database name.
3. Confirm `npm run local:mysql:restore-drill` still succeeds on a later dump.
4. Do not shrink or re-expand the status enum in place without a new numbered migration.
