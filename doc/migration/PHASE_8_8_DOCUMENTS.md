# Phase 8.8: Documents Migration

## Current status

Status: `complete_local`. Next.js/PostgreSQL + local filesystem storage are authoritative locally through `VITE_BACKEND_DOCUMENTS=next`. Convex branches remain inside typed adapters for rollback. Signature/OCR/request-signature surfaces stay Convex until Phase 8.9 envelopes.

## Domains covered

- Document list / search / recent / get / update
- Secure upload intent → quarantine → ClamAV scan → promote → authorized download
- Trash / restore / hard delete / legal hold
- Staff share links + public token view/download
- Storage export convert + migrate dry-run on fixture

## Implemented vertical slice

- Zod contracts in `src/shared/contracts/documents.ts`
- `DocumentService` + hardened `DocumentRepository` (`_id` DTOs)
- Route Handlers under `/api/v1/documents`, upload intents, and `/api/v1/public/document-shares/:token`
- Frontend adapters: list/search/recent/upload/download/trash/restore/share/public
- Staff/client documents pages, bulk upload, template generators, share modal, public share page wired off Convex for core flows
- Local verify: `npm run documents:verify-local` (pipeline + storage migrate dry-run + list/share API)

## Deferred to R2.6 / later

- `ClientSignaturesPage` e-sign / certificate / typed signature artifacts (envelope domain)
- Staff `requestSignature` + OCR triggers on `StaffDocumentsPage`
- Admin one-off `migrateLegacySecurityBoundary`

## Local commands

```powershell
npm run storage:verify-pipeline
npm run storage:convert-convex -- tests/fixtures/convex-export tmp/storage-out tests/fixtures/convex-export/firm-map.json
npm run storage:migrate -- tmp/storage-out/manifests/61000000-0000-4000-8000-000000000001.json
npm run documents:verify-local
```

## Local exit gate

- [x] Service + Route Handlers for list/lifecycle/share/download/upload intents.
- [x] Frontend core document pages use adapters (staff/client/upload/share/public).
- [x] Upload→quarantine→scan→download proven via `storage:verify-pipeline`.
- [x] Storage convert + migrate dry-run on `tests/fixtures/convex-export`.
- [x] Local documents backend flag is `next`.
- [x] Convex authority restored only by flipping `VITE_BACKEND_DOCUMENTS` to `convex`.

## Production gates

- Freeze immutable Convex `_storage` export and approved firm map before production migrate.
- Confirm ClamAV (and optional CDR) policy for non-local environments.
- Complete envelope/signature cutover (R2.6) before treating e-sign as Next-authoritative.
