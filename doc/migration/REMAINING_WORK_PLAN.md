# LexNepal Remaining Migration Work Plan

**Audience:** Project owner (non-technical) and delivery team  
**Environment focus:** Localhost first (Windows local PostgreSQL, MinIO, Next.js, Vite)  
**Created:** 2026-08-04  
**Based on:** Codebase inspection against [`../CONVEX_TO_NEXTJS_MIGRATION_PLAN.md`](../CONVEX_TO_NEXTJS_MIGRATION_PLAN.md)  
**Rule:** This document is the operational plan for **what is left**. The master plan remains the strategy and architecture source of truth. Do not invent parallel rules.

---

## 1. Plain-language summary

LexNepal is moving from **Convex** (old backend) to **Next.js + PostgreSQL** (new backend), then moving the website UI from **Vite** to **Next.js**, then turning Convex off.

### Where we are now (honest)

| Area | Reality on localhost |
| --- | --- |
| Foundations (Phases 0–7) | Built and usable locally, with some open approvals and blocked job types |
| Business domains (Phase 8) | **Partially done.** Identity, CMS, clients/cases, work management, finance, and CRM are farthest along locally. Several other domains have code but are still pointed at Convex |
| Data tools / testing / UI move / production cutover / cleanup (Phases 9–13) | Still ahead |

### What “done” means for you

The migration is finished only when:

1. Every firm feature works through Next.js + PostgreSQL (not Convex).
2. The staff/client/public website runs on Next.js (not the old Vite app).
3. Local and later production data has been copied, checked, and matches.
4. Convex is backed up, unused, and removed.
5. Leftover dual-path / temporary migration code is cleaned up.

Until then, **Convex remains the safety net** and must not be deleted early.

---

## 2. Non-negotiable rules (do not break these)

These come from the master plan. The remaining work must follow them exactly.

1. **One writer per domain**  
   A domain is either Convex-authoritative or Next.js-authoritative — never both writing freely.
2. **One business-rule implementation**  
   Logic lives in services/policies, not copied into pages, routes, and jobs.
3. **No silent omissions**  
   Every Convex function keeps a decision: migrate / merge / replace / retire / currently_simulated.
4. **No skipped domains**  
   Finish domains in order below. Do not jump to UI cutover or Convex deletion early.
5. **No duplicate work**  
   Reuse existing repositories, hooks, and migration scripts. Do not rewrite a domain that already has a correct path.
6. **No drift**  
   Every change updates `endpoint-parity.csv` status and the matching Phase evidence note.
7. **Localhost first**  
   Prove each domain on local PostgreSQL + MinIO before any production discussion.
8. **Feature freeze discipline**  
   New product features during migration must update both backends until that domain is cut over — or wait until after cutover.

### Owner checkpoint question (ask before accepting any “domain done”)

> Can a staff user exercise this domain on localhost with the domain flag set to `next`, with Convex disabled for that domain, with matching row counts, and with a documented rollback to Convex?

If any answer is no, the domain is **not done**.

---

## 3. Current localhost facts (baseline for this plan)

Recorded 2026-08-04 from repository inspection:

| Fact | Evidence |
| --- | --- |
| Next API surface exists (~89 route files) | `src/app/api/...` |
| Vite UI dual-run shell | `src/legacy-pages/` + `dev:legacy` |
| Next UI + App Router | `src/app/(public|staff|client|admin)/...` |
| Domain flags switched to `next` in local env | identity, cms, cases, clients, tasks, hearings, research, finance, leads, appointments, messages, notifications, documents, envelopes, analytics, hr |
| Domain flags still Convex by default | _(none among Phase 8 business domains)_ |
| Mock mode currently overrides Next flags | ~~`.env.local` has `VITE_USE_MOCK=true`~~ now `false` locally |
| Finance Next APIs missing | ~~hooks call `/api/v1/financial/*` but routes do not exist~~ resolved |
| CRM Next APIs missing | ~~hooks called `/api/crm/*`~~ resolved via `/api/v1/leads` + `/api/v1/appointments` |
| Parity ledger not updated past inventory | many domains now `frontend_switched`; residual inventory rows may remain for retired/unused Convex helpers |
| Unified migration CLI incomplete | ~~only identity + documents registered~~ resolved — see `PHASE_9_MIGRATION_TOOLING.md` |
| Missing owner artifacts | `incident-contacts.md` / R7 owners still TBD; `cutover-runbook.md` + `decommission-checklist.md` exist |

