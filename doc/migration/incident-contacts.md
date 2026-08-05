# Incident commander and rollback contacts (R7.7)

**Status:** Template — fill before any production cutover. Empty `TBD` fails R7.7.  
**Related:** [`rollback-runbook.md`](rollback-runbook.md), [`production-readiness.md`](production-readiness.md), [`cutover-runbook.md`](cutover-runbook.md)

## Authority

| Role | Name | Backup | Phone / pager | Email | Notes |
| --- | --- | --- | --- | --- | --- |
| Incident commander | TBD | TBD | TBD | TBD | Authorizes freeze / rollback |
| Migration owner | TBD | TBD | TBD | TBD | Domain flag flips |
| Data owner | TBD | TBD | TBD | TBD | Reconcile / restore |
| Security owner | TBD | TBD | TBD | TBD | Auth / exposure incidents |
| Platform / ops on-call | TBD | TBD | TBD | TBD | Infra paging |
| Legal / records (as needed) | TBD | TBD | TBD | TBD | Holds / residency |

## Escalation channel

| Field | Value |
| --- | --- |
| Primary channel | TBD (e.g. PagerDuty / Slack #lexnepal-incidents) |
| Stakeholder notify list | TBD |
| Status page / customer comms | TBD |

## Rollback decision targets (copy approved values from ADR-0015 when accepted)

| Objective | Draft (from rollback-runbook) | Approved |
| --- | --- | --- |
| Decision window | 60 minutes after authority switch | TBD |
| RTO | 60 minutes from decision | TBD |
| RPO | Zero acknowledged writes lost | TBD |
| Convex rollback availability | 30 calendar days | TBD |

## Sign-off

| Environment | Commander | Date | Signature / ticket |
| --- | --- | --- | --- |
| Staging rehearsal | TBD | | |
| First production domain cutover | TBD | | |
