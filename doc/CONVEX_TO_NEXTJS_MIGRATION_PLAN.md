# LexNepal Convex-to-Next.js Migration Plan

**Status:** Foundations (Phases 0–7) implemented locally; Phase 8 partially complete; Phases 9–13 remaining  
**Created:** 2026-08-02  
**Updated remaining-work tracker:** [`migration/REMAINING_WORK_PLAN.md`](migration/REMAINING_WORK_PLAN.md) (2026-08-04)  
**Migration strategy:** Domain-by-domain strangler migration  
**Current source of truth:** Convex (production authority; localhost mixed by domain flags)  
**Target source of truth:** PostgreSQL behind a Next.js application/API layer

## 1. Purpose

This document is the single source of truth for replacing the LexNepal Convex backend with a Next.js backend without duplicating business logic, skipping features, losing data, weakening security, or allowing the two implementations to drift.

The migration is complete only when:

- Every Convex table and function has an explicit target or retirement decision.
- Every frontend Convex consumer has been moved to the new client data layer.
- All required data has been migrated and reconciled.
- Next.js authorization is equivalent to or stronger than Convex authorization.
- Storage, jobs, schedules, search, notifications, audit and realtime behavior have replacements.
- Convex is read-only, backed up and then removed after the rollback window.

## 2. Current repository baseline

The initial repository inventory found approximately:

- 38 TypeScript files under `convex/`.
- 45 Convex database tables.
- 74 public queries.
- 141 public mutations.
- 5 internal queries, mutations and actions.
- 76 frontend files that directly consume Convex APIs.
- Convex-managed storage uploads and file URLs.
- A daily scheduled job.
- A scheduled document-security action.
- Search indexes and reactive client queries.
- Authentication, tenant context, capabilities and auditing coupled to Convex.

These counts must be regenerated at the start of Phase 1 and stored in the migration inventory. They are planning estimates, not final acceptance counts.

## 3. Scope

### Included

- Next.js App Router application and Route Handlers.
- PostgreSQL schema, indexes, constraints and migrations.
- Authentication/session integration.
- Firm/tenant isolation and capability authorization.
- All existing business domains.
- File storage, quarantine and document scanning.
- Scheduled and background work.
- Notifications and communications.
- Search.
- Data migration and reconciliation.
- Frontend conversion from React Router/Vite to Next.js routes.
- Convex retirement.

### Not automatically included

- Redesigning every page.
- Replacing the current identity provider during the first backend cutover.
- Rewriting correct business behavior merely to make it stylistically different.
- Adding unrelated features while migration is active.
- Replacing PostgreSQL or object storage after the target architecture is approved.

New feature work during migration must update this plan, the parity inventory and both required implementations until that domain is cut over.

## 4. Target architecture

The proposed baseline is:

| Concern              | Target                                                  |
| -------------------- | ------------------------------------------------------- |
| Application          | Next.js App Router                                      |
| Browser/external API | Versioned Route Handlers under `/app/api/v1`            |
| UI-only commands     | Server Actions after the UI is running on Next.js       |
| Database             | PostgreSQL                                              |
| ORM and migrations   | Drizzle ORM, unless an ADR approves Prisma              |
| Runtime validation   | Zod                                                     |
| Authentication       | Preserve the existing identity provider initially       |
| Authorization        | Central server-side policies and data access layer      |
| File storage         | Private S3-compatible object storage                    |
| Browser uploads      | Short-lived presigned uploads to quarantine storage     |
| Background work      | Durable managed queue and dedicated worker              |
| Scheduled work       | Managed scheduler that enqueues durable jobs            |
| Rate limiting        | Redis or a managed distributed rate-limit store         |
| Client queries       | TanStack Query through a typed API client               |
| Search               | PostgreSQL full-text search and `pg_trgm` initially     |
| Realtime             | Polling by default; SSE/WebSockets only where justified |
| Monitoring           | Structured logs, metrics, tracing and error reporting   |

Next.js will provide the web and API layer. Long-running document scanning, OCR, bulk downloads, reminders and similar jobs must not depend on a request remaining open.

## 5. Mandatory architecture decisions

Create an Architecture Decision Record for each item before Phase 2 exits:

