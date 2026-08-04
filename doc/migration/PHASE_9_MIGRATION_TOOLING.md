# Phase 9: Unified migration tooling (R3)

## Status

`complete_local` for localhost Phase R3 (**exit gate met**). Production-scale rehearsal remains later under R6/R7.

## Anti-duplication rule (followed)

- **Do not rewrite importers.** Domain modules call existing `src/server/services/*-migration.ts` (and storage helpers).
- Replaced earlier CLI stub rewrites for `identity` / `documents` that duplicated incomplete import logic.
- Keep per-domain npm scripts (`migration:identity`, …) as thin entry points; unified CLI is the operator path.

## Commands

```powershell
npm run migration -- list
npm run migration -- export-convex --domain identity --export-path tests/fixtures/convex-identity-export
npm run migration -- import-postgres --domain identity --dry-run --export-path tests/fixtures/convex-identity-export --firm-map tests/fixtures/convex-identity-firm-map.json
npm run migration -- import-postgres --domain identity --export-path tests/fixtures/convex-identity-export --firm-map tests/fixtures/convex-identity-firm-map.json
npm run migration -- verify --domain identity
npm run migration -- reconcile --domain identity --export-path tests/fixtures/convex-identity-export --firm-map tests/fixtures/convex-identity-firm-map.json
npm run migration -- rollback --domain hr --dry-run --export-path tests/fixtures/convex-hr-export
npm run migration:prove-double-run
npm run migration:prove-checkpoint
npm run migration:prove-exceptions
npm run migration:prove-reconciliation
npm run migration:prove-storage
npm run migration:rehearse-all
```

### R3.6 Storage objects

`--domain storage` wraps existing helpers only:

1. `convertConvexStorageExport` — firm ownership + SHA from Convex `_storage` export  
2. `migrateLegacyStorage` — copy to MinIO + journal SHA verify  

```powershell
npm run migration -- import-postgres --domain storage --dry-run --export-path tests/fixtures/convex-export --firm-map tests/fixtures/convex-export/firm-map.json
npm run migration -- import-postgres --domain storage --export-path tests/fixtures/convex-export --firm-map tests/fixtures/convex-export/firm-map.json
npm run migration -- verify --domain storage
npm run migration -- reconcile --domain storage --export-path tests/fixtures/convex-export --firm-map tests/fixtures/convex-export/firm-map.json
npm run migration:prove-storage
```

Dry-run inventories `_storage` row counts (no MinIO writes). Real import is idempotent; double-run included in `migration:prove-double-run`.

### R3.5 Reconciliation report

Each `import-postgres` / `verify` / `reconcile` appends to `doc/migration/reconciliation-report.md` with these sections:

| Section | Source |
| --- | --- |
| Counts | Export vs Postgres row checks |
| Missing IDs | Failed rows / legacy IDs absent in Postgres |
| FK integrity | Exception reasons classified as FK (case/client/user/firm map) |
| Financial totals | Export ↔ Postgres sums (invoice total/subtotal/VAT, expenses, trust, time) |
| File SHA-256 | `storage_migration_items` expected vs actual |

Proof: `npm run migration:prove-reconciliation`

### R3.4 Exception reporting

| Artifact | Role |
| --- | --- |
| `doc/migration/data-exceptions.csv` | Raw ledger — **every** failed/mismatched row is appended (never silently dropped) |
| `doc/migration/approved-exceptions.csv` | Operator approvals (rehearsal step 6). Match on domain/table/id/type (+ optional reasonContains) |

- Import and reconcile always write exceptions to the raw CSV before failing.
- `reconcile` exits `0` only when **unexplained** count is 0 (approved rows still appear in the raw CSV).
- Nested field skips (e.g. unmapped `readBy` user on an otherwise migrated message) do not drop the parent row; primary entity failures always `exceptions.push`.
- Proof: `npm run migration:prove-exceptions` (bad HR leave → CSV → fail reconcile → approve → pass).

### R3.3 Checkpoint / dry-run model

| Mechanism | Behavior |
| --- | --- |
| `--dry-run` | Inventories export row counts; **no Postgres writes**; checkpoint status `dry-run` (not resume-eligible) |
| `.migration-state.json` | Stores per-domain checkpoint: fingerprint, export path, status, checks |
| `--resume` | Skips real import when fingerprint + path match a prior `imported` checkpoint |
| `--force` | Ignores checkpoint; re-runs existing `migrate*Export` (safe via `legacyConvexId` upserts) |
| `processTable` offsets | Available for streaming adapters; service-backed domains rely on full-table idempotency instead of mid-file resume |

