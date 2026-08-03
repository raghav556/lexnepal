# ADR-0007: Use PostgreSQL as the durable job queue

- Status: accepted
- Date: 2026-08-02
- Owner: Platform owner — `TBD`
- Reviewers: Data, security, and operations owners

## Context

LexNepal needs durable background execution while PostgreSQL is already required locally. Jobs must be tenant-scoped, idempotent, retryable, observable, and recoverable after a process crash. Browser execution, request-bound work, and memory-only timers do not meet those requirements.

## Decision

Store jobs, attempts, idempotent business effects, and dead-letter state in PostgreSQL. Dedicated worker processes claim rows with `FOR UPDATE SKIP LOCKED`, maintain expiring leases, apply bounded exponential backoff, and record every attempt. Next.js may validate and enqueue a job but must not execute long-running handlers.

Unconfigured handlers fail closed into dead-letter state. Manual retry is limited to administrators, same-firm scoped, reasoned, and audited.

## Consequences

This avoids another local infrastructure dependency and permits transactional enqueue alongside application writes. Queue load must be monitored so high-volume work can later be moved to a dedicated broker without changing domain-facing enqueue contracts. Workers must be deployed and supervised independently from the web process.

## Rollback

Stop workers and disable the relevant domain feature flag. Pending rows remain durable. Domain authority can return to Convex while job rows and audit evidence are preserved for reconciliation.

## Evidence

- `drizzle/0004_durable_jobs_and_schedules.sql`
- `src/server/jobs/job-repository.ts`
- `src/server/jobs/job-worker.ts`
- `scripts/jobs/verify-local.ts`
- Phase 7 unit and database tests