- [ ] Hosting platform for Next.js.
- [ ] PostgreSQL provider and backup policy.
- [ ] Drizzle versus Prisma.
- [ ] Existing authentication provider integration.
- [ ] Session storage and revocation strategy.
- [ ] Object storage provider and region.
- [ ] Queue and worker platform.
- [ ] Scheduler platform.
- [ ] Email/SMS provider.
- [ ] Search strategy.
- [ ] Realtime messaging strategy.
- [ ] Logging, metrics and error-reporting platform.
- [ ] Secrets-management platform.
- [ ] Required Nepal data residency or legal requirements.
- [ ] Production rollback and backup-retention window.

No domain cutover may occur while one of its required infrastructure decisions is unresolved.

## 6. Non-negotiable migration rules

### 6.1 One authoritative writer

At any moment, each business domain must have exactly one authoritative writer:

```text
Convex authoritative
    -> Next.js shadow reads
    -> Domain write freeze
    -> Final incremental migration
    -> PostgreSQL authoritative
    -> Convex domain disabled
```

Uncontrolled bidirectional writes are prohibited. If temporary dual writing is approved for a specific domain, it must use an idempotent outbox, reconciliation and an explicit ADR.

### 6.2 One implementation of business rules

- Route Handlers handle HTTP concerns only.
- Server Actions handle UI invocation concerns only.
- Domain services contain business rules.
- Repositories/DAL contain database access.
- Authorization policies contain access decisions.
- Shared Zod schemas define inputs and outputs.
- Infrastructure adapters contain provider-specific code.

Business rules must not be copied among Route Handlers, Server Actions, React components and jobs.

### 6.3 No silent omissions

Every Convex function must be marked as exactly one of:

- `migrate`
- `merge`
- `replace`
- `retire`
- `currently_simulated`

Retirement requires a written reason and confirmation that no active caller remains.

### 6.4 Preserve IDs during the first migration

Store existing Convex IDs as text primary keys or as a unique `legacy_convex_id`. Do not convert every relationship to UUID during the same migration. ID modernization can be a later project.

### 6.5 Security cannot regress

The recently implemented document security boundary is an acceptance baseline. The Next.js implementation must preserve:

- Firm isolation.
- Capability checks.
- Case/document/signer validation.
- Legal holds and retention blocks.
- Secure share passwords and rate limits.
- Share revocation and expiry.
- Upload quarantine.
- File validation and malware scanning.
- Audit events.

## 7. Required migration artifacts

Maintain these artifacts under `doc/migration/` as implementation begins:

```text
doc/migration/
├── architecture-decisions/
├── domain-inventory.csv
├── endpoint-parity.csv
├── table-mapping.csv
├── frontend-consumers.csv
├── data-exceptions.csv
├── risk-register.md
├── cutover-runbook.md
├── rollback-runbook.md
├── reconciliation-report.md
└── decommission-checklist.md
```

### Endpoint parity columns

`endpoint-parity.csv` must include:

| Column               | Description                                    |
| -------------------- | ---------------------------------------------- |
| Domain               | Business domain                                |
| Convex module        | Existing source module                         |
| Convex export        | Existing query/mutation/action                 |
| Kind                 | Query, mutation or action                      |
| Frontend callers     | Every consumer                                 |
| Tables               | Tables read or written                         |
| Authorization        | Existing required role/capability              |
| Side effects         | Audit, notifications, jobs and storage         |
| Decision             | Migrate, merge, replace, retire or simulated   |
| Next service         | Target service method                          |
| Next endpoint/action | Target public interface                        |
| Request contract     | Zod schema                                     |
| Response contract    | Zod schema                                     |
| Migration script     | Data migration reference                       |
| Tests                | Unit, integration, contract and E2E references |
| Status               | Controlled status                              |
| Owner                | Responsible developer                          |
| Cutover              | Planned/actual date                            |
| Rollback             | Recovery procedure                             |

Allowed statuses:

```text
not_started
inventoried
designed
implemented
contract_tested
data_migrated
frontend_switched
production_verified
convex_retired
```

## 8. Phase plan

## Phase 0 — approve strategy and control scope

### Work

- Approve this migration strategy.
- Nominate a migration owner.
- Establish code review ownership by domain.
- Freeze unnecessary Convex feature work.
- Define rollback and acceptable downtime targets.
- Define production data and file-retention requirements.
- Establish a weekly parity and risk review.

### Deliverables

- Approved plan. Approval record: [`migration/PHASE_0_GOVERNANCE.md`](migration/PHASE_0_GOVERNANCE.md).
- Initial risk register: [`migration/risk-register.md`](migration/risk-register.md).
- Architecture-decision backlog: [`migration/architecture-decisions/README.md`](migration/architecture-decisions/README.md).
- Migration status vocabulary: [`migration/STATUS_VOCABULARY.md`](migration/STATUS_VOCABULARY.md).
- Rollback expectations: [`migration/rollback-runbook.md`](migration/rollback-runbook.md).

