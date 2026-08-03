# ADR-0006: Use private S3-compatible document object storage

- Status: proposed
- Date: 2026-08-02
- Owner: Platform/records owners — `TBD`
- Reviewers: Security owner, data owner, documents owner

## Context

Convex managed storage must be replaced without exposing legal documents, bypassing tenant authorization or allowing unscanned objects into the protected namespace. The final cloud account, region, KMS policy and retention approval are not yet available.

## Decision

Use the provider-neutral `ObjectStorage` boundary with an AWS SDK v3 S3-compatible implementation. Keep one private, versioned bucket with these firm-scoped prefixes:

- `quarantine/{firmId}/{intentId}/...`
- `protected/{firmId}/{intentId-or-migration}/...`
- `rejected/{firmId}/{intentId}/...`

Block all public access and ACLs. Encrypt objects at rest, issue short-lived presigned POST uploads with content-length conditions, and issue downloads only after application authorization. Quarantine expires after seven days and rejected evidence after thirty days unless the records/security owners approve different lifecycle periods.

## Security and data impact

The browser cannot choose protected keys. Server-side validation checks actual size, declared/stored MIME, magic bytes and SHA-256 before a durable scan job can promote an object. ClamAV is mandatory; CDR is enabled when configured. No quarantined, rejected or cross-firm key receives a download URL.

## Operational impact

Scan failures retry exponentially and end in observable dead-letter state. Bucket provisioning is idempotent. The migration command copies from an immutable Convex export, reads back every destination object, and fails unless source count, destination count and checksum count agree.

## Rollback

Leave the documents domain flag on Convex until storage migration reconciliation and download tests pass. If cutover fails, stop scan workers and uploads, preserve the destination objects and journal, and return document authority to Convex under the rollback runbook.

## Evidence

- `src/server/storage/s3-object-storage.ts`
- `src/server/storage/document-pipeline.ts`
- `drizzle/0003_document_storage_pipeline.sql`
- Phase 6 unit and database tests