### Domains already strong locally (do not rebuild)

| Sub-phase | Domain | Local status | Do not duplicate |
| --- | --- | --- | --- |
| 8.1 | Identity / users / sessions / audit | `complete_local` | Keep Better Auth + identity service path |
| 8.2 | Public CMS | `complete_local` | Keep CMS service + public/staff CMS APIs |
| 8.3 | Clients / KYC / cases / conflicts | `complete_local` | Keep matters + KYC pipeline |

### Domains that exist but are not finished

| Sub-phase | What exists | What is missing |
| --- | --- | --- |
| 8.4 Work management | APIs + service + hooks | Flag switch, parity status updates, local reconcile proof |
| 8.5 Finance | Repository + hooks + migration script | **Route Handlers, service layer, flag switch, tests** |
| 8.6 CRM | `complete_local` | Service + `/api/v1` routes + flags `next` |
| 8.7 Communication | `complete_local` | Messages/notifications + Mailpit email; flags `next` |
| 8.8 Documents | `complete_local` | Upload→scan→download + share; storage dry-run; flag `next` |
| 8.9 Envelopes | `complete_local` | OTP/sign/void/expire proven; flag `next` |
| 8.10 Analytics | `complete_local` | Dashboard over Next source domains; flag `next` |

---

## 4. Phase-wise remaining plan

Work only the open items. Completed local foundations stay as-is unless a defect is found.

Status key for this plan:

- `OPEN` — must be done
- `PARTIAL` — started; finish carefully
- `BLOCKED` — waiting on a named decision or prerequisite
- `DEFER_PROD` — not required to finish localhost proof; required before real production cutover

---

### Phase R0 — Owner control board (start immediately)

**Goal:** You can steer the project without guessing.

| # | Work item | Owner action | Exit evidence |
| --- | --- | --- | --- |
| R0.1 | Name migration owner + backup (can be you + one engineer) | Fill TBD roles in `PHASE_0_GOVERNANCE.md` | Named people recorded |
| R0.2 | Weekly 30-min review | Review this plan’s checklist counts | Meeting notes / checklist ticks |
| R0.3 | Freeze “nice-to-have” features | Reject unrelated redesigns until Phase R13 cleanup | Change-control note |
| R0.4 | Keep one status board | Use Section 8 dashboard below; update after every domain | Dashboard matches code |
| R0.5 | Turn off mock for migration proving | Set `VITE_USE_MOCK=false` when proving Next domains | Local login works against Next auth |

**Exit gate:** Roles named, mock policy understood, this document accepted as the remaining-work tracker.

---

### Phase R1 — Close foundation leftovers that still block domains

These are leftovers from Phases 0–7. Do them once; do not rebuild foundations.

| # | Work item | Why it matters | Localhost / later |
| --- | --- | --- | --- |
| R1.1 | Accept or explicitly defer each open ADR | Prevents late architecture thrash | Localhost can proceed with local ADRs; production ADRs are `DEFER_PROD` |
| R1.2 | Keep blocked jobs visible | OCR, thumbnails, email/SMS, records dispose, ZIP are fail-closed | Do not fake “success” |
| R1.3 | Decide email/SMS for local proving (ADR-0009) | Communication reminders need a delivery path | Local may use Mailpit; real SMS later |
| R1.4 | Confirm local infra recipe stays the only local path | PostgreSQL `:5433`, MinIO, ClamAV | Use `npm run local:infra:start` |
| R1.5 | Refresh parity ledger process | Stop leaving all rows at `inventoried` | After each domain, update statuses |

**Open ADRs that must not be ignored**

| ADR | Topic | Localhost | Production |
| --- | --- | --- | --- |
| 0001 | Hosting platform | `DEFER_PROD` | Required |
| 0002 | PostgreSQL provider / backups | `DEFER_PROD` | Required |
| 0004 / 0005 | Identity provider / sessions | Local path exists (ADR-0020); production proof still open | Required |
| 0006 | Object storage | Local MinIO OK; production bucket decision open | Required |
| 0009 | Email/SMS | Needed for real communication proving | Required |
| 0010 / 0011 | Search / realtime | Polling already used; confirm no silent gap | Required if product expects more |
| 0012–0015 | Observability, secrets, residency, rollback window | Draft exists | Required before cutover |
| 0017 | Authoritative-writer journal | Required before first irreversible domain cutover | Required |