### Exit gate

- [ ] Scope and ownership approved.
- [ ] No untracked migration work is in progress.
- [x] Rollback expectations documented as a draft; target values and operational procedures still require approval.

Organizational approval to proceed was recorded from the project owner on 2026-08-02. Named operational owners, backups and final service targets remain tracked in the Phase 0 governance record.

## Phase 1 — inventory Convex and capture current behavior

### Work

- Regenerate the complete Convex table/function inventory.
- Map all frontend Convex imports and calls.
- Map storage operations, indexes, schedules and internal actions.
- Record request and response shapes.
- Record authorization and tenant checks.
- Record audit and notification side effects.
- Mark mock/simulated functionality.
- Add characterization tests around critical current behavior.

### Deliverables

- Completed domain inventory: [`migration/domain-inventory.csv`](migration/domain-inventory.csv).
- Completed endpoint parity inventory: [`migration/endpoint-parity.csv`](migration/endpoint-parity.csv).
- Completed frontend-consumer inventory: [`migration/frontend-consumers.csv`](migration/frontend-consumers.csv).
- First table mapping: [`migration/table-mapping.csv`](migration/table-mapping.csv).
- Storage, schedule and internal-call inventory: [`migration/runtime-dependencies.csv`](migration/runtime-dependencies.csv).
- Generated counts and limitations: [`migration/INVENTORY_SUMMARY.md`](migration/INVENTORY_SUMMARY.md).
- Known defects that should not be reproduced: [`migration/known-defects.md`](migration/known-defects.md).
- Reproducible generator: [`../scripts/migration/generate-convex-inventory.mjs`](../scripts/migration/generate-convex-inventory.mjs).
- Initial characterization tests: [`../tests/characterization/document-security.test.mjs`](../tests/characterization/document-security.test.mjs).

### Exit gate

- [x] Every statically discoverable Convex export is inventoried (220 handlers).
- [x] Every direct `api.<module>.<export>` frontend reference is inventoried (325 references across 72 files).
- [x] Every statically discoverable storage, browser-upload, schedule and internal-action dependency is inventoried.
- [x] Every inventory item has a controlled `migrate`, `replace`, or `currently_simulated` decision.

Phase 1 static inventory is complete. Runtime characterization remains an ongoing requirement where the generated summary identifies implicit response contracts or dynamic behavior. Phase 0 organizational approval was recorded on 2026-08-02; named operational assignments remain open.

## Phase 2 — scaffold Next.js and engineering foundations

### Work

- Create the Next.js App Router application.
- Configure TypeScript, linting, formatting and tests.
- Add environment validation.
- Establish `server-only` boundaries.
- Add health, readiness and version endpoints.
- Establish structured error responses.
- Add request IDs and structured logging.
- Add CI for typecheck, lint, unit, integration and build checks.

### Proposed structure

```text
app/
├── api/v1/
├── (public)/
├── (client)/
├── (staff)/
└── (admin)/

src/
├── server/
│   ├── auth/
│   ├── db/
│   ├── dal/
│   ├── repositories/
│   ├── services/
│   ├── policies/
│   ├── jobs/
│   ├── storage/
│   └── audit/
├── client/
│   ├── api/
│   └── queries/
└── shared/
    ├── contracts/
    ├── errors/
    └── constants/
```

During coexistence, the tracked Next.js application lives under `next-app/app/`. A root-level `app/` cannot coexist with the legacy Vite application's `src/pages/` because Next.js detects it as a Pages Router directory. ADR-0018 records this temporary isolation; Phase 11 removes the legacy constraint.

### Deliverables

- Next.js application foundation: [`../next-app/`](../next-app/).
- Server/shared boundaries: [`../src/server/`](../src/server/) and [`../src/shared/`](../src/shared/).
- Operational endpoints: `/api/v1/health`, `/api/v1/readiness`, and `/api/v1/version`.
- Unit/integration architecture tests: [`../tests/`](../tests/).
- CI workflow: [`../.github/workflows/next-foundation-ci.yml`](../.github/workflows/next-foundation-ci.yml).
- Implementation and verification record: [`migration/PHASE_2_FOUNDATION.md`](migration/PHASE_2_FOUNDATION.md).

### Exit gate

