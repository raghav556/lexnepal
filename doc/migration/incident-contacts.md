# Incident commander and rollback contacts (R7.7)

**Status:** Local-only placeholders filled for operator clarity. **Does not satisfy production R7.7** until real on-call contacts replace TBD cloud fields.  
**Related:** [`rollback-runbook.md`](rollback-runbook.md), [`production-readiness.md`](production-readiness.md), [`cutover-runbook.md`](cutover-runbook.md), [`LOCAL_PRODUCTION_SHAPED.md`](LOCAL_PRODUCTION_SHAPED.md)

## Authority

| Role | Name | Backup | Phone / pager | Email | Notes |
| --- | --- | --- | --- | --- | --- |
| Incident commander | Local operator (dev machine) | — | — | local-only | Authorizes local freeze / restore drill |
| Migration owner | Local operator | — | — | local-only | Domain verify / seed |
| Data owner | Local operator | — | — | local-only | `local:pg:backup` / restore drill |
| Security owner | Local operator | — | — | local-only | Auth verify scripts |
| Platform / ops on-call | Local operator | — | — | local-only | `local:infra:start` |
| Legal / records (as needed) | TBD (prod) | TBD | TBD | TBD | Holds / residency — **R7** |

## Escalation channel

| Field | Value |
| --- | --- |
| Primary channel | local-only (no pager) — replace for R7 |
| Stakeholder notify list | TBD (prod) |
| Status page / customer comms | TBD (prod) |

## Rollback decision targets (copy approved values from ADR-0015 when accepted)

| Objective | Draft (from rollback-runbook) | Approved |
| --- | --- | --- |
| Decision window | 60 minutes after authority switch | TBD (prod) |
| RTO | 60 minutes from decision | TBD (prod) |
| RPO | Zero acknowledged writes lost | TBD (prod) |
| Convex rollback availability | Archive zip only (flag-flip gone) | local archive path |

## Sign-off

| Environment | Commander | Date | Signature / ticket |
| --- | --- | --- | --- |
| Local production-shaped gate | Local operator | 2026-08-07 | local-only |
| Staging rehearsal | TBD | | R7 |
| First production domain cutover | TBD | | R7 |
