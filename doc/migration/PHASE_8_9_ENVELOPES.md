# Phase 8.9: Signature Envelopes Migration

## Current status

Status: `complete_local`. Next.js/PostgreSQL are authoritative locally through `VITE_BACKEND_ENVELOPES=next`. Convex branches remain inside typed adapters for rollback.

## Domains covered

- Envelope create / list / send / void / expire / remind / decline
- OTP issue + verify (SHA-256 challenge, demo code for local)
- Mark viewed + sign (typed / draw / upload artifact refs)
- Staff request-signature shortcut
- Pending actions for the current signer

## Implemented vertical slice

- Zod contracts in `src/shared/contracts/envelopes.ts`
- Hardened `EnvelopeRepository` + `EnvelopeService` with capability checks
- Route Handlers under `/api/v1/envelopes/*` (including OTP, sign, mark-viewed, request-signature, expire, remind)
- Frontend adapters in `src/client/queries/envelopes.ts`
- Staff documents + client signatures pages wired off Convex for envelope/sign flows
- Idempotent importer with reconciliation: `npm run migration:envelopes`
- Local verify: `npm run envelopes:verify-local`

## Local commands

```powershell
npm run migration:identity -- tests/fixtures/convex-identity-export tests/fixtures/convex-identity-firm-map.json
npm run migration:envelopes -- tests/fixtures/convex-envelopes-export tests/fixtures/convex-identity-firm-map.json
npm run envelopes:verify-local
```

## Local exit gate

- [x] Service + Route Handlers for create/send/OTP/sign/void/expire.
- [x] Frontend staff/client envelope surfaces use adapters.
- [x] Migration double-run reconcile passes on local fixture.
- [x] Local envelopes backend flag is `next`.
- [x] Convex authority restored only by flipping `VITE_BACKEND_ENVELOPES` to `convex`.

## Deferred / notes

- Full cryptographic signature certificates remain a follow-up (download uses document download URL).
- Staff OCR (`triggerOCR`) stays on Convex until explicitly retired.