- [ ] Next.js builds in remote CI. The production build passes locally and the CI workflow is committed; a hosted run is still required.
- [x] Health/readiness/version endpoints pass integration tests and live production-server probes.
- [x] Server-only imports are enforced by `server-only`, Next.js compilation and architecture tests.
- [ ] All mandatory architecture decisions are approved. ADR-0003, ADR-0016 and ADR-0018 are accepted; provider, residency and operational ADRs remain pending.

## Phase 3 — build PostgreSQL schema and migrations

### Work

- Map all 45 Convex tables.
- Add firm ownership to every tenant-owned table.
- Add foreign keys and unique constraints.
- Translate unions into enums/check constraints.
- Add `created_at`, `updated_at` and required deletion metadata.
- Normalize queryable arrays into relationship tables.
- Use JSONB only for genuinely flexible metadata.
- Recreate search and operational indexes.
- Add seed and test-fixture support.

### Mandatory database rules

- Tenant-owned tables use `firm_id NOT NULL` after migration.
- Firm-owned uniqueness includes `firm_id`.
- Financial mutations use transactions.
- Document/version/signature relationships use foreign keys.
- Schema changes are made only through committed migrations.
- Migration files are never edited after production application.

### Deliverables

- Drizzle schema: [`../db/schema.ts`](../db/schema.ts).
- Committed migrations and checksums: [`../drizzle/`](../drizzle/).
- PostgreSQL schema design: [`migration/POSTGRES_SCHEMA_DESIGN.md`](migration/POSTGRES_SCHEMA_DESIGN.md).
- All 45 source mappings: [`migration/table-mapping.csv`](migration/table-mapping.csv).
- Normalized field mapping: [`migration/normalization-map.csv`](migration/normalization-map.csv).
- Index/query mapping: [`migration/index-query-map.csv`](migration/index-query-map.csv).
- Clean migration, tenant and rollback tests: [`../tests/database/schema-migrations.test.ts`](../tests/database/schema-migrations.test.ts).
- Safe seed entry point: [`../scripts/db/seed.ts`](../scripts/db/seed.ts).

### Exit gate

- [x] Every Convex table has a target mapping (45/45), with 13 normalized child mappings.
- [x] Clean PostgreSQL-compatible migration passes locally and creates 61 tables (58 Phase 3 tables plus 3 Phase 6 storage-pipeline tables).
- [x] Destructive initial-schema rollback is tested only on an empty rehearsal database.
- [x] All 135 current explicit indexes are documented and verified against the migrated schema.
- [x] Cross-firm matter, document-version and signer database tests pass.

Phase 3 local schema gates are complete. A production-provider migration and PITR rehearsal remains required after ADR-0002 is accepted and before any production data cutover.

## Phase 4 — authentication, sessions and authorization

### Work

- Integrate the existing identity provider with Next.js.
- Implement session verification and revocation.
- Implement firm-context resolution.
- Port the role/capability matrix.
- Build centralized authorization policies.
- Add DTOs that exclude sensitive fields.
- Add audit context: actor, firm, IP/request ID and timestamp.

### Required policy functions

```text
requireSession
requireFirmContext
requireCapability
requireSameFirm
requireCaseAccess
requireClientOwnership
requireDocumentAccess
```

### Exit gate

- [x] Anonymous access tests pass.
- [x] Suspended/pending-user tests pass.
- [x] Cross-firm attack tests pass.
- [x] Role/capability tests pass.
- [x] Sensitive DTO tests pass.

Phase 4 local implementation and automated gates are complete. Security-owner acceptance of ADR-0004/0005 and a staging proof against the configured Hercules issuer/JWKS remain required before authentication authority can move from Convex.

## Phase 5 — introduce the frontend data adapter

### Work

- Add a typed API client and TanStack Query.
- Create domain hooks independent of Convex.
- Move components away from direct `convex/react` imports.
- Initially let adapters call Convex.
- Add per-domain backend feature flags.
- Define consistent query keys and invalidation rules.

### Rule

Components call domain APIs such as:

```text
useDocuments
createDocument
useCases
updateTask
```

Components must not know whether Convex or Next.js serves the request.

### Exit gate

- [x] No component imports `convex/react` directly; CI source scanning prevents regressions.
- [x] Feature flags can switch each domain backend independently, defaulting safely to Convex.
- [x] Next.js and legacy Convex API errors are normalized as `ApiClientError`.

Phase 5 adapter foundations and exit gates are complete. Documents, cases and tasks now have backend-neutral hooks and representative staff-page adoption. Remaining screens use the isolated compatibility bridge until their domain migration phase; a flag must remain `convex` until its corresponding Next.js endpoints pass parity tests.

