# Migration Rollback Runbook

**Status:** Draft for Phase 0 approval; operational commands are added and rehearsed in later phases  
**Incident commander:** Migration/operations owner — `TBD`

This runbook defines rollback expectations. It is not executable until provider decisions, environment-specific commands, contacts and rehearsal evidence have been added.

## 1. Rollback principles

- A domain has exactly one authoritative writer at a time.
- Prefer rollback before accepting writes in PostgreSQL.
- Never point writes back to Convex until post-cutover PostgreSQL writes are accounted for.
- Preserve databases, exports, logs, write journals and object versions during an incident.
- Legal holds and retention rules remain effective during rollback.
- Only the incident commander authorizes rollback; the data and security owners must participate when writes or sensitive data are affected.

## 2. Proposed objectives

| Objective | Proposed target | Approved value |
|---|---:|---|
| Rollback decision window | 60 minutes after authority switch | `TBD` |
| Recovery time objective | 60 minutes from decision | `TBD` |
| Recovery point objective | Zero acknowledged writes lost | `TBD` |
| Convex rollback availability | 30 calendar days | `TBD` |

## 3. Immediate rollback triggers

- Confirmed cross-firm data exposure or authorization bypass.
- Data loss, corrupt relationships, missing files or unexplained reconciliation variance above the approved threshold.
- Legal-hold, retention or disposal enforcement failure.
- Critical document upload/download/share/signature workflow failure.
- Sustained error rate, latency or availability beyond approved SLO thresholds.
- Audit events are missing for security-sensitive mutations.
- Rollback or restore capability itself is found to be unreliable.

## 4. Pre-cutover evidence required

- [ ] Timestamped, encrypted Convex data export with manifest and checksums.
- [ ] Object/file inventory with content hashes and version metadata.
- [ ] PostgreSQL backup/PITR verification.
- [ ] Reconciliation report signed by data and domain owners.
- [ ] Feature flags or routing controls tested in both directions.
- [ ] Write freeze and maintenance-mode behavior tested.
- [ ] Post-cutover write journal tested for completeness and replay safety.
- [ ] Provider-specific recovery commands reviewed and rehearsed.
- [ ] Contact/escalation list and incident communication channel recorded.

## 5. Decision procedure

1. Declare a migration incident and name the incident commander and scribe.
2. Stop new domain writes using the tested write-freeze control.
3. Record the time of last confirmed Convex write and first PostgreSQL write.
4. Capture current logs, metrics, database state and reconciliation evidence.
5. Classify rollback path:
   - **Path A:** No PostgreSQL writes accepted — route reads/writes back to Convex.
   - **Path B:** PostgreSQL writes accepted and safely reversible — reconcile/replay the journal, verify, then restore Convex authority.
   - **Path C:** PostgreSQL writes accepted but not safely reversible — remain read-only, recover forward or execute a separately approved reverse migration. Do not silently discard writes.
6. Obtain authorization from the incident commander, data owner and security owner where applicable.
7. Execute the rehearsed environment-specific procedure.
8. Run smoke, tenant-isolation, row/file-count and checksum checks.
9. Reopen reads, then writes, only after the owners accept verification evidence.
10. Notify stakeholders and open a post-incident review.

## 6. Domain rollback record

Complete this table during every rehearsal and incident.

| Field | Value |
|---|---|
| Domain | |
| Environment | |
| Incident/rehearsal ID | |
| Decision time | |
| Last Convex write | |
| First/last PostgreSQL write | |
| Selected path | A / B / C |
| Backups/exports used | |
| Write-journal range | |
| Reconciliation result | |
| Authority restored at | |
| Approved by | |
| Follow-up actions | |

## 7. Phase 0 approval boundary

Phase 0 approval confirms the rollback model and target values. Phase 2 must add provider recovery procedures; Phase 9 must add migration rollback commands; Phase 10 must attach successful rehearsal evidence. No production cutover may rely on this draft alone.