**Exit gate:** Team agrees which ADRs are local-accepted vs production-blocked; no domain is marked done while its required ADR is unresolved.

---

### Phase R2 — Finish Phase 8 domains (vertical slices, in order)

For **every** remaining domain, complete this exact checklist once. Do not invent a second checklist.

#### Universal domain completion checklist (copy per domain)

1. Schema already mapped? If yes, do not remake tables.
2. Repository exists? Extend it; do not create a second repository for the same tables.
3. Domain service exists? If missing, add one service (finance/CRM currently need this pattern).
4. Authorization policies reused (no page-only security).
5. Route Handlers under versioned `/api/v1/...` (or documented exception).
6. Zod request/response contracts shared once.
7. Audit + side effects wired.
8. Client hooks already exist? Point them at the real API; do not create parallel hooks.
9. Migration script idempotent + rerun-safe.
10. Contract/integration tests pass.
11. Local import + reconcile zero unexplained differences.
12. Domain flag switched to `next` with `VITE_USE_MOCK=false`.
13. Rollback tested by flipping flag back to `convex`.
14. Update `endpoint-parity.csv` statuses for that domain’s rows.
15. Short evidence note in the matching `PHASE_8_x_*.md` file.

#### Required order (do not reorder)

| Step | Domain | Current gap | Concrete remaining work | Flag(s) to switch last |
| --- | --- | --- | --- | --- |
| R2.1 | **8.4 Work management** | `complete_local` | Tasks/hearings/SOPs/comments/research proven on Next; fixture migrate+reconcile; flags switched | `TASKS`, `HEARINGS`, `RESEARCH` = `next` |
| R2.2 | **8.5 Finance** | `complete_local` | `/api/v1/financial/...` service+APIs; fixture migrate+reconcile; flag switched | `FINANCE` = `next` |
| R2.3 | **8.6 CRM** | `complete_local` | `/api/v1/leads` + `/api/v1/appointments` (+ public); fixture migrate+reconcile; flags switched | `LEADS`, `APPOINTMENTS` = `next` |
| R2.4 | **8.7 Communication** | `complete_local` | Messages/notifications `/api/v1` + Mailpit email proof; flags switched | `MESSAGES`, `NOTIFICATIONS` = `next` |
| R2.5 | **8.8 Documents** | `complete_local` | Full upload→quarantine→scan→download path; storage migration dry-run; switch | `DOCUMENTS` = `next` |
| R2.6 | **8.9 Envelopes** | `complete_local` | OTP/sign/void/expire path proof; migration; switch | `ENVELOPES` = `next` |
| R2.7 | **8.10 Analytics** | `complete_local` | Dashboard over truthful Next source domains; switch | `ANALYTICS` = `next` |
| R2.8 | **HR residual** | `complete_local` | Inventory done; attendance/leave/payroll on Next; CMS careers stay CMS; flag switched | `HR` = `next` |

**Anti-duplication notes for R2**

- Do **not** recreate identity/CMS/matters backends.
- Do **not** add a second finance repository.
- Do **not** keep both `/api/crm` and `/api/v1/...` long-term; standardize on `/api/v1`.
- Do **not** mark docs “Completed” again without the universal checklist evidence.

**Exit gate for Phase R2**

- [x] Every domain flag can run on `next` locally.
- [x] Every domain has migration + reconcile evidence.
- [x] Convex write path for each switched domain can be left unused locally.
- [x] Parity CSV no longer shows only `inventoried` for migrated domains.

---

### Phase R3 — Phase 9 data migration tooling (repeatable, not one-off)

**Goal:** One trustworthy toolbox for every domain.

| # | Work item | Detail | Anti-duplication |
| --- | --- | --- | --- |
| R3.1 | Finish unified CLI | `complete_local` — commands wired; wraps services | Register existing domain scripts into CLI; do not rewrite importers |
| R3.2 | Register all domains | `complete_local` — all domains registered **and** rehearsed via CLI | Wrap current `*-migration.ts` services |
| R3.3 | Checkpointing + dry-run | `complete_local` — dry-run no-write; fingerprint checkpoints; `--resume` / `--force`; proven | Keep idempotency keys already used |
| R3.4 | Exception reporting | `complete_local` — raw CSV + `approved-exceptions.csv`; `migration:prove-exceptions` | Never silently drop rows |
| R3.5 | Reconciliation report | `complete_local` — structured sections in `reconciliation-report.md`; `migration:prove-reconciliation` | Counts, missing IDs, FK integrity, financial totals, file SHA-256 |
| R3.6 | Storage objects | `complete_local` — convert + migrate helpers; `migration:prove-storage` | Use existing storage migration helpers |
| R3.7 | Double-run proof | `complete_local` — all fixture domains; `unexplainedTotal=0` via `migration:prove-double-run` | Required exit gate |