## Phase 6 — replace storage and document-processing infrastructure

### Work

- Create private object-storage buckets/prefixes.
- Add upload intents.
- Add short-lived presigned upload URLs.
- Upload into quarantine.
- Validate size, MIME and magic bytes.
- Calculate and verify SHA-256.
- Integrate antivirus/CDR scanning.
- Promote clean files into protected storage.
- Add short-lived authorized download URLs.
- Add abandoned-upload and rejected-file cleanup.
- Copy existing Convex storage files with checksum verification.

### Exit gate

- [x] Clean, infected, mismatched and oversized file tests pass.
- [x] Unauthorized file-download tests pass.
- [x] Storage migration tests preserve file count and SHA-256.
- [x] Failed scans use durable exponential retries, dead-letter state and structured events.

Phase 6 local implementation and automated gates are complete. Production bucket provisioning, a real ClamAV/CDR staging scan and execution of the Convex storage export migration remain deployment gates; they require approved infrastructure credentials, the immutable export and acceptance of ADR-0006.

## Phase 7 — replace actions, schedules and background work

### Jobs to move

- Malware scanning.
- OCR and thumbnail generation.
- Email and SMS.
- Task/hearing/signature reminders.
- Envelope expiration.
- Retention/disposition processing.
- Bulk downloads and ZIP creation.
- Analytics aggregation.

### Every job requires

- Tenant ID.
- Idempotency key.
- Retry/backoff policy.
- Dead-letter handling.
- Timeout.
- Structured logs.
- Audit event where required.
- Observable status.

### Exit gate

- [x] Retries cannot create duplicate business actions.
- [x] Dead-letter recovery is documented.
- [x] Scheduler only enqueues durable work.
- [x] Long-running tasks do not run inside web requests.

The PostgreSQL queue, worker, scheduler, admin inspection/retry endpoints, and local verification gates are complete. OCR, thumbnails, external email/SMS, records disposition, and ZIP generation remain fail-closed until their provider or policy prerequisites are implemented during the matching domain migration. See `doc/migration/PHASE_7_BACKGROUND_JOBS.md`.

## Phase 8 — migrate business domains vertically

Each domain migration must include:

1. PostgreSQL schema.
2. Repository/DAL.
3. Domain service.
4. Authorization policies.
5. Route Handler/Server Action.
6. Zod request/response contracts.
7. Audit and side effects.
8. Data migration.
9. Client adapter.
10. Unit, integration, contract and E2E tests.
11. Reconciliation.
12. Cutover and rollback.

### Domain order

#### 8.1 Firms, users, settings, sessions and audit

Foundation for all authenticated domains.

#### 8.2 Public CMS

Local status: `complete_local`. See `doc/migration/PHASE_8_2_PUBLIC_CMS.md` for the implemented surface, reconciliation evidence and rollback boundary.

- Practice areas.
- Testimonials.
- Blog.
- News/awards.
- Careers/job applications.
- Resources.
- Legal pages.
- Navigation.
- Newsletter.
- CMS settings.

#### 8.3 Clients, KYC, cases and conflict checks

Establishes ownership required by later domains.

Local status: `complete_local`. See `doc/migration/PHASE_8_3_MATTERS.md` for the ownership model, protected KYC pipeline, reconciliation evidence and rollback boundary.

#### 8.4 Hearings, tasks, SOPs, comments and research

Local status: `complete_local`. See `doc/migration/PHASE_8_4_WORK_MANAGEMENT.md` for the domain details.

- [x] **8.5 Time, invoices, payments, trust and expenses**
  - Use database transactions and idempotency keys for all financial commands.
  - Refactored frontend to use `useInvoices`, `useTimeEntries`, etc. hooks.
  - Developed `financial-migration.ts` to migrate records from Convex to Postgres.

#### 8.6 Leads and appointments

Local status: `complete_local`. See `doc/migration/PHASE_8_6_CRM.md` for the domain details.

- [x] **8.6 Leads and appointments**
  - Use domain-by-domain strangler pattern for the CRM module.
  - Developed `crm-migration.ts` for database migration.
  - Replaced Convex components with new React Query hooks `useLeads` and `useAppointments`.

#### Phase 8.7: Messages and notifications (Completed)
- **Domain:** Chat threads, read receipts, system notifications.
- **Backend:** `messages`, `notifications` table mappings. Realtime updates fallback to basic polling in the initial migration unless WebSockets are specifically requested.
- **Frontend:** `CommandCenter`, `ClientMessagesPage`, `notification-bell.tsx`.
- **References:** `convex/messages.ts`, `convex/notifications.ts`.

