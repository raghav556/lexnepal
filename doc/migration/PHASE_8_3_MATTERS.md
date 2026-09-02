# Phase 8.3 — clients, KYC, cases and conflict checks

## Current status

Status: `complete_local`. Next.js/PostgreSQL are authoritative locally through `VITE_BACKEND_CLIENTS=next` and `VITE_BACKEND_CASES=next`. Convex branches remain isolated inside the typed adapters for rollback. Production cutover requires a fresh immutable export, approved firm mapping, verified KYC object migration and production reconciliation.

## Ownership and authorization model

- Every client, KYC file/upload, case, case-team membership and conflict check has `firm_id NOT NULL`.
- `clients.view_all` reads the firm client directory; `clients.manage` creates and updates client records.
- A client account can read only its linked client record and update only its own phone/address.
- `kyc.review` controls KYC document URLs and approval/rejection. KYC ID numbers and consent metadata are excluded from directory DTOs.
- `cases.view_all` reads all firm matters. Other authenticated users see only assigned/team matters; clients see only matters owned by their linked client record.
- `cases.manage` controls case creation/update, but does not bypass case access on existing matters.
- `conflicts.manage` controls searches, history and decisions. Searches are performed and logged server-side; clients cannot manipulate hit counts or runner identity.
- Cross-firm client, case, KYC and conflict access returns 404 to avoid record-existence disclosure.

## Implemented vertical slice

- Zod contracts, PostgreSQL repositories, services and versioned Route Handlers for client directory/detail/self-service, cases, case teams, KYC workflow and conflict checks.
- Atomic client/case/KYC/conflict mutations with actor, firm, IP, request ID and timestamp audit context.
- Server-side validation that linked clients, lawyers, reviewers and team members are active and belong to the same firm.
- Dedicated private KYC upload intents, short-lived storage upload grants, SHA-256/magic-byte/MIME/size validation, ClamAV scanning, protected promotion, signed review URLs and abandoned-upload cleanup.
- Durable `kyc.malware_scan` jobs with the Phase 7 retry, lease, dead-letter, status and manual-retry behavior.
- Client notification records for KYC submission and review decisions.
- Typed clients/cases/conflict adapters with stable TanStack Query keys. No React component directly references `api.clients`, `api.cases` or `api.conflictChecks`.
- Idempotent Convex importer for clients, normalized KYC files, cases, case teams and conflict checks. It preserves legacy IDs and refuses missing/cross-firm relationships.

## Corrected legacy defects

- Case detail and enriched case reads previously authenticated a user but did not authorize the requested matter.
- Conflict history and decisions previously lacked an authentication/role boundary and trusted caller-supplied hit counts/name.
- Client/case/conflict queries previously lacked reliable firm filtering.
- KYC submission previously trusted arbitrary storage IDs and exposed files without quarantine verification.
- Case updates previously accepted a historical `notes` alias that silently overwrote description; the Next.js contract has one canonical field.

## Local commands

```powershell
npm run migration:identity -- tests/fixtures/convex-identity-export tests/fixtures/convex-identity-firm-map.json
npm run migration:matters -- tests/fixtures/convex-matters-export tests/fixtures/convex-identity-firm-map.json 61000000-0000-4000-8000-000000000001
npm run matters:verify-local
```

The final argument assigns legacy conflict checks that have neither `firmId` nor a resolvable runner. Production must supply an explicitly approved orphan owner; the importer never guesses.

## Local verification evidence

- Representative migration run twice with equal source/target counts and zero exceptions.
- Anonymous directory access returns 401.
- Cross-firm client and case reads return 404.
- A firm-scoped conflict query does not match a deliberately colliding foreign-firm record.
- Two clean KYC PDFs pass quarantine and ClamAV promotion; the EICAR test file is rejected.
- KYC submission accepts only promoted owner-bound intents, and staff review succeeds only with `kyc.review`.
- Client-directory DTO verification confirms KYC ID material is excluded.

## Local exit gate

- [x] Client, KYC, case/team and conflict data are tenant-owned and relationship-validated.
- [x] Central capabilities and ownership policies cover every route.
- [x] KYC files use quarantine, durable scanning and protected signed downloads.
- [x] Every direct frontend consumer uses a domain adapter.
- [x] Migration is idempotent and reconciliation passes.
- [x] Contract, cross-firm, database and route-level tests pass.
- [x] Local clients/cases backend flags are `next`.
- [x] Convex authority can be restored only by intentionally changing both domain flags.

## Production gates

- Approve KYC retention, deletion and legal-hold policy under Nepal data-protection/professional obligations.
- Run the Phase 6 storage manifest first and verify every referenced KYC object before the matters importer.
- Update and approve each production firm's stored capability matrix with the new client/KYC/conflict capabilities.
- Run immutable export import twice, reconcile counts/relationships/files, perform shadow reads, then switch both flags in one controlled release.