**Local rehearsal sequence (every domain)**

1. Start local infra.
2. Take/place a Convex export under `exports/`.
3. `import-postgres --domain X --dry-run`
4. Real import.
5. `verify` + `reconcile`
6. Fix exceptions or record approved exceptions.
7. Only then allow flag switch.

**Exit gate:** A full localhost snapshot migrates twice with zero unexplained differences. ✅ met (`migration:rehearse-all` + `migration:prove-double-run`)

Evidence:
- `npm run migration:rehearse-all` — dry-run → import → verify → reconcile for every fixture domain (incl. storage)
- `npm run migration:prove-double-run` — second import matches first for all fixture domains; `unexplainedTotal=0`
- `npm run migration:prove-checkpoint` — R3.3 dry-run no-write + `--resume` skip + `--force` idempotent
- `npm run migration:prove-exceptions` — R3.4 bad row always lands in `data-exceptions.csv`; approve → unexplained=0
- `npm run migration:prove-reconciliation` — R3.5 Counts / Missing IDs / FK / Financial totals / File SHA-256
- `npm run migration:prove-storage` — R3.6 dry-run → import → verify → reconcile → double-run (MinIO)
- Details: `PHASE_9_MIGRATION_TOOLING.md`

---

### Phase R4 — Phase 10 shadow, contract, and security proving

**Goal:** Prove Next.js matches Convex behavior before UI cutover.

| # | Work item | Pass rule |
| --- | --- | --- |
| R4.1 | Contract tests per domain | `complete_local` — Zod `*-contracts.test.ts` for every migrated domain (41 tests) |
| R4.2 | Shadow reads where useful | `complete_local` — identity/matters/financial export→PG shadow + client shadow mode (Convex authority) |
| R4.3 | Cross-firm attack tests | `complete_local` — `assertResourceInFirm` + unit/integration attack suites; `npm run migration:prove-cross-firm` |
| R4.4 | Finance idempotency | `complete_local` — payment/trust idempotency keys + already-paid replay; `npm run migration:prove-finance-idempotency` |
| R4.5 | Document/malware path | `complete_local` — clean / EICAR / oversized / unauthorized; `npm run migration:prove-document-malware` |
| R4.6 | Signature/OTP path | `complete_local` — issue / verify / decline / void / expire; `npm run migration:prove-signature-otp` |
| R4.7 | Failure/retry jobs | `complete_local` — dead-letter recoverable + single durable effect; `npm run migration:prove-job-retries` |
| R4.8 | Performance smoke on localhost | `complete_local` — 120/250/500/150/200 volume; list/search ≤2s; `npm run migration:prove-performance-smoke` |

Existing unit contract files (`identity`, `cms`, `matters`, `work`) are a start — extend them; do not create a second unrelated test style.

**R4.1 evidence:** `tests/unit/{identity,cms,matters,work,financial,crm,communication,documents,envelopes,hr,analytics}-contracts.test.ts` — same Vitest + Zod `safeParse` style; `npx vitest run tests/unit/*-contracts.test.ts` passed. Details: `PHASE_10_CONTRACT_SECURITY.md`.

**R4.2 evidence:** `npm run migration:prove-shadow` (identity + matters + financial export→Postgres, zero mismatches); client `VITE_BACKEND_*=shadow` compares Next vs Convex while serving Convex — `src/client/data/shadow-reader.ts` wired on cases/documents/finance list hooks.

**R4.3 evidence:** `npm run migration:prove-cross-firm` — `tests/unit/authorization.test.ts`, `tests/unit/cross-firm-attack.test.ts`, `tests/integration/cross-firm-security.test.ts` (13 tests); foreign inventory probes use `NOT_FOUND` via `assertResourceInFirm`. Details: `PHASE_10_CONTRACT_SECURITY.md`.