#### Phase 8.8 Documents, tags, versions, shares, retention and legal holds (Completed)

- **Domain:** Document management, file uploads, sharing, legal holds, tag assignment.
- **Backend:** `documents`, `documentTags`, `documentTagAssignments`, `documentShares` table mappings.
- **Frontend:** Hooks in `src/client/queries/documents.ts`.
- **References:** `convex/documents.ts`, `convex/documentSecurity.ts`.

#### Phase 8.9 Signature envelopes, recipients, OTP and certificates (Completed)

- **Domain:** Signature workflow, envelopes routing, and OTP challenges.
- **Backend:** `signatureEnvelopes`, `signatureRecipients`, `signingChallenges`.
- **Frontend:** Hooks in `src/client/queries/envelopes.ts`.
- **References:** `convex/envelopes.ts`.

#### Phase 8.10 Analytics and dashboards (Completed)

Migrate last because analytics depends on almost every domain.

### Exit gate per domain

- [ ] Every domain endpoint has a parity decision.
- [ ] Every frontend caller uses the adapter.
- [ ] Contract tests pass.
- [ ] Migration and reconciliation pass.
- [ ] Rollback is tested.
- [ ] Convex writes for the domain can be disabled.

Honest status: 8.1–8.3 are `complete_local`. 8.4–8.10 are partial or incomplete (finance/CRM APIs missing). Track remaining domain work only in `migration/REMAINING_WORK_PLAN.md` Phase R2 — do not mark this gate complete until that checklist is finished.

## Phase 9 — build repeatable data migration tooling

### Required commands

```text
migration export-convex --domain <domain>
migration import-postgres --domain <domain>
migration verify --domain <domain>
migration reconcile --domain <domain>
migration rollback --domain <domain>
```

### Required properties

- Idempotent.
- Resumable.
- Batched.
- Checkpointed.
- Logged.
- Safe to rerun.
- Dry-run capable.
- Able to produce an exception report.

### Reconciliation checks

- Row counts.
- Missing/extra IDs.
- Foreign-key integrity.
- Firm assignment.
- Nullability.
- Unique constraints.
- Financial totals.
- Document version chains.
- Signature routing.
- Audit ordering.
- Storage-object counts and SHA-256.
- Orphaned objects and records.

Invalid data must be written to `data-exceptions.csv`; it must never be silently discarded.

### Exit gate

- [ ] A production-like snapshot migrates successfully.
- [ ] Running the migration twice produces the same result.
- [ ] Reconciliation has zero unexplained differences.

Local progress: per-domain import scripts and a partial unified CLI exist. Full Phase 9 exit evidence is tracked in `migration/REMAINING_WORK_PLAN.md` Phase R3.

## Phase 10 — shadow, contract and security testing

### Work

- Run identical fixtures against Convex and Next.js.
- Normalize timestamps/generated values.
- Compare responses and side effects.
- Shadow selected production reads without serving Next.js results.
- Compare authorization outcomes.
- Run load and failure tests.

### Required test suites

- Unit tests for services/policies.
- PostgreSQL integration tests.
- Contract parity tests.
- Data-migration tests.
- Client/staff/partner/admin E2E tests.
- Cross-firm security tests.
- File and malware tests.
- Financial idempotency tests.
- Signature/OTP workflow tests.
- Search/pagination tests.
- Performance/load tests.

### Exit gate

- [ ] No unexplained contract differences.
- [ ] No cross-tenant leakage.
- [ ] Performance meets agreed thresholds.
- [ ] Failure and retry behavior is proven.

Local progress: some domain contract unit tests exist. Full Phase 10 exit evidence is tracked in `migration/REMAINING_WORK_PLAN.md` Phase R4.

## Phase 11 — migrate the Vite/React frontend to Next.js

### Work

- Reuse presentational components and Tailwind styling.
- Convert React Router routes to App Router route groups.
- Create public, client, staff and admin layouts.
- Keep interactive widgets as Client Components.
- Use Server Components for suitable read-oriented pages.
- Call DAL/services directly from Server Components.
- Use Route Handlers for browser/external API traffic.
- Preserve existing URLs or provide tested redirects.
- Replace Convex providers and authentication hooks.

### Exit gate

