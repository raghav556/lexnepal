# Phase 7 — PostgreSQL durable jobs and schedules

## Status

The local durable-job platform is implemented and verified against PostgreSQL on `127.0.0.1:5433`. Next.js requests may enqueue work, but only the dedicated worker executes it. The scheduler only claims due schedule rows and enqueues durable jobs.

Provider- or policy-dependent handlers fail closed into dead-letter state until their prerequisites are implemented. A blocked handler is never reported as successful.

## Durable model

The `durable_jobs`, `durable_job_attempts`, `durable_job_effects`, and `durable_schedules` tables provide:

- mandatory `firm_id` and database-enforced tenant relationships;
- uniqueness on `(firm_id, type, idempotency_key)`;
- PostgreSQL `FOR UPDATE SKIP LOCKED` claims;
- renewable leases, execution timeouts, and expired-lease recovery;
- exponential retry delays from 30 seconds up to one hour;
- terminal dead-letter state and audited manual recovery;
- one attempt record per execution and structured worker logs;
- transactional effect keys for notification deduplication; and
- observable status through admin-only, firm-scoped API endpoints.

JavaScript timers are used only to poll PostgreSQL, renew leases, and enforce an in-process timeout. PostgreSQL remains the source of truth, so restarting a worker or scheduler does not lose queued work.

## Handler status

| Job type                | Local execution status | Notes                                                                     |
| ----------------------- | ---------------------- | ------------------------------------------------------------------------- |
| `document.malware_scan` | Active                 | Uses the ClamAV-backed quarantine pipeline and targets one upload intent. |
| `document.cleanup`      | Active                 | Cleans abandoned and rejected storage records.                            |
| `reminder.task`         | Active                 | Creates tenant-scoped, deduplicated in-app notifications.                 |
| `reminder.hearing`      | Active                 | Creates tenant-scoped, deduplicated in-app notifications.                 |
| `reminder.signature`    | Active                 | Creates notifications and records reminder timestamps atomically.         |
| `envelope.expire`       | Active                 | Expires sent envelopes whose expiry time has passed.                      |
| `analytics.aggregate`   | Active                 | Produces firm-scoped operational counts.                                  |
| `document.ocr`          | Blocked                | Requires an approved OCR engine and supported-format policy.              |
| `document.thumbnail`    | Blocked                | Requires a sandboxed thumbnail renderer.                                  |
| `communication.email`   | Blocked                | Requires ADR-0009 and a real provider adapter.                            |
| `communication.sms`     | Blocked                | Requires ADR-0009 and a real provider adapter.                            |
| `records.dispose`       | Blocked                | Requires retention/legal-hold policy and records-owner approval.          |
| `archive.zip`           | Blocked                | Requires a streaming ZIP artifact service and authorization design.       |

Blocked job types are registered so missing infrastructure is visible and auditable. Their business-domain cutovers must not be enabled until the listed prerequisite is complete and tested.

## Local operation

After starting local infrastructure and applying migrations:

```powershell
npm run jobs:schedules:seed
npm run jobs:verify-local
```

Run these in separate terminals during development:

```powershell
npm run jobs:worker
npm run jobs:scheduler
```

One-cycle diagnostic commands are also available:

```powershell
npm run jobs:worker:once
npm run jobs:scheduler:once
```

Schedule seeding is idempotent. It creates per-firm task, hearing, and signature reminders, envelope expiry, document cleanup, and analytics schedules for firms that have an active non-pending administrator.

## Operations and recovery

- `GET /api/v1/jobs` lists jobs for the authenticated firm.
- `GET /api/v1/jobs/{jobId}` returns one same-firm job.
- `POST /api/v1/jobs/{jobId}/retry` retries only a dead-letter job and requires an administrator plus a recovery reason.
- Worker logs contain job ID, firm ID, type, attempt, worker ID, outcome, and duration.
- Enqueue, completion, retry, dead-letter, and manual-retry transitions create audit events.
- Operators must correct the underlying provider, payload, or policy problem before manually retrying a dead-letter job.

## Verification evidence

`npm run jobs:verify-local` verifies real PostgreSQL idempotency, completion, retry/backoff, exhausted-attempt dead-lettering, audited manual retry, expired-lease recovery, schedule exactly-once enqueue behavior, and observable status. Unit tests verify worker completion, transient retry, permanent failure, missing-handler failure, and idle operation. The Phase 6 pipeline test executes clean and EICAR uploads through this durable worker.

## Exit gate

- [x] Retries cannot create duplicate queue entries or notification effects.
- [x] Dead-letter inspection and manual recovery are documented and audited.
- [x] The scheduler only enqueues durable work.
- [x] Long-running handlers execute outside Next.js requests.