```powershell
npm run migration -- import-postgres --domain hr --dry-run --export-path tests/fixtures/convex-hr-export --firm-map tests/fixtures/convex-identity-firm-map.json --orphan-firm 61000000-0000-4000-8000-000000000001
npm run migration -- import-postgres --domain hr --export-path tests/fixtures/convex-hr-export --firm-map tests/fixtures/convex-identity-firm-map.json --orphan-firm 61000000-0000-4000-8000-000000000001
npm run migration -- import-postgres --domain hr --resume --export-path tests/fixtures/convex-hr-export --firm-map tests/fixtures/convex-identity-firm-map.json --orphan-firm 61000000-0000-4000-8000-000000000001
npm run migration -- import-postgres --domain hr --force --export-path tests/fixtures/convex-hr-export --firm-map tests/fixtures/convex-identity-firm-map.json --orphan-firm 61000000-0000-4000-8000-000000000001
```

## Registered domains

| Domain | Importer |
| --- | --- |
| identity | `migrateIdentityExport` |
| cms | `migrateCmsExport` |
| matters | `migrateMattersExport` |
| work-management | `migrateWorkManagementExport` |
| financial | `migrateFinancialExport` |
| crm | `migrateCrmExport` |
| communication | `migrateCommunicationExport` |
| documents | `migrateDocuments` / `migrateDocumentShares` |
| envelopes | `migrateEnvelopeExport` |
| hr | `migrateHrExport` |
| analytics | **no-op** (read model; no Convex export) |
| storage | convert + `migrateLegacyStorage` |

## Artifacts

| Artifact | Path |
| --- | --- |
| Exceptions CSV (raw) | `doc/migration/data-exceptions.csv` |
| Approved exceptions | `doc/migration/approved-exceptions.csv` |
| Reconciliation report | `doc/migration/reconciliation-report.md` |
| Last domain reports | `.migration-reports/<domain>.json` (gitignored) |
| Checkpoint state | `.migration-state.json` (gitignored) |

## Exit gate evidence (localhost)

- [x] R3.1 Unified CLI commands: export-convex / import-postgres / verify / reconcile / rollback / list
- [x] R3.2 All planned domains registered (+ hr; analytics documented no-op)
- [x] R3.2 Local rehearsal sequence for **every** fixture domain: `npm run migration:rehearse-all`
- [x] R3.3 Dry-run inventories without writes; fingerprint checkpoints; `--resume` / `--force`; `migration:prove-checkpoint` passed
- [x] R3.3 Service-backed domains keep `legacyConvexId` idempotency (no importer rewrite for mid-batch streaming)
- [x] R3.4 Exceptions append to `doc/migration/data-exceptions.csv`; approved ledger; `migration:prove-exceptions` passed
- [x] R3.5 `reconciliation-report.md` sections: Counts, Missing IDs, FK integrity, Financial totals, File SHA-256; `migration:prove-reconciliation` passed
- [x] R3.6 Storage domain wraps `convertConvexStorageExport` + `migrateLegacyStorage`; dry-run inventories `_storage`; `migration:prove-storage` + double-run passed
- [x] R3.7 `npm run migration:prove-double-run` — all fixture domains, `unexplainedTotal=0` (Phase R3 exit gate)
- [x] Phase R3 exit gate: `migration:rehearse-all` + `migration:prove-double-run` both passed on localhost fixtures

### R3.7 Double-run / exit gate

```powershell
npm run local:infra:start
npm run migration:rehearse-all
npm run migration:prove-double-run
```

Pass rule: every fixture domain imports twice with matching reconciliation checks and **zero unexplained differences**.

Per-domain (same as the plan):

1. Start local infra.
2. Fixtures mirrored under `exports/<domain>` (junction) or pass `--export-path`.
3. `import-postgres --domain X --dry-run`
4. Real import.
5. `verify` + `reconcile`
6. Fix exceptions or append matching rows to `approved-exceptions.csv`, then re-run `reconcile`.
7. Flags already switched in Phase R2; CLI does not flip flags.

## Documents importer note

`document-migration` now resolves hyphenated Convex IDs via `--firm-map` / UUID detection and coerces invalid status/type enums to PG-safe defaults. This is a bugfix in the existing importer, not a second documents pipeline.
