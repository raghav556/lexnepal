# Phase 6 Document Storage and Processing Evidence

**Status:** Local PostgreSQL, MinIO and ClamAV gates complete; production export and CDR decision pending  
**Date:** 2026-08-02

## Security flow

```text
Authorized upload intent
  -> short-lived presigned POST
  -> quarantine/{firm}/{intent}
  -> size + MIME + magic bytes + SHA-256
  -> durable scan job
      -> ClamAV -> optional CDR -> protected/{firm}/...
      -> infected/invalid -> rejected/{firm}/...
      -> transient failure -> exponential retry -> dead letter
```

Documents are created atomically only when a scan job promotes a clean object. Downloads require `requireDocumentAccess`, a clean document state and a protected key under the authenticated firm prefix.

## Persistent records

- `document_upload_intents`: immutable client declarations, quarantine key, expiry, checksums and disposition.
- `document_scan_jobs`: claim lease, attempts, retry availability, last error and dead-letter/completion state.
- `storage_migration_items`: legacy ID, destination key, expected/actual checksum, byte count and verification result.

All three tables require `firm_id`; composite foreign keys reject cross-firm users, cases, parent documents and scan jobs.

## Operations

```text
npm run storage:provision
npm run storage:verify-local
npm run storage:verify-clamav
npm run storage:verify-pipeline
npm run storage:scan-once
npm run storage:cleanup
npm run storage:migrate -- path/to/convex-storage-manifest.json
```

CLI commands use the `react-server` package condition so server-only boundaries remain enforced. Production should run scan and cleanup through the durable worker/scheduler selected in Phase 7 rather than manually.

Local startup, ports and MinIO compatibility behavior are documented in `LOCAL_POSTGRES_MINIO.md`.

## Native Convex export conversion

Convert either an extracted Convex export or the native ZIP before running the storage migration:

```text
npm run storage:convert-convex -- <export-dir-or-zip> <output-dir> <firm-map.json> [ownership-overrides.json]
npm run storage:migrate -- <output-dir>/manifests/<postgres-firm-id>.json
```

The firm map is mandatory because Convex firm IDs are not PostgreSQL UUIDs. The converter resolves documents, thumbnails, signature artifacts, client KYC files and message attachments. It writes `conversion-report.json` and fails on unowned files, missing bytes, missing firm mappings, cross-firm references, size mismatches or SHA-256 mismatches. Ownership overrides are explicit and auditable; no file is silently dropped.

The committed representative export produced two tenant-owned objects. Conversion and MinIO migration reconciled `sourceCount=2`, `destinationCount=2`, `verifiedCount=2` with zero failures. PostgreSQL journal rows retained the firm, byte count and matching expected/actual SHA-256 values.

## Local end-to-end evidence

- ClamAV returned clean for a normal stream and infected for EICAR.
- A PDF followed `quarantine -> scan -> protected`, created a clean document and downloaded with an identical SHA-256.
- EICAR followed `quarantine -> scan -> rejected` and was never promoted.
- Unauthorized same-firm and cross-firm download attempts were denied before a URL was signed.
- Cross-firm upload completion was denied.
- CDR is explicitly deferred for local development under ADR-0019; production requires a provider or recorded risk acceptance.

## Remaining deployment gates

1. Accept ADR-0006 and select the account, region, encryption key and lifecycle retention.
2. Run `storage:provision` with a least-privilege deployment identity and verify public-access blocks.
3. Run clean, EICAR/infected, CDR and scanner-outage tests in production-like staging.
4. Freeze the Convex file export, execute `storage:migrate`, and archive its count/checksum report.
5. Keep `VITE_BACKEND_DOCUMENTS=convex` until API and storage parity are both accepted.