**R4.4 evidence:** `npm run migration:prove-finance-idempotency` — same `idempotencyKey` replays payment and trust (one row each); already-paid invoice pay does not insert another completed payment. Schema migration `0009_financial_idempotency`. Details: `PHASE_10_CONTRACT_SECURITY.md`.

**R4.5 evidence:** `npm run migration:prove-document-malware` — clean promote+download, EICAR reject, oversized intent deny, unauthorized/cross-firm download deny; unit + live MinIO/ClamAV pipeline. Details: `PHASE_10_CONTRACT_SECURITY.md`.

**R4.6 evidence:** `npm run migration:prove-signature-otp` — OTP issue + verify (rejects bad code), decline, void, expire (+ sign after verified OTP). Details: `PHASE_10_CONTRACT_SECURITY.md`.

**R4.7 evidence:** `npm run migration:prove-job-retries` — idempotent enqueue, retry→dead-letter, audited manual recovery, `durable_job_effects` stays at one row. Details: `PHASE_10_CONTRACT_SECURITY.md`.

**R4.8 evidence:** `npm run migration:prove-performance-smoke` — representative volume (120 clients / 250 cases / 500 docs / 150 invoices / 200 tasks); all list/search Route Handlers under 2000 ms. Details: `PHASE_10_CONTRACT_SECURITY.md`.

**Exit gate:** No unexplained contract differences; no cross-tenant leakage; retries proven. **R4 complete locally** (R4.1–R4.8).

---

### Phase R5 — Phase 11 move UI from Vite to Next.js

**Goal:** One website stack. Backend must already be stable.

| # | Work item | Detail |
| --- | --- | --- |
| R5.1 | Inventory routes | `complete_local` — 68 Vite routes mapped; see `PHASE_11_UI_ROUTE_INVENTORY.md` + `ui-route-inventory.csv` |
| R5.2 | Layouts | `complete_local` — shared `PortalRoleGuard`; public portal CTA by role; see `PHASE_11_UI_ROUTE_INVENTORY.md` § R5.2 |
| R5.3 | Move pages, reuse components | `complete_local` — W1–W5; 68/68 routes via `src/views` + nav shim; see `PHASE_11_UI_ROUTE_INVENTORY.md` |
| R5.4 | Replace Convex providers | `complete_local` — AuthSessionGate; templates/tags `/api/v1`; gated briefs/OCR/PESI/migrate; see `PHASE_11_UI_ROUTE_INVENTORY.md` § R5.4 |
| R5.5 | Preserve URLs | `complete_local` — 68/68 same-path; `migration:prove-url-preserve`; see `PHASE_11_UI_ROUTE_INVENTORY.md` § R5.5 |
| R5.6 | Remove ADR-0018 isolation | `complete_local` — `src/app` + `src/legacy-pages`; ADR-0018 superseded; see `PHASE_11_UI_ROUTE_INVENTORY.md` § R5.6 |
| R5.7 | E2E smoke | `complete_local` — Playwright login/matter/document/invoice/signature/CMS; `migration:prove-e2e-smoke`; see `PHASE_11_UI_ROUTE_INVENTORY.md` § R5.7 |

**R2–R6 + R8 complete locally; R7 remains `DEFER_PROD` (real users / cloud).**

**Exit gate:** No active page depends directly on Convex; deep links work; E2E smoke green.

---

### Phase R6 — Local “cutover dress rehearsal” (Phase 12 practice on localhost)

Production cutover is later. On localhost, rehearse the exact runbook so production is boring.

| # | Work item | Detail |
| --- | --- | --- |
| R6.1 | Cutover runbook | `complete_local` — [`cutover-runbook.md`](cutover-runbook.md) (local commands; prod stubs `DEFER_PROD`) |
| R6.2 | Dress rehearsal + log | `complete_local` — `migration:prove-cutover-rehearsal`; [`cutover-log.csv`](cutover-log.csv) (12/12 domains passed) |

Per domain (automated by prove script):

1. Backup/export ready.
2. Temporary write freeze (local marker under `.local/write-freeze/`).
3. Final delta import.
4. Reconcile.
5. Switch / confirm flag `next`.
6. Keep Convex read-only for soak (flag=`next`).
7. Monitor errors (CLI verify + reconcile).
8. Practice rollback flag flip (`rollback --dry-run`).
9. Record result in cutover log.

