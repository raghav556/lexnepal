# ADR-0021: Private KYC object security

- Status: accepted for local development
- Date: 2026-08-02
- Owner: migration owner

## Context

Legacy KYC uploaded files directly to Convex storage and stored caller-supplied storage identifiers on the client record. Submission did not prove file ownership, tenant ownership, content integrity or malware-scan completion. KYC identity documents are more sensitive than ordinary case documents.

## Decision

Use a dedicated firm/client/user-bound KYC upload-intent table. Client uploads enter the private storage quarantine prefix using a short-lived single-use upload grant. Completion verifies intent metadata and queues the durable `kyc.malware_scan` job. Size, allowed MIME, magic bytes and optional SHA-256 are checked before ClamAV scanning. Only clean files move to the protected KYC prefix. KYC submission accepts promoted intent UUIDs, never arbitrary storage keys.

Only the owning client can create and submit uploads. Only users with `kyc.review` can list signed file URLs or decide a submission. Signed URLs are short lived. Expired abandoned uploads are deleted by the durable document-cleanup schedule.

## Consequences

- KYC files are not ordinary case documents and cannot appear in document search or client-facing document lists.
- Existing Convex KYC files can be imported only after Phase 6 storage reconciliation marks their object copy verified.
- CDR remains governed by ADR-0019. Production requires the same private-bucket and malware-scanning guarantees.
- KYC retention/disposition duration must be approved under the records policy before production disposal automation.

## Evidence

- `npm run matters:verify-local`
- `npm run storage:verify-clamav`
- `npm run db:test`

## Rollback

Set `VITE_BACKEND_CLIENTS=convex` and `VITE_BACKEND_CASES=convex`. Protected KYC objects and PostgreSQL rows are retained; they are never copied back to Convex automatically.
