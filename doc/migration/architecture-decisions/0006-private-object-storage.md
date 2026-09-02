# ADR-0006: Use private document object storage behind the ObjectStorage boundary

- Status: accepted (Stage 1 amendment: local filesystem implementation)
- Date: 2026-08-02 (amended 2026-09-02)
- Owner: Platform/records owners — `TBD`
- Reviewers: Security owner, data owner, documents owner

## Context

Convex managed storage must be replaced without exposing legal documents, bypassing tenant authorization or allowing unscanned objects into the protected namespace. The final cloud account, region, KMS policy and retention approval are not yet available. Stage 1 of the local migration removed MinIO; a production storage provider decision remains open.

## Decision

Use the provider-neutral `ObjectStorage` boundary. Stage 1 replaces the S3/MinIO implementation with a local filesystem adapter (`src/server/storage/local-object-storage.ts`) rooted at the configurable `STORAGE_ROOT`, keeping these firm-scoped key prefixes unchanged:

- `quarantine/{firmId}/{intentId}/...`
- `protected/{firmId}/{intentId-or-migration}/...`
- `rejected/{firmId}/{intentId}/...`

The storage root is private (never served statically, never under `public_html`) and its directories are created automatically. Keys are normalized and any `..`-style traversal outside the root is rejected. Uploads use short-lived, single-use, size-bounded upload grants consumed by an application-controlled route (`POST /api/v1/storage/uploads/:grantId`). Downloads are issued only after application authorization as short-lived HMAC download tokens bound to a single object key (`GET /api/v1/storage/objects/*?token=...`), replacing presigned URLs.

## Security and data impact

The browser cannot choose protected keys. Server-side validation checks actual size, declared/stored MIME, magic bytes and SHA-256 before a durable scan job can promote an object. ClamAV is mandatory; CDR is enabled when configured. No quarantined, rejected or cross-firm key receives a download token. Grant and token secrets are environment-configured and never committed.

## Operational impact

Scan failures retry exponentially and end in observable dead-letter state. Storage provisioning is idempotent (`npm run storage:provision` creates the root). The migration command copies from an immutable Convex export, reads back every destination object, and fails unless source count, destination count and checksum count agree.

## Rollback

Leave the documents domain flag on Convex until storage migration reconciliation and download tests pass. If cutover fails, stop scan workers and uploads, preserve the destination objects and journal, and return document authority to Convex under the rollback runbook.

## Evidence

- `src/server/storage/local-object-storage.ts`
- `src/server/storage/object-storage.ts` (unchanged port)
- `src/server/storage/document-pipeline.ts`
- `tests/unit/local-object-storage.test.ts`
- Phase 6 unit and database tests