Suggested local soak (shortened vs production; calendar soak remains operator-owned before R7):

| Domain | Local soak |
| --- | --- |
| CMS | 1 day of normal local use |
| Tasks / appointments | 1–2 days |
| Cases / documents | 2–3 days |
| Billing / signatures | 3+ days |

**R6 complete locally; R7 planned (`DEFER_PROD`); safe R8 cleanup waves OK if rollback paths remain.**

**Exit gate:** Every domain has a successful local dress rehearsal record. ✅ (`cutover-log.csv`, 12/12 `passed`)

---

### Phase R7 — Production readiness gate (`DEFER_PROD`, but plan now)

Do **not** pretend localhost completion equals production completion. When you leave localhost later:

| # | Work item | Detail |
| --- | --- | --- |
| R7.1 | Accept production ADRs | Hosting, Postgres HA/PITR, storage, secrets, residency, rollback window — see [`production-readiness.md`](production-readiness.md) §R7.1 |
| R7.2 | Staging real IdP / JWKS | Hercules (ADR-0004); local Better Auth does **not** count |
| R7.3 | Production-like data volume rehearsal | Staging DB + restore drill; fixtures insufficient |
| R7.4 | Antivirus / CDR policy | Extend/supersede ADR-0019 for production |
| R7.5 | Email / SMS provider live | ADR-0009; no silent success without delivery |
| R7.6 | Monitoring / alerts live | ADR-0012 |
| R7.7 | Incident commander + contacts | Fill [`incident-contacts.md`](incident-contacts.md) (all TBD today) |
| R7.8 | Domain-by-domain production cutover | No big bang; prod commands still stubs in cutover-runbook |

**Planning artifacts (now):** [`production-readiness.md`](production-readiness.md), [`production-readiness.csv`](production-readiness.csv), [`incident-contacts.md`](incident-contacts.md).  
**Proof that the plan exists (not that prod is ready):** `npm run migration:prove-production-readiness-plan` → `productionReady: false`, `deferProd: true`.

**R7 remains `DEFER_PROD` until every CSV row has evidence + named owners.** Safe **R8** cleanup waves may proceed in parallel if they do not remove rollback paths.

**Exit gate:** Real users only after R7.1–R7.8 are evidenced; localhost R6 does not satisfy this gate.

### Phase R8 — Phase 13 decommission Convex + cleanup

**Status:** `COMPLETE_LOCAL` under local-only waiver (see [`decommission-checklist.md`](decommission-checklist.md)).  
**Proof:** `npm run migration:prove-decommission-status` → `convexDecommissionComplete: true`.  
**Archive:** `doc/migration/archive/convex-decommission/` (`migration:archive-convex -- --verify`).

R7 production readiness remains **`DEFER_PROD`**. Flag-flip Convex rollback is gone locally; restore from the zip if needed.

#### R8.A Decommission Convex — complete locally

1. ~~Final immutable Convex export + checksum archive.~~ **complete_local** (source zip; prod *data* export still R7.3)
2. Reconciliation / storage archive — local evidence; prod re-run later
3. ~~Remove Convex providers, hooks, generated bindings.~~ **complete_local**
4. ~~Remove `src/lib/convex-mock.tsx`.~~ **complete_local**
5. ~~Remove `convex/` directory.~~ **complete_local**
6. ~~Remove Convex dependencies and env vars.~~ **complete_local**
7. ~~Update CI/docs so Convex is not required to boot.~~ **complete_local** (Next-only `npm run dev`)
8. ~~`decommission-checklist.md`.~~ **complete_local**

#### R8.B Cleanup waves — complete locally

| Wave | Status |
| --- | --- |
| C1–C4 | **complete_local** — Next-only adapters; no `VITE_BACKEND_*` |
| C5–C6 | **complete_local** |
| C7–C9 | **complete_local** — archive kept; packages/env cleaned |
| C10–C13 | **complete_local** |
| C14 | **complete_local** (localhost build/unit + prior E2E/R6); prod restore = R7.3 |

**Cleanup rule (prod):** still archive-first. Local waiver already exercised for this repo.

**R8 status:** `COMPLETE_LOCAL`. Not production-retired until R7.

---

## 5. Recommended execution order on localhost (week-by-week style)

This is a sequencing guide, not a calendar promise.

