# Migration Status Vocabulary

Use these exact machine-readable values in `endpoint-parity.csv`. Do not introduce synonyms such as `done`, `WIP`, `ready`, or `migrated`.

| Status | Entry condition | Exit evidence |
|---|---|---|
| `not_started` | Item is known but no inventory evidence exists | Inventory fields completed |
| `inventoried` | Source export, callers, tables, auth and side effects are recorded | Target design approved |
| `designed` | Decision, target service/interface, schemas and migration approach are recorded | Code and migrations implemented |
| `implemented` | Target behavior exists behind a non-production path or flag | Contract/integration/security tests pass |
| `contract_tested` | Required tests demonstrate parity or approved replacement behavior | Data migration rehearsal passes |
| `data_migrated` | Production-target data is imported and reconciliation is within approved tolerance | Every frontend caller uses target path |
| `frontend_switched` | Target is authoritative for intended users/domain; no active frontend Convex caller remains | Production observation period succeeds |
| `production_verified` | SLOs, audit/security checks and reconciliation pass for approved observation period | Convex export is disabled/removed |
| `convex_retired` | Convex function/data path is disabled, archived as required and has no caller | Terminal state |

## Rules

- Status only moves when evidence is linked in the parity row.
- A status may move backward when a regression invalidates its evidence.
- `retire`, `replace`, `merge`, `migrate`, and `currently_simulated` are decisions, not statuses.
- `blocked` is tracked in the issue system or notes with a blocking reason; it does not replace the last proven status.
- Each row has exactly one accountable owner.
- `production_verified` requires both technical evidence and domain-owner acceptance.
- `convex_retired` cannot be assigned while an active caller or rollback dependency remains.

## Weekly reporting

Report the number of rows in every status, plus:

- Rows without owners.
- Rows without decisions.
- Rows that moved backward.
- Blocked rows and blocker age.
- Rows changed by feature work since the prior review.
