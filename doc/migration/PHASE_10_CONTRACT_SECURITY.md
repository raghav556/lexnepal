# Phase 10: Shadow, contract, and security proving (R4)

## Status

`complete_local` — **R4.1–R4.8 complete**. Phase exit gate met locally: contracts, shadow, cross-firm, finance idempotency, document/malware, signature/OTP, job retries, and performance smoke.

## R4.1 Contract tests (`complete_local`)

Same Vitest + Zod `safeParse` style as identity/CMS/matters/work — extended to every migrated domain.

| Domain | Test file |
| --- | --- |
| identity | `tests/unit/identity-contracts.test.ts` |
| cms | `tests/unit/cms-contracts.test.ts` |
| matters | `tests/unit/matters-contracts.test.ts` |
| work | `tests/unit/work-contracts.test.ts` |
| financial | `tests/unit/financial-contracts.test.ts` |
| crm | `tests/unit/crm-contracts.test.ts` |
| communication | `tests/unit/communication-contracts.test.ts` |
| documents | `tests/unit/documents-contracts.test.ts` |
| envelopes | `tests/unit/envelopes-contracts.test.ts` |
| hr | `tests/unit/hr-contracts.test.ts` |
| analytics | `tests/unit/analytics-contracts.test.ts` |

```powershell
npx vitest run tests/unit/*-contracts.test.ts
```

Evidence: 11 files / 41 tests passed (localhost).

## R4.2 Shadow reads (`complete_local`)

Compare Convex fixtures / Convex client data against Next/Postgres **without serving Next as authority**.

### Server export → Postgres (where useful)

| Domain | Shadow reader | CLI |
| --- | --- | --- |
| identity | `shadowReadIdentityExport` | `npm run migration:identity:shadow` |
| matters | `shadowReadMattersExport` | `npm run migration:matters:shadow` |
| financial | `shadowReadFinancialExport` | `npm run migration:financial:shadow` |

```powershell
npm run migration:prove-shadow
```

Pass rule: zero field mismatches on representative fixtures (timestamps not compared as authority; business fields compared).

### Client dual-fetch (`BACKEND_*=shadow`)

- Shared normalize: [`src/shared/shadow/normalize.ts`](../../src/shared/shadow/normalize.ts)
- Hook helper: [`src/client/data/shadow-reader.ts`](../../src/client/data/shadow-reader.ts) — fetches both, logs parity/mismatch, **returns Convex data**
- Wired on: `useCases`, `useDocuments`, `useInvoices`
- Unit coverage: `tests/unit/shadow-contracts.test.ts`

## R4.3 Cross-firm attack tests (`complete_local`)

Pass rule: no firm can see another firm’s data. Foreign or missing resources return identical `NOT_FOUND` (no existence leak).

| Layer | Coverage |
| --- | --- |
| Policy | `assertResourceInFirm` in `src/server/policies/authorization.ts` — foreign/missing → `NOT_FOUND` |
| Unit | `tests/unit/authorization.test.ts`, `tests/unit/cross-firm-attack.test.ts` — spoofed firm context, case/client/document probes, firm-scoped finance/HR/envelope lookup simulation, CRM/comms case-bound block |
| Integration | `tests/integration/cross-firm-security.test.ts` — firm context, `requireSameFirm`, `assertResourceInFirm` across domain messages |
| Service wiring | Finance create paths use `assertResourceInFirm` for client ownership |
| Schema | Existing DB FK rejection in `tests/database/schema-migrations.test.ts` |

```powershell
npm run migration:prove-cross-firm
```

Evidence: 3 files / 13 tests passed (localhost).

## R4.4 Finance idempotency (`complete_local`)

Pass rule: double-submit payment/trust actions do not double-post.

| Layer | Coverage |
| --- | --- |
| Schema | `payments.idempotency_key` + `trust_transactions.idempotency_key` unique per firm (`0009_financial_idempotency`) |
| Contracts | Optional `idempotencyKey` on pay / gateway / trust Zod schemas |
| Repository | Key replay + already-paid invoice returns existing completed payment (no second insert) |
| Routes | Body key or `Idempotency-Key` header via `resolveFinancialIdempotencyKey` |
| Client | Finance hooks + billing/admin pages send a stable key per action |
| Tests | `tests/unit/financial-contracts.test.ts`, `tests/unit/financial-idempotency.test.ts`, schema uniqueness in `tests/database/schema-migrations.test.ts` |

```powershell
npm run migration:prove-finance-idempotency
```

Evidence: same payment/trust id on double-submit; one DB row per key; already-paid replay does not insert.