| Sequence | Focus | Done when |
| --- | --- | --- |
| Week A | R0 owner board + turn off mock for proving + R2.1 work management | Tasks/hearings/research on Next locally |
| Week B | R2.2 finance APIs + tests + migration | Finance flag `next` |
| Week C | R2.3 CRM APIs + tests + migration | Leads/appointments flag `next` |
| Week D | R2.4–R2.6 communication, documents, envelopes | Those flags `next` |
| Week E | R2.7 analytics + R3 unified migration CLI | Full local import/reconcile toolkit |
| Week F | R4 contract/security proving | Signed-off local parity evidence |
| Week G | R5 Vite → Next UI move | Next serves real pages |
| Week H | ~~R6 dress rehearsals~~ + start R8 cleanup waves that are safe | Convex unused locally |
| Later | R7 production gate + production cutover + final R8 | Convex decommissioned in production |

Adjust timing to team size; **do not change order**.

---

## 6. What you should refuse (owner guardrails)

Say no to:

1. “Let’s redesign the UI while migrating.”
2. “Let’s cut over all domains in one deploy.”
3. “Finance is done” while `/api/v1/financial` does not exist.
4. “Delete Convex now” before R8.A searches are clean.
5. “Skip reconcile; counts look fine.”
6. “Keep both Convex and Next writing.”
7. New microservices / ORM swaps mid-migration.
8. Marking parity rows retired from a filename search only.

---

## 7. Definition of done for the whole migration

Use this as your final acceptance checklist.

- [ ] Every Convex table/function has migrate/merge/replace/retire decision and final status.
- [ ] Every frontend consumer uses Next data layer only.
- [ ] Local (then production) data migrated and reconciled.
- [ ] Authorization equal or stronger than Convex baseline.
- [ ] Storage, jobs, schedules, notifications, audit, search replacements verified.
- [ ] Vite UI retired; Next.js UI is the product.
- [ ] Convex read-only, backed up, then removed after rollback window.
- [ ] Cleanup waves C1–C14 completed or explicitly deferred with owner sign-off.
- [ ] `decommission-checklist.md` fully checked.

---

## 8. Living progress dashboard (update this, not memory)

| Phase | Remaining plan ID | Status | Evidence link | Owner |
| --- | --- | --- | --- | --- |
| Owner control board | R0 | OPEN | this doc §4 R0 | TBD |
| Foundation leftovers / ADRs | R1 | PARTIAL | ADR README | TBD |
| Domain 8.4 Work management | R2.1 | COMPLETE_LOCAL | PHASE_8_4_WORK_MANAGEMENT.md | TBD |
| Domain 8.5 Finance | R2.2 | COMPLETE_LOCAL | PHASE_8_5_FINANCIAL.md | TBD |
| Domain 8.6 CRM | R2.3 | complete_local | PHASE_8_6 | next |
| Domain 8.7 Communication | R2.4 | complete_local | PHASE_8_7 | next |
| Domain 8.8 Documents | R2.5 | complete_local | PHASE_8_8_DOCUMENTS.md | next |
| Domain 8.9 Envelopes | R2.6 | complete_local | PHASE_8_9_ENVELOPES.md | next |
| Domain 8.10 Analytics | R2.7 | complete_local | PHASE_8_10_ANALYTICS.md | next |
| Domain HR residual | R2.8 | complete_local | PHASE_8_11_HR.md | next |
| Data tooling (Phase 9) | R3 | complete_local | PHASE_9_MIGRATION_TOOLING.md | CLI |
| Shadow/contract/security | R4 | COMPLETE_LOCAL | `PHASE_10_CONTRACT_SECURITY.md` | R4.1–R4.8 proven locally |
| Frontend to Next.js | R5 | COMPLETE_LOCAL | `PHASE_11_UI_ROUTE_INVENTORY.md` (R5.1–R5.7 complete_local) | next R7/R8 |
| Local cutover rehearsal | R6 | COMPLETE_LOCAL | `cutover-runbook.md` + `cutover-log.csv` (12/12) | next R7/R8 |
| Production readiness | R7 | DEFER_PROD | `production-readiness.md` + CSV (planned; not prod-ready) | owners TBD |
| Decommission + cleanup | R8 | COMPLETE_LOCAL | `decommission-checklist.md` + archive zip; prove-decommission-status | local waiver |

---

## 9. Immediate next actions (start here)