- [ ] Every current route has an equivalent or redirect.
- [ ] Role layouts and guards work.
- [ ] Browser navigation and deep links work.
- [ ] No active page depends directly on Convex.

## Phase 12 — controlled production cutover

### Per-domain runbook

1. Confirm backup and rollback readiness.
2. Enable temporary domain write freeze.
3. Export the final Convex delta.
4. Import the delta into PostgreSQL.
5. Run reconciliation.
6. Switch the domain feature flag to Next.js.
7. Keep Convex read-only.
8. Monitor errors, latency, denials and data counts.
9. Roll back immediately if thresholds fail.
10. End the write freeze after verification.
11. Disable Convex domain functions after the soak period.

### Suggested soak periods

| Domain             | Minimum suggested soak |
| ------------------ | ---------------------- |
| Public CMS         | 2–3 days               |
| Tasks/appointments | 3–7 days               |
| Cases/documents    | 7–14 days              |
| Billing/signatures | 14+ days               |

Cutting over all domains in one deployment is prohibited.

### Exit gate

- [ ] Next.js is the authoritative writer for every domain.
- [ ] Convex is read-only.
- [ ] Reconciliation remains clean after soak periods.
- [ ] Rollback window has expired with approval.

## Phase 13 — decommission Convex

Searches for these must return no active application usage:

```text
convex/react
useConvexAuth
useQuery(
useMutation(
useAction(
api.
convex/_generated
VITE_CONVEX
CONVEX_DEPLOYMENT
```

### Work

- Create a final immutable Convex export.
- Archive data reconciliation and storage checksum reports.
- Preserve the final backup for the required period.
- Remove Convex providers and hooks.
- Remove generated bindings.
- Remove `src/lib/convex-mock.tsx` after replacement fixtures exist.
- Remove the `convex/` directory.
- Remove Convex dependencies and environment variables.
- Update deployment, CI and operational documentation.
- Run complete E2E, security and disaster-recovery tests.

### Exit gate

- [ ] Zero application dependency on Convex.
- [ ] Final backup is verified and restorable.
- [ ] Production has passed the final soak period.
- [ ] Decommission is approved by engineering and business owners.

## 9. Definition of done for every migrated endpoint

An endpoint cannot be marked complete until:

- [ ] Convex behavior is documented.
- [ ] Target decision is recorded.
- [ ] Request validation exists.
- [ ] Authentication exists where required.
- [ ] Firm/tenant isolation exists.
- [ ] Capability/ownership authorization exists.
- [ ] Service and repository are implemented.
- [ ] Transaction boundaries are correct.
- [ ] Audit and side effects are implemented.
- [ ] Error responses are normalized.
- [ ] Unit tests pass.
- [ ] Integration tests pass.
- [ ] Contract tests pass.
- [ ] Frontend adapter is switched.
- [ ] Data reconciliation passes.
- [ ] Monitoring exists.
- [ ] Rollback is documented and tested.

## 10. Anti-duplication checklist

- [ ] One shared contract per request/response.
- [ ] One service method per business operation.
- [ ] One authorization policy per capability/resource rule.
- [ ] One repository per aggregate/data boundary.
- [ ] One audit service.
- [ ] One storage adapter.
- [ ] One notification adapter.
- [ ] One frontend API adapter per domain.
- [ ] No SQL in React components, Server Actions or Route Handlers.
- [ ] No authorization implemented only in the UI.
- [ ] No direct provider SDK calls outside infrastructure adapters.
- [ ] No separate client/staff copy of the same rule.

## 11. Anti-drift operating process

During migration:

1. Every pull request references parity-inventory rows.
2. Every changed Convex function updates its target contract.
3. Every new feature states which backend is authoritative.
4. Contract tests run in CI.
5. Schema changes require migrations and mapping updates.
6. Weekly review compares code status with the parity inventory.
7. Domain status changes require evidence links.
8. No endpoint is marked retired based only on a filename search; runtime and route callers must also be checked.

## 12. Rollback strategy

Rollback is per domain, not necessarily the whole application.

Before each cutover:

- Preserve the final Convex snapshot.
- Preserve the PostgreSQL pre-cutover snapshot.
- Keep the frontend backend selector configurable.
- Keep Convex read functions available during the soak period.
- Define whether post-cutover PostgreSQL writes can be replayed to Convex.
- If replay is not safe, rollback must include a write freeze and reverse migration.

Immediate rollback triggers include:

- Cross-firm data exposure.
- Missing or duplicated financial transactions.
- Document/storage checksum mismatch.
- Broken signature evidence.
- Sustained elevated server errors.
- Reconciliation divergence.
- Authentication/session failures above the agreed threshold.

