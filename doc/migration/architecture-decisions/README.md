# Architecture Decision Backlog

**Status:** Decisions pending  
**Decision owner:** Migration owner — `TBD`

Use one Architecture Decision Record (ADR) per row. ADRs are immutable after acceptance; supersede an old ADR with a new one rather than rewriting history.

## ADR workflow

Allowed statuses are `proposed`, `accepted`, `rejected`, `superseded`, and `deprecated`.

Each ADR must contain:

1. Title, date, status, owner and reviewers.
2. Context and constraints.
3. Options considered.
4. Decision and rationale.
5. Security, data, operational, cost and migration consequences.
6. Validation or proof-of-concept evidence.
7. Rollback/reversibility notes.

File names use `NNNN-short-title.md`, beginning with `0001`.

## Backlog

| Proposed ADR | Decision                                                   | Required by                       | Accountable role           | Status                                                      |
| ------------ | ---------------------------------------------------------- | --------------------------------- | -------------------------- | ----------------------------------------------------------- |
| ADR-0001     | Next.js hosting/runtime platform and region                | Phase 2                           | Platform owner             | Proposed                                                    |
| ADR-0002     | PostgreSQL provider, region, HA, PITR and backup retention | Phase 2                           | Data owner                 | Proposed — acceptance criteria documented                   |
| ADR-0003     | Drizzle versus Prisma                                      | Phase 2                           | API/data owners            | Accepted — Drizzle                                          |
| ADR-0004     | Existing identity-provider integration                     | Phase 2                           | Security owner             | Proposed — implementation evidence documented               |
| ADR-0005     | Session storage and revocation                             | Phase 2                           | Security owner             | Proposed — implementation evidence documented               |
| ADR-0006     | Private object storage, regions and lifecycle              | Phase 2                           | Platform/records owners    | Proposed — S3-compatible implementation evidence documented |
| ADR-0007     | Queue, worker and dead-letter platform                     | Phase 2                           | Platform owner             | Accepted — PostgreSQL durable queue                         |
| ADR-0008     | Scheduler platform                                         | Phase 2                           | Platform owner             | Accepted — PostgreSQL enqueue-only scheduler                |
| ADR-0009     | Email and SMS provider                                     | First communication-domain design | Platform/product owners    | Proposed                                                    |
| ADR-0010     | Search implementation and indexing                         | First search-domain design        | Data/API owners            | Proposed                                                    |
| ADR-0011     | Polling, SSE or WebSockets by workflow                     | First realtime workflow           | API owner                  | Proposed                                                    |
| ADR-0012     | Logs, metrics, traces, errors and retention                | Phase 2                           | Operations/security owners | Proposed                                                    |
| ADR-0013     | Secrets management and rotation                            | Phase 2                           | Security/platform owners   | Proposed                                                    |
| ADR-0014     | Nepal data-residency and legal constraints                 | Phase 2                           | Legal/security owners      | Proposed                                                    |
| ADR-0015     | Cutover rollback window, RPO/RTO and backup retention      | Phase 2                           | Operations/data owners     | Proposed                                                    |
| ADR-0016     | API contract/versioning and compatibility policy           | Phase 2                           | API owner                  | Accepted                                                    |
| ADR-0017     | Authoritative-writer switching and write-journal design    | Before first domain cutover       | Data/migration owners      | Proposed                                                    |
| ADR-0018     | Isolate Next.js while legacy `src/pages` exists            | Phase 2                           | Migration/API owners       | Accepted                                                    |
| ADR-0019     | Local ClamAV requirement and CDR deferral                  | Phase 6                           | Security/documents owners  | Accepted locally; production review required                |
| ADR-0020     | PostgreSQL-backed local identity authority                 | Phase 8.1                         | Security/migration owners  | Accepted locally                                            |
| ADR-0021     | Private KYC object security                                | Phase 8.3                         | Security/matters owners    | Accepted locally                                            |

## ADR template

```markdown
# ADR-NNNN: Decision title

- Status: proposed
- Date: YYYY-MM-DD
- Owner: Name
- Reviewers: Names/roles

## Context

## Decision drivers

## Options considered

## Decision

## Consequences

## Security and data impact

## Operational and cost impact

## Migration and rollback impact

## Evidence
```