1. ~~Accept this document as the remaining-work tracker.~~
2. Fill owner names in Section 8 / Phase R0.
3. When proving Next domains, keep `VITE_USE_MOCK=false` for real auth sessions.
4. ~~Finish **R2.1 Work management**.~~ Done locally — see `PHASE_8_4_WORK_MANAGEMENT.md`.
5. ~~Next build focus: **R2.2 Finance** Route Handlers.~~ Done locally — see `PHASE_8_5_FINANCIAL.md`.
6. ~~Next build focus: **R2.8 HR residual**.~~ Done locally — see `PHASE_8_11_HR.md`.
7. ~~Phase R2 exit gate~~ — all business domain flags `next` locally; evidence in PHASE_8_* docs.
8. ~~**R3** unified migration CLI~~ — see `PHASE_9_MIGRATION_TOOLING.md`.
9. ~~**R5.1** Vite → App Router route inventory.~~ Done locally — see `PHASE_11_UI_ROUTE_INVENTORY.md` + `ui-route-inventory.csv`.
10. ~~**R5.2** Harden public/client/staff/admin layouts/guards.~~ Done locally — shared `PortalRoleGuard`; see `PHASE_11_UI_ROUTE_INVENTORY.md` § R5.2.
11. ~~**R5.3 W1** auth/public page moves.~~ Done locally — `src/views` + `@/client/navigation` shim; see `PHASE_11_UI_ROUTE_INVENTORY.md` § R5.3.
12. ~~**R5.3 W2** client portal page moves.~~ Done locally — `src/views/client` + shared profile; see `PHASE_11_UI_ROUTE_INVENTORY.md` § R5.3.
13. ~~**R5.3 W3** staff portal page moves.~~ Done locally — `src/views/staff` + cases `[id]`; see `PHASE_11_UI_ROUTE_INVENTORY.md` § R5.3.
14. ~~**R5.3 W4** admin ops page moves.~~ Done locally — `src/views/admin` (excl. CMS); see `PHASE_11_UI_ROUTE_INVENTORY.md` § R5.3.
15. ~~**R5.3 W5** admin CMS page moves.~~ Done locally — `src/views/admin/cms`; **R5.3 complete_local** (68/68).
16. ~~**R5.4** replace Convex providers.~~ Done locally — AuthSessionGate; templates/tags APIs; gated residuals; see `PHASE_11_UI_ROUTE_INVENTORY.md` § R5.4.
17. ~~**R5.5** URL preserve / redirect proofs.~~ Done locally — `ui-deep-link-matrix.csv` + `npm run migration:prove-url-preserve` (68/68 same-path, 0 redirects).
18. ~~**R5.6** remove ADR-0018 isolation.~~ Done locally — `src/app` + `src/legacy-pages`; ADR-0018 superseded; C5 complete.
19. ~~**R5.7** E2E smoke.~~ Done locally — `npm run migration:prove-e2e-smoke` (CMS + login + matter/document/invoice/signature).
20. ~~**R6** local cutover dress rehearsal.~~ Done locally — `cutover-runbook.md` + `npm run migration:prove-cutover-rehearsal` (12/12 domains in `cutover-log.csv`).
21. ~~**R7 plan now.**~~ Planning artifacts added — `production-readiness.md` / CSV / `incident-contacts.md`; `migration:prove-production-readiness-plan` (still `DEFER_PROD`, `productionReady: false`).
22. ~~**R8 safe waves.**~~ Extended to **R8 complete_local** — Convex runtime removed under local waiver; archive verifies; Vite dual-run retired.
23. Next: **R7** when leaving localhost (prod ADRs, real IdP, volume/restore); optional parity CSV bulk `convex_retired` polish.
24. After each domain: update parity CSV + this dashboard in the same change.

---

## 10. References

- Master strategy: [`../CONVEX_TO_NEXTJS_MIGRATION_PLAN.md`](../CONVEX_TO_NEXTJS_MIGRATION_PLAN.md)
- Status words: [`STATUS_VOCABULARY.md`](STATUS_VOCABULARY.md)
- Rollback expectations: [`rollback-runbook.md`](rollback-runbook.md)
- Local infra: [`LOCAL_POSTGRES_MINIO.md`](LOCAL_POSTGRES_MINIO.md)
- ADR backlog: [`architecture-decisions/README.md`](architecture-decisions/README.md)