## R4.5 Document/malware path (`complete_local`)

Pass rule: clean / infected / oversized / unauthorized download.

| Case | Expected |
| --- | --- |
| Clean | Quarantine → ClamAV clean → promote to `protected/` → authorized download SHA-256 matches |
| Infected | EICAR → rejected; never promoted; object under `rejected/` |
| Oversized | Intent `sizeBytes > 50 MB` rejected at contract + pipeline (`VALIDATION_FAILED`) |
| Unauthorized | Same-firm client without access and cross-firm download denied before URL is signed; non-clean status also denied |

| Layer | Coverage |
| --- | --- |
| Contracts | `documentUploadIntentSchema` enforces `MAX_DOCUMENT_BYTES` (`src/shared/documents/limits.ts`) |
| Unit | `tests/unit/documents-contracts.test.ts`, `tests/unit/document-storage-pipeline.test.ts` |
| Live | `scripts/storage/verify-local-pipeline.ts` (local storage + ClamAV + durable scan worker) |

```powershell
npm run migration:prove-document-malware
```

Evidence: all four checks true on localhost.

## R4.6 Signature/OTP path (`complete_local`)

Pass rule: issue, verify, decline, void, expire.

| Case | Expected |
| --- | --- |
| Issue | OTP challenge created for active signer; demo code returned locally |
| Verify | Correct code accepts; incorrect code rejected (`Incorrect code`) |
| Decline | Active recipient declines sent envelope → `declined` |
| Void | Staff voids draft/sent envelope with reason → `voided` |
| Expire | Sent envelope past `expiresAt` → `expired` via expire endpoint |

| Layer | Coverage |
| --- | --- |
| Contracts | `tests/unit/envelopes-contracts.test.ts` — OTP issue/verify, void/decline reasons, sign consent |
| Live | `scripts/envelopes/verify-local.ts` — issue → bad-code reject → verify → sign, plus decline/void/expire |

```powershell
npm run migration:prove-signature-otp
```

Evidence: all five lifecycle checks true (plus bad-code reject and sign) on localhost.

## R4.7 Failure/retry jobs (`complete_local`)

Pass rule: dead-letter recoverable; no duplicate side effects.

| Case | Expected |
| --- | --- |
| Idempotent enqueue | Same `(firm, type, idempotency_key)` returns the same job (`created=false`) |
| Retry → dead-letter | Transient failures schedule retry; exhausted attempts → `dead_letter` |
| Manual recovery | Audited `manualRetry` from dead-letter → job runs again and can complete |
| No duplicate effects | `durable_job_effects` unique key keeps a single side-effect row after recovery replay |
| Lease / schedule | Expired lease recovers; due schedule enqueues exactly once |

| Layer | Coverage |
| --- | --- |
| Contracts | `tests/unit/jobs-contracts.test.ts` — manual retry reason + status enum |
| Unit | `tests/unit/durable-job-worker.test.ts` — complete / retry / dead-letter / idle |
| Live | `scripts/jobs/verify-local.ts` — PostgreSQL queue + effects |

```powershell
npm run migration:prove-job-retries
```

Evidence: dead-letter recoverable with `sideEffectRuns=1` on localhost.

## R4.8 Performance smoke (`complete_local`)

Pass rule: list/search pages remain usable with representative local data volume.

| Volume (seeded once, idempotent `perf-smoke-*` legacy IDs) | Count |
| --- | ---: |
| Clients | 120 |
| Cases | 250 |
| Documents | 500 |
| Invoices | 150 |
| Tasks | 200 |

| Endpoint | Budget |
| --- | ---: |
| Clients / cases / documents list | ≤ 2000 ms |
| Documents search / conflict search | ≤ 2000 ms |
| Invoices / tasks list | ≤ 2000 ms |

| Layer | Coverage |
| --- | --- |
| Contracts | `tests/unit/performance-contracts.test.ts` — volume + budget Zod schemas |
| Live | `scripts/performance/smoke-local.ts` — seed + warm + timed Route Handlers |

```powershell
npm run migration:prove-performance-smoke
```

Evidence: all seven list/search measurements under budget on localhost (typical 8–70 ms).

## Exit gate

- [x] No unexplained contract differences (R4.1)
- [x] Shadow reads where useful (R4.2)
- [x] No cross-tenant leakage (R4.3)
- [x] Finance double-submit safe (R4.4)
- [x] Document/malware path proven (R4.5)
- [x] Signature/OTP lifecycle proven (R4.6)
- [x] Retries / dead-letter recoverable without duplicate effects (R4.7)
- [x] List/search usable at representative local volume (R4.8)

