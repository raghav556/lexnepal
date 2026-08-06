# Decommission checklist (Phase R8 / Phase 13)

**Status:** `complete_local` — Convex runtime removed from the app under the local-only waiver below.  
**Production:** R7 remains `DEFER_PROD`. Restoring Convex requires `archive/convex-decommission/convex-source.zip`.

Related: [`cutover-runbook.md`](cutover-runbook.md), [`rollback-runbook.md`](rollback-runbook.md), [`production-readiness.md`](production-readiness.md)  
Machine tracker: [`decommission-checklist.csv`](decommission-checklist.csv)  
Proof: `npm run migration:prove-decommission-status`  
Archive: `npm run migration:archive-convex -- --verify`

---

## Local-only decommission waiver (authorises R8.A)

**Scope:** localhost only. No production credit.

| Condition | Evidence |
| --- | --- |
| Convex source captured immutably | `doc/migration/archive/convex-decommission/convex-source.zip` + `manifest.json` |
| Archive verifies | `npm run migration:archive-convex -- --verify` → `ok: true` |
| Domains already on Next | R6 cutover log 12/12 `passed` |
| Feature audit | Mock-only briefs / placeholder Pesi / simulated OCR — documented in prior waiver notes |

**Rollback after this point:** restore from zip + reinstall deps + revert adapter commits — not `VITE_BACKEND_*=convex`.

---

## R8.A — Decommission Convex

| # | Work | Local status |
| --- | --- | --- |
| A1 | Immutable Convex source archive + checksum | **complete_local** |
| A2 | Reconciliation / storage archive | **partial_local** (local reports; prod re-run later) |
| A3 | Remove Convex providers, hooks, generated bindings | **complete_local** |
| A4 | Remove `convex-mock.tsx` | **complete_local** |
| A5 | Remove `convex/` directory | **complete_local** |
| A6 | Remove Convex dependencies and env vars | **complete_local** (`npm ls convex` empty) |
| A7 | Boot without Convex (Next-only `npm run dev` / `build`) | **complete_local** |
| A8 | This checklist maintained | **complete_local** |

---

## R8.B — Cleanup waves

| Wave | Status |
| --- | --- |
| C1–C4 | **complete_local** — Next-only data layer; no `VITE_BACKEND_*` |
| C5–C6 | **complete_local** (earlier) |
| C7–C9 | **complete_local** — archive retained; lockfile/env cleaned |
| C10 | **complete_local** — no Convex app callers (CSV ledger bulk polish optional) |
| C11–C13 | **complete_local** |
| C14 | **complete_local** for localhost (build + unit + prior E2E/R6); **prod restore still R7.3** |

---

## Exit gate

- [x] Local waiver recorded
- [x] Archive verifies
- [x] No `convex/` runtime tree
- [x] No `convex` package in direct dependency tree
- [x] Client queries use Next API only
- [x] `npm run build` succeeds
- [ ] Production R7 (separate gate)

R8 local status: **`COMPLETE_LOCAL`**.