## 13. Major risks

| Risk                             | Mitigation                                               |
| -------------------------------- | -------------------------------------------------------- |
| Missing Convex behavior          | Endpoint and consumer parity inventories                 |
| Split-brain writes               | One authoritative writer per domain                      |
| Cross-firm leakage               | Central policies, firm IDs, integration/security tests   |
| Broken IDs/relations             | Preserve Convex IDs initially                            |
| File loss                        | Copy verification using count, size and SHA-256          |
| Duplicate financial actions      | Transactions and idempotency keys                        |
| Lost realtime behavior           | Explicit polling/SSE/WebSocket decision per feature      |
| Lost scheduled behavior          | Job inventory, durable queue and retry tests             |
| Authorization drift              | Contract/security tests and centralized DAL              |
| Long-running serverless failures | Dedicated worker infrastructure                          |
| Irreversible cutover             | Domain flags, backups, write freeze and rollback runbook |
| Scope expansion                  | ADRs, change control and weekly parity review            |

## 14. Progress dashboard

Update this table as the migration proceeds. For remaining detailed work, ownership checklists and post-migration cleanup, use [`migration/REMAINING_WORK_PLAN.md`](migration/REMAINING_WORK_PLAN.md).

| Phase                      | Status                         | Owner | Target | Evidence                                              |
| -------------------------- | ------------------------------ | ----- | ------ | ----------------------------------------------------- |
| 0. Strategy and governance | Approved; named roles pending  | TBD   | TBD    | `PHASE_0_GOVERNANCE.md`                               |
| 1. Inventory               | Complete (static)              | TBD   | TBD    | `doc/migration/*.csv`, `INVENTORY_SUMMARY.md`         |
| 2. Next.js foundation      | Complete locally; ADR/CI gaps  | TBD   | TBD    | `PHASE_2_FOUNDATION.md`                               |
| 3. PostgreSQL schema       | Complete locally               | TBD   | TBD    | `POSTGRES_SCHEMA_DESIGN.md`, drizzle tests            |
| 4. Auth and authorization  | Complete locally               | TBD   | TBD    | `PHASE_4_AUTHORIZATION.md`                            |
| 5. Frontend adapter        | Complete                       | TBD   | TBD    | `PHASE_5_FRONTEND_DATA_ADAPTER.md`                    |
| 6. Storage                 | Complete locally               | TBD   | TBD    | `PHASE_6_DOCUMENT_STORAGE.md`                         |
| 7. Jobs and schedules      | Complete locally; some blocked | TBD   | TBD    | `PHASE_7_BACKGROUND_JOBS.md`                          |
| 8. Domain migrations       | Partial                        | TBD   | TBD    | `REMAINING_WORK_PLAN.md` Phase R2                     |
| 9. Data tooling            | Partial                        | TBD   | TBD    | `REMAINING_WORK_PLAN.md` Phase R3                     |
| 10. Shadow/contract tests  | Not complete                   | TBD   | TBD    | `REMAINING_WORK_PLAN.md` Phase R4                     |
| 11. Next.js frontend       | Not started in practice        | TBD   | TBD    | Vite `src/pages` still authoritative UI               |
| 12. Production cutover     | Not started                    | TBD   | TBD    | Local dress rehearsal first (`REMAINING` Phase R6)    |
| 13. Convex decommission    | Not started                    | TBD   | TBD    | Cleanup waves in `REMAINING_WORK_PLAN.md` Phase R8    |

## 15. Immediate next actions

Follow [`migration/REMAINING_WORK_PLAN.md`](migration/REMAINING_WORK_PLAN.md). Short version:

1. Accept the remaining-work plan and name owners (Phase R0).
2. Prove domains with `VITE_USE_MOCK=false` (mock currently forces Convex).
3. Finish Phase 8 in order: work management → **finance APIs** → **CRM APIs** → communication → documents → envelopes → analytics.
4. Complete unified migration CLI + reconcile reports (Phase 9 / R3).
5. Run contract/security proving (Phase 10 / R4).
6. Only then move Vite UI to Next.js (Phase 11 / R5).
7. Local cutover dress rehearsal, then production readiness, then Convex decommission + cleanup (Phases 12–13 / R6–R8).

## References

- [Next.js App Router](https://nextjs.org/docs/app)
- [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
- [Next.js Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend)
- [Next.js Authentication and Authorization](https://nextjs.org/docs/app/guides/authentication)
