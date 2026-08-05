# Cutover runbook (Phase 12 / R6)

**Status:** Local dress rehearsal ready (`complete_local` path). Production commands remain `DEFER_PROD`.  
**Companion log:** [`cutover-log.csv`](cutover-log.csv)  
**Proof:** `npm run migration:prove-cutover-rehearsal`  
**Rollback model:** [`rollback-runbook.md`](rollback-runbook.md)

Production cutover is later. On localhost, rehearse this exact sequence so production is boring.

---

## 1. Principles

- One authoritative writer per domain (never dual-write Convex + Postgres for the same domain).
- Prefer flag flip rollback before accepting irreversible Postgres-only writes.
- Local soak periods are shortened vs production (see §5); calendar soak is still recorded in the log.
- Do **not** cut over all domains in one production deployment (big bang prohibited).

---

## 2. Domain → flag map

| Migration domain (`--domain`) | UI flags (`=next` after cutover) | Local soak |
| --- | --- | --- |
| `identity` | `VITE_BACKEND_IDENTITY` | covered by every domain |
| `cms` | `VITE_BACKEND_CMS` | 1 day |
| `matters` | `VITE_BACKEND_CASES`, `VITE_BACKEND_CLIENTS` | 2–3 days |
| `work-management` | `VITE_BACKEND_TASKS`, `HEARINGS`, `APPOINTMENTS`, `RESEARCH` | 1–2 days |
| `financial` | `VITE_BACKEND_FINANCE` | 3+ days |
| `crm` | `VITE_BACKEND_LEADS` | 1–2 days |
| `communication` | `VITE_BACKEND_MESSAGES`, `NOTIFICATIONS` | 1–2 days |
| `documents` | `VITE_BACKEND_DOCUMENTS` | 2–3 days |
| `envelopes` | `VITE_BACKEND_ENVELOPES` | 3+ days |
| `hr` | `VITE_BACKEND_HR` | 1 day |
| `analytics` | `VITE_BACKEND_ANALYTICS` | 1 day |
| `storage` | (infra; no UI flag) | with documents |

Fixture exports used on localhost live under `tests/fixtures/…`. Operator mirror: `exports/<domain>` (junction created by the prove script).

---

## 3. Per-domain local procedure

Replace `<domain>` with a row from §2. Example uses `cms`.

### 3.1 Backup / export ready

```bash
# Fixture path (local). Production: immutable Convex export zip + checksum (DEFER_PROD).
npm run migration -- export-convex --domain cms --export-path tests/fixtures/convex-cms-export
```

### 3.2 Temporary write freeze (local equivalent)

Localhost does not yet enforce API maintenance mode. The dress rehearsal writes a marker:

```text
.local/write-freeze/<domain>.json
```

Operator stop-writing procedure while the marker exists:

1. Do not mutate the domain via Convex dashboard / Convex mutations.
2. Do not run dual-write feature work against that domain.
3. Prefer read-only UI checks until flag is confirmed `next` and freeze is cleared.

The prove script enables/clears the marker automatically. Manual:

```bash
node --import tsx -e "import { enableWriteFreeze } from './scripts/migration/write-freeze.ts'; await enableWriteFreeze('cms')"
```

Production write-freeze / maintenance mode wiring is **DEFER_PROD**.

### 3.3 Final delta import

```bash
npm run migration -- import-postgres --domain cms --export-path tests/fixtures/convex-cms-export --target-firm 61000000-0000-4000-8000-000000000001 --dry-run
npm run migration -- import-postgres --domain cms --export-path tests/fixtures/convex-cms-export --target-firm 61000000-0000-4000-8000-000000000001 --resume
```

### 3.4 Reconcile

```bash
npm run migration -- verify --domain cms
npm run migration -- reconcile --domain cms --export-path tests/fixtures/convex-cms-export --target-firm 61000000-0000-4000-8000-000000000001
```

