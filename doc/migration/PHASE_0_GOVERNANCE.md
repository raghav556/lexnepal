# Phase 0 Governance and Scope Control

**Status:** Organizational approval recorded; named operational assignments pending  
**Prepared:** 2026-08-02  
**Applies to:** LexNepal Convex-to-Next.js migration

This document turns Phase 0 of the migration plan into an approval record. It does not claim organizational approval. The accountable people named below must replace every `TBD` and approve the record before Phase 0 closes.

## 1. Approval record

| Decision | Accountable owner | Status | Date | Evidence |
|---|---|---|---|---|
| Migration scope and strategy | Project owner | Approved | 2026-08-02 | Approval recorded through the repository work session |
| Technical architecture direction | Project owner; migration owner `TBD` | Approved to scaffold; ADR approvals still required | 2026-08-02 | Master plan and ADR backlog |
| Security and tenant-isolation baseline | Security owner — `TBD` | Approved as non-regression baseline | 2026-08-02 | Master plan security baseline |
| Production data retention | Records/legal owner — `TBD` | Pending specialist approval | — | Approved retention schedule required |
| Cutover downtime and rollback targets | Operations owner — `TBD` | Pending target approval | — | Approved runbook/SLO required |

Approval must be recorded in version control or linked to an immutable decision record. Verbal approval alone does not close Phase 0.

## 2. Controlled scope

### In scope

- Replace all Convex queries, mutations, actions, schedules, storage usage and frontend consumers.
- Introduce Next.js App Router as the application and API layer.
- Introduce PostgreSQL as the authoritative application database.
- Preserve or strengthen authentication, firm isolation, capability authorization and audit behavior.
- Replace file storage, malware scanning, background jobs, notifications, search and required realtime behavior.
- Migrate and reconcile production data and files.
- Move the Vite/React frontend to Next.js after the backend compatibility layer is stable.
- Cut over domain by domain, retain rollback capability and decommission Convex only after verification.

### Out of scope unless approved through change control

- Unrelated product features or broad UI redesigns.
- Replacing the current identity provider during the initial backend migration.
- UUID modernization while legacy Convex IDs are being migrated.
- Microservice decomposition unrelated to a demonstrated operational requirement.
- Provider changes after an architecture decision is accepted.

### Security acceptance baseline

The replacement must preserve firm isolation, document capabilities, server-side resource validation, legal holds, retention enforcement, protected public sharing, upload quarantine, malware scanning, and audit events. A security regression blocks cutover.

## 3. Ownership model

One person may hold multiple roles, but every role must have a named primary and backup.

| Role | Primary | Backup | Accountability |
|---|---|---|---|
| Executive/product sponsor | `TBD` | `TBD` | Scope, priority and business downtime approval |
| Migration owner | `TBD` | `TBD` | Overall delivery, parity ledger and exit gates |
| Next.js/API owner | `TBD` | `TBD` | API contracts, services and frontend migration |
| Data/PostgreSQL owner | `TBD` | `TBD` | Schema, migrations, reconciliation and recovery |
| Security owner | `TBD` | `TBD` | AuthN/AuthZ, tenant boundaries, threat review |
| Documents/records owner | `TBD` | `TBD` | Documents, retention, legal holds and disposal |
| Platform/operations owner | `TBD` | `TBD` | Hosting, storage, queues, observability and cutover |
| QA/release owner | `TBD` | `TBD` | Contract, integration, E2E and release evidence |

### Domain review ownership

Every parity-ledger row must have an implementation owner and reviewer. The reviewer cannot be the only author of the change.

| Domain | Required reviewer role | Named reviewer |
|---|---|---|
| Identity, users and firms | Security owner | `TBD` |
| Cases, clients and contacts | API/data owner | `TBD` |
| Documents, versions and tags | Documents/records owner | `TBD` |
| Sharing, signatures and envelopes | Security owner | `TBD` |
| Billing, time and expenses | Product/data owner | `TBD` |
| Tasks, calendar and workflows | Product/API owner | `TBD` |
| Communications and notifications | Platform/security owner | `TBD` |
| Admin, audit and settings | Security owner | `TBD` |
| Reporting and dashboards | Data/QA owner | `TBD` |

## 4. Change and feature-freeze policy

The freeze becomes effective when the sponsor approves this document.

- No new Convex capability may merge without a migration-impact label and parity-ledger update.
- Critical production fixes may proceed, but must be ported to the Next.js target in the same change or tracked as an explicit blocking item.
- Security, legal, data-loss and availability fixes are never delayed by the freeze.
- Every schema or contract change must update mappings, tests and migration scripts.
- Scope changes require a short written impact analysis and approval from the migration owner plus affected domain owner.
- Unrecorded side work is prohibited. Work starts only after it appears in the parity ledger, ADR backlog, or risk register.

Suggested pull-request labels: `migration`, `convex-freeze-exception`, `parity-required`, `security`, `data-migration`, and `cutover-blocker`.

## 5. Review cadence

Hold a 30-minute migration review once each week. The migration owner schedules it after being nominated.

Required inputs:

- Endpoint-parity counts by controlled status.
- Unmapped tables, functions, callers and storage operations.
- Open ADRs that block the next phase.
- High/critical risks, newly raised risks and overdue mitigations.
- Data-reconciliation exceptions.
- Security findings and operational incidents.
- Decisions and scope changes since the previous review.

Required outputs:

- Updated owners, due dates and risk states in version control.
- Recorded decisions and ADR approvals.
- Explicit go/no-go decision for the next exit gate when applicable.

## 6. Proposed service targets for approval

These are conservative starting targets, not approved production commitments.

| Objective | Proposal | Approval status |
|---|---|---|
| Planned final write freeze | No more than 30 minutes | Pending |
| Read-only/unavailable window | No more than 15 minutes | Pending |
| Recovery point objective | 5 minutes at cutover; zero acknowledged writes lost | Pending |
| Recovery time objective | 60 minutes from rollback decision | Pending |
| Rollback decision window | 60 minutes after PostgreSQL becomes authoritative | Pending |
| Convex rollback availability | 30 calendar days after final cutover | Pending |
| Pre-cutover database backup retention | At least 90 days | Pending |
| Migration evidence retention | At least 7 years, subject to legal approval | Pending |

The records/legal owner must separately approve how long source exports, file copies, audit evidence and reconciliation reports are retained. Legal holds override normal deletion schedules.

## 7. Phase 0 exit checklist

- [ ] Sponsor and migration owner have approved the controlled scope.
- [ ] Every ownership role has a named primary and backup.
- [ ] Domain review ownership is accepted.
- [ ] Feature-freeze policy is effective and communicated.
- [ ] Downtime, RPO, RTO, rollback window and retention are approved.
- [ ] Weekly review has a named chair, participants and recurring time.
- [ ] Every active migration task is represented in a controlled artifact.
- [ ] Initial risks have owners and review dates.
- [ ] Architecture-decision backlog has accountable owners.
- [ ] Status vocabulary is accepted without local variants.

Phase 0 is complete only when all boxes above are checked and the master plan links to the approval evidence.
