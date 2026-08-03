# ADR-0008: Use a PostgreSQL-backed enqueue-only scheduler

- Status: accepted
- Date: 2026-08-02
- Owner: Platform owner — `TBD`
- Reviewers: Data and operations owners

## Context

Reminder, cleanup, expiry, retention, and analytics work must survive restarts and must not run in Next.js requests. Multiple scheduler processes must not duplicate a scheduled occurrence.

## Decision

Store per-firm fixed-interval schedules in PostgreSQL. A dedicated scheduler claims due rows with row locks, enqueues a job whose idempotency key includes the schedule ID and due time, and advances the next due time in the same transaction. It never executes business logic.

Initial schedules use fixed intervals. Calendar/cron semantics require a superseding decision if later business rules need timezone-aware calendars.

## Consequences

The scheduler is restart-safe and can run more than one instance. Schedule seeding is idempotent. Operations must supervise both scheduler and worker processes, and alert when due schedules or runnable jobs stop progressing.

## Rollback

Stop the scheduler and set affected schedules inactive. Already-enqueued jobs remain independently inspectable and may be cancelled or drained under an approved runbook.

## Evidence

- `durable_schedules` in `drizzle/0004_durable_jobs_and_schedules.sql`
- `PostgresJobRepository.enqueueDueSchedules`
- `scripts/jobs/seed-schedules.ts`
- Real PostgreSQL schedule verification in `scripts/jobs/verify-local.ts`
