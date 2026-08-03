# ADR-0019: Require ClamAV locally and defer CDR

- Status: accepted
- Date: 2026-08-02
- Owner: Migration owner
- Reviewers: Security and documents owners before production

## Context

The local Phase 6 pipeline must prove malware detection with PostgreSQL and self-hosted MinIO. Content Disarm and Reconstruction is a separate control that rewrites supported documents and requires either a selected service or an operated sanitization engine. No CDR provider or document-format policy has been approved.

## Decision drivers

- Unscanned files must never reach protected storage.
- Local development must not depend on an unselected external service.
- Deferring CDR must be explicit and must not weaken antivirus enforcement.

## Decision

ClamAV is mandatory for every local document promotion. CDR remains disabled locally by leaving `CDR_ENDPOINT` unset. The composite scanner invokes CDR only after a clean antivirus verdict when an endpoint is configured.

Before production document cutover, the security and records owners must either approve a CDR provider and supported-format policy or accept the documented residual risk. This ADR does not waive that production decision.

## Consequences

- Clean local files are promoted only after a real ClamAV verdict.
- EICAR files are moved to the rejected prefix.
- Local files are not sanitized or structurally reconstructed.
- CDR retry and sanitized-output behavior remains covered by adapter-level tests until a real provider is selected.

## Evidence

- `scripts/storage/verify-clamav.ts`
- `scripts/storage/verify-local-pipeline.ts`
- `src/server/storage/document-scanner.ts`
- `doc/migration/PHASE_6_DOCUMENT_STORAGE.md`
