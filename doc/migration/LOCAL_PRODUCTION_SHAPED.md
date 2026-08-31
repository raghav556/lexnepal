# Local production-shaped gate

**Status:** `complete_local`  
**Completed:** 2026-08-07  
**Scope:** Everything that can run on this Windows machine with local Postgres (`:5433`), MinIO, ClamAV, Mailpit, and Next.js.  
**Not in scope:** R7 cloud (hosted DB, real IdP, DNS/TLS, vault, live email/SMS, monitoring).  
**Companion:** [`production-readiness.md`](./production-readiness.md) remains `DEFER_PROD`.

---

## How to prove

```powershell
npm run local:infra:start
npm run db:migrate
npm run storage:provision
npm run jobs:schedules:seed

# Daily / PR-shaped
npm run verify:local-production-shaped

# Faster smoke
npm run verify:local-production-shaped -- --quick

# Full domain + extra migration proves
npm run verify:local-production-shaped -- --full
```

Report file (gitignored): `.migration-reports/local-production-shaped.json`

---

## Checklist

| Area                     | Proof                                                           | Status                      |
| ------------------------ | --------------------------------------------------------------- | --------------------------- |
| Master harness           | `verify:local-production-shaped`                                | done                        |
| PG backup/restore drill  | `local:pg:backup` + `local:pg:restore-drill`                    | done (2026-08-07)           |
| Storage / ClamAV         | `storage:verify-pipeline`                                       | done                        |
| Jobs                     | `jobs:verify-local`                                             | done                        |
| Auth                     | `verify:auth-production` + boundary                             | done                        |
| Domains                  | harness domains group                                           | done (run `--full` for all) |
| CMS-7 media uploads      | blog/news/resource covers + `cmsBlogCoverUploadOk`              | done                        |
| CMS-10 sitemap/redirects | `app/sitemap.ts` + governance `urlRedirects` + `cmsRedirectsOk` | done                        |
| Convex gone              | `migration:prove-decommission-status`                           | green                       |
| Cloud fence              | `productionReady: false`                                        | must stay false             |

---

## Postgres backup / restore (local)

```powershell
npm run local:pg:backup
npm run local:pg:restore-drill
```

Dumps land under `%LOCALAPPDATA%\LexNepal\backups\`. Restore drill uses a separate database `lexnepal_restore_drill`, smoke-counts rows, then drops it.

**Last backup drill:** 2026-08-07 — restore OK (`firms`/`users`/`testimonials` counted; live DB untouched). Log: `%LOCALAPPDATA%\LexNepal\backups\restore-drill-latest.json`

---

## Auth notes (local)

- Keep `NEXT_PUBLIC_SKIP_ROLE_GUARDS` unset for real local proving.
- `BETTER_AUTH_SECRET` must be ≥32 chars (not the placeholder) before any production deploy; local may use a strong local secret.
- Demo accounts only appear on localhost when `NODE_ENV !== "production"`.
- Full `Secure` cookie proof needs HTTPS — that is **R7 / staging**, not this gate. Local HTTP cookie checks remain supported.

---

## Mailpit / SMS honesty

- Email jobs should land in Mailpit UI `http://127.0.0.1:8025`.
- SMS remains fail-closed without a live provider (intentional).

---

## CMS polish (local)

- **CMS-7:** Cover uploads for blog/news/resources via CMS asset intents. Resource **PDF fileUrl** remains HTTPS (image MIME allowlist).
- **CMS-10:** Public `/sitemap.xml`; admin redirects under Governance → Redirects (`urlRedirects` setting → `.local/cms-redirects.json` → `proxy.ts`).

---

## Cloud fence (R7 — do not mark complete here)

Hosting, managed Postgres HA/PITR, Hercules IdP/JWKS, live email/SMS, vault-managed secrets, monitoring/on-call, DNS/TLS, production Convex data export. See [`production-readiness.csv`](./production-readiness.csv).

**Local contacts** in [`incident-contacts.md`](./incident-contacts.md) are placeholders only and do **not** satisfy R7.7.

---

## Baseline run log

| When       | Mode                                       | Result         | Notes                                                                                                                             |
| ---------- | ------------------------------------------ | -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-07 | infra + auth + cms                         | PASS           | backup/restore, storage pipeline, auth-production, cms:verify-local (+ CMS-7/10 flags)                                            |
| 2026-08-07 | `migration:prove-cutover-rehearsal`        | PASS           | Implicit `VITE_BACKEND_*=next` after Convex decommission; CMS nav order-slot reclaim                                              |
| 2026-08-07 | `verify:local-production-shaped`           | **PASS 15/15** | standard mode; cutover green; cloud fence `productionReady: false` intact                                                         |
| 2026-08-31 | `verify:local-production-shaped -- --full` | **PASS 23/23** | all infrastructure, auth, domain, migration, retry, idempotency, tenant and 83-route URL proofs green; cloud fence remains intact |

**Flag note:** After R8 decommission, unset `VITE_BACKEND_*` means Next-only (`next` implicit). Explicit `convex`/`shadow` still fails the cutover prove.
