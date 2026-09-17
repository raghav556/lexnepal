# R12 leftover case-status cleanup

Stage D (R11) proved `closed_won` / `closed_lost` are unused in data and are no longer written. Stage E is this dedicated migration (`drizzle/0006_cases_legacy_status_cleanup.sql`). It is optional for shipping Case management: leftover enum members were not a P0/P1.

MySQL `MODIFY ENUM` that **removes** members is not a trustworthy down migration. Recovery is restore from backup.

## What stays

- Zod `caseStatusSchema` still accepts `closed_won` / `closed_lost` and maps them to `closed` + outcome.
- Case UI still writes only `closed` + optional `closureOutcome`.
- `client_summary` is never copied from `description`.
- `case_parties` is never auto-filled from the CRM Client.

## Gate (copy first)

1. `npm run local:mysql:backup`
2. Confirm `SUM(status IN ('closed_won','closed_lost')) = 0` on the target database.
3. `npm run db:migrate` — MySQL rejects 0006 if any leftover row remains.
4. Confirm `cases.status` is `enum('inquiry','active','on_hold','closed')`.

If MySQL denies `CREATE DATABASE` for a clone, take the backup first, migrate the working copy, and treat restore of that dump as recovery.

## Recovery

1. Stop writers (`npm run dev` off).
2. Restore the newest dump from `%LOCALAPPDATA%\LexNepal\backups\lexnepal-*.sql` (or `/tmp/lexnepal/backups` on Unix).
3. Do not attempt to re-expand the enum in place without a new numbered migration.
