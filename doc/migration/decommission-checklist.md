# Decommission checklist (Phase R8 / Phase 13)

**Status:** `partial_local` — safe cleanup waves started; **full Convex removal is blocked** until R7 production soak / rollback window (or an explicit local-only waiver).  
**Rule:** If rollback might still need it, **archive**. Only delete when the rollback window expired and owners approve.

Related: [`cutover-runbook.md`](cutover-runbook.md), [`rollback-runbook.md`](rollback-runbook.md), [`production-readiness.md`](production-readiness.md)  
Machine tracker: [`decommission-checklist.csv`](decommission-checklist.csv)  
Proof: `npm run migration:prove-decommission-status`

---

## R8.A — Decommission Convex (do not fake complete)

Searches must eventually find **no active app usage** of:

- `convex/react`, `useConvexAuth`, `useQuery(`, `useMutation(`, `useAction(`
- `api.` / `convex/_generated`
- `VITE_CONVEX`, `CONVEX_DEPLOYMENT`

| # | Work | Local status | Notes |
| --- | --- | --- | --- |
| A1 | Final immutable Convex export + checksum archive | `DEFER_PROD` / local fixtures only | Prod export not done |
| A2 | Final reconciliation + storage checksum archive | Local evidence in `reconciliation-report.md` | Re-run at prod cutover |
| A3 | Remove Convex providers, hooks, generated bindings | **blocked** | Still in adapters + `convex-bridge` for rollback |
| A4 | Remove `src/lib/convex-mock.tsx` | **blocked** | Needed while mock/Convex path exists |
| A5 | Remove `convex/` directory | **blocked** | Rollback / dual-run |
| A6 | Remove Convex dependencies and env vars | **blocked** | `convex` still in `package.json` |
| A7 | Update CI/docs so Convex not required to boot | **blocked** until A3–A6 | Next boots with all flags `next` today |
| A8 | This checklist exists and is maintained | **complete_local** | This file |

**Current Convex residual (expected):** `convex-bridge`, `src/client/queries/*` Convex branches, `default.tsx` / Vite provider, `convex/` tree, `package.json` `convex` dependency. Grep counts are tracked by the prove script — **non-zero is OK** until R8.A is authorized.

---

## R8.B — Cleanup waves

| Wave | Item | Status | Evidence |
| --- | --- | --- | --- |
| C1 | Flags default `next`; remove Convex branches in hooks | `DEFER` | Rollback still needs branches |
| C2 | Delete `convex-bridge` / mock client paths | `DEFER` | Same |
| C3 | Delete dual-backend conditionals | `DEFER` | After C1 |
| C4 | Remove unused `VITE_BACKEND_*` | `DEFER` | After Convex retired |
| C5 | Remove `next-app` isolation | **complete_local** | R5.6 — `src/app` + `src/legacy-pages`; ADR-0018 superseded |
| C6 | Obsolete migration scripts vs unified CLI | **complete_local** (retained) | Canonical: `npm run migration -- …`. `scripts/migration/migrate-*.ts` kept as thin npm convenience wrappers over the same services — not a second importer |
| C7 | Archive exports / reconcile / checksums | **ongoing** | `doc/migration/*`, `.migration-reports/`, `exports/` — do not casually delete |
| C8 | Remove Convex packages from lockfile | `DEFER` | After R8.A searches clean |
| C9 | Remove Convex env from `.env.example` / docs | `DEFER` | Same time as C8 |
| C10 | Close parity rows to `convex_retired` | `DEFER` | After callers gone; ledger still has many `frontend_switched` / `inventoried` |
| C11 | Dead TBD route stubs / experimental APIs | **complete_local** (none found this pass) | No `/api/crm` tree; communication legacy removed under C12 |
| C12 | Normalize non-versioned APIs → `/api/v1` | **complete_local** | Removed unused `/api/communication/*` proxies; clients already on `/api/v1/messages` + `/api/v1/notifications` |
| C13 | Fix outdated “Completed” claims without evidence | **ongoing** | ADR-0018 marked superseded; PHASE_8_7 legacy note updated; parity CSV caller paths still list old `src/pages` (refresh later) |
| C14 | Final security + E2E + backup restore drill | `DEFER_PROD` | Local E2E (R5.7) + cutover rehearsal (R6) exist; prod restore is R7.3 |

---

## Safe-now vs blocked

| Do now (local) | Do not do yet |
| --- | --- |
| Maintain this checklist | Delete `convex/` |
| C5–C7, C11–C13 tidy | Strip `convex-bridge` / query Convex branches |
| Keep dual-run Vite optional | Remove `convex` npm dependency |
| Archive reconciliation evidence | Mark R8.A complete without owner approval |

---

## Exit gate

- [ ] R8.A A1–A8 all ticked with evidence (prod or explicit local-only waiver).
- [ ] R8.B C1–C14 either `complete` or explicitly waived.
- [ ] `migration:prove-decommission-status` reports `convexResidualAllowed` consistent with policy (zero residual only after A3–A6).

Until then tracker status for R8 is **`PARTIAL`** (`safe_waves_local`), not Convex-retired.