Optional deeper check: `npm run cms:verify-local` (or the domain’s `*:verify-local` script).

### 3.5 Switch flag to `next`

In `.env.local` (already `next` for local after R2–R5):

```env
VITE_BACKEND_CMS=next
```

Rebuild/restart Next after flag changes (`npm run build` then `npm run start`, or `dev:next`). Client bundles require static env inlines (see R5.7 / `next.config.ts`).

### 3.6 Keep Convex read-only for soak

With the domain flag at `next`, adapters must not treat Convex as authoritative. Leave Convex deployment up for rollback only; do not accept domain writes there.

### 3.7 Monitor errors

Locally: watch Next logs, `doc/migration/reconciliation-report.md`, and domain verify scripts. Production: metrics/alerts (**DEFER_PROD**).

### 3.8 Practice rollback flag flip

```bash
# Soft-delete dry-run where implemented
npm run migration -- rollback --domain cms --export-path tests/fixtures/convex-cms-export --target-firm 61000000-0000-4000-8000-000000000001 --dry-run

# Authority rollback (local): flip flag, rebuild/restart
# VITE_BACKEND_CMS=convex
```

Follow [`rollback-runbook.md`](rollback-runbook.md) Path A when no irreversible Postgres writes need replay.

### 3.9 Record result in cutover log

Automated by:

```bash
npm run migration:prove-cutover-rehearsal
```

Or single domain:

```bash
# Windows PowerShell
$env:CUTOVER_DOMAIN="cms"; npm run migration:prove-cutover-rehearsal
```

Rows append to [`cutover-log.csv`](cutover-log.csv). Exit gate: **every** §2 domain has a latest `result=passed` row.

---

## 4. One-command local dress rehearsal

```bash
# Infra + DATABASE_URL required
npm run local:infra:start   # if not already running
npm run migration:prove-cutover-rehearsal
```

Optional slow path (runs each `*:verify-local`):

```bash
# PowerShell
$env:CUTOVER_WITH_DOMAIN_VERIFY="1"; npm run migration:prove-cutover-rehearsal
```

Evidence: JSON `{ "passed": true, "r6": { ... } }`, reconciliation section `r6` / `prove-cutover-rehearsal`, and `cutover-log.csv`.

---

## 5. Soak guidance

| Domain group | Local soak (R6) | Production soak (Phase 12) |
| --- | --- | --- |
| CMS | 1 day | 2–3 days |
| Tasks / appointments | 1–2 days | 3–7 days |
| Cases / documents | 2–3 days | 7–14 days |
| Billing / signatures | 3+ days | 14+ days |

Automated prove records `soak=accepted_local_shortened` after T0 verify/reconcile. Operators still perform the calendar soak before treating a domain as production-ready (**R7**).

---

## 6. Production stubs (`DEFER_PROD`)

Do not invent commands here until ADRs and hosting are accepted (R7):

| Step | Local | Production (later) |
| --- | --- | --- |
| Backup | Fixture / `exports/` | Encrypted Convex export + PG PITR snapshot |
| Write freeze | `.local/write-freeze/` marker | Maintenance mode / API freeze control |
| Delta export | Fixture re-import | Live Convex delta export job |
| Monitor | Logs + reconcile | Dashboards, pages, on-call |
| Contacts | Developer | Incident commander + rollback contacts |

---

## 7. Exit gate (R6)

- [x] `cutover-runbook.md` exists with local commands.
- [x] `npm run migration:prove-cutover-rehearsal` → `passed: true`.
- [x] `cutover-log.csv` has `result=passed` for every domain in §2.
- [x] Rollback dry-run / flag-flip path documented and practiced.

R6 is **`complete_local`**. Production cutover remains **DEFER_PROD** — see [`production-readiness.md`](production-readiness.md) (R7 plan) and fill [`incident-contacts.md`](incident-contacts.md) before real users. Safe R8 cleanup may proceed if rollback paths stay intact.
