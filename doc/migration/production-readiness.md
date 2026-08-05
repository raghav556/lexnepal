# Production readiness gate (Phase R7 / `DEFER_PROD`)

**Status:** `planned` — localhost R5–R6 are complete; **this gate blocks real users**, not local development.  
**Rule:** Do not mark any R7 row `complete` without linked evidence and named owner acceptance. Localhost proof is never enough.

Companion tracker: [`production-readiness.csv`](production-readiness.csv)  
Contacts template: [`incident-contacts.md`](incident-contacts.md)  
Cutover procedure: [`cutover-runbook.md`](cutover-runbook.md) §6 (prod stubs)  
Rollback model: [`rollback-runbook.md`](rollback-runbook.md)

---

## Exit gate (production)

All of the following must be true before domain-by-domain production cutover (R7.8):

1. Required production ADRs are **accepted** (not merely proposed).
2. Staging proves real IdP / JWKS (R7.2).
3. Representative-volume migration + restore drill recorded (R7.3).
4. Antivirus + CDR policy decided in writing (R7.4).
5. Email/SMS providers live in staging/prod with fail-closed verified (R7.5).
6. Monitoring/alerts paging a named on-call (R7.6).
7. Incident commander + rollback contacts filled (R7.7).
8. Each production domain cutover follows the runbook; **no big bang**.

Until then, tracker status for R7 remains **`DEFER_PROD`**.

---

## R7.1 — Accept production ADRs

| ADR | Topic | Local today | Production requirement | Owner role |
| --- | --- | --- | --- | --- |
| [0001](architecture-decisions/README.md) | Hosting / runtime / region | Deferred | Accepted ADR + deploy path | Platform |
| [0002](architecture-decisions/0002-postgresql-provider.md) | Postgres HA / PITR / backups | Local PG `:5433` | Accepted ADR + restore drill | Data |
| [0004](architecture-decisions/0004-hercules-oidc-integration.md) / [0005](architecture-decisions/0005-revocable-database-sessions.md) | IdP / sessions | Local Better Auth (ADR-0020) | Staging JWKS proof; prod audience/issuer | Security |
| [0006](architecture-decisions/0006-private-object-storage.md) | Object storage | MinIO | Prod bucket, SSE, lifecycle, residency | Platform / records |
| [0009](architecture-decisions/README.md) | Email / SMS | Mailpit / fail-closed SMS | Live providers + ADR accepted | Platform / product |
| [0012](architecture-decisions/README.md) | Observability | Ad-hoc logs | Logs/metrics/traces/errors + retention | Ops / security |
| [0013](architecture-decisions/README.md) | Secrets | `.env.local` | Vault/SM + rotation | Security / platform |
| [0014](architecture-decisions/README.md) | Nepal residency / legal | Assumed local | Legal sign-off | Legal / security |
| [0015](architecture-decisions/README.md) | Rollback window / RPO/RTO | Draft in rollback-runbook | Approved numbers + rehearsal | Ops / data |
| [0017](architecture-decisions/README.md) | Authoritative-writer journal | Local flag flip | Journal design accepted before irreversible cutover | Data / migration |
| [0019](architecture-decisions/0019-local-cdr-deferral.md) | CDR | Deferred locally | Prod CDR or residual-risk acceptance | Security / documents |

**Pass rule:** Every row above has `accepted` (or an explicit `rejected` + approved alternative ADR). Proposed-only ADRs do not pass R7.1.

---

## R7.2 — Staging against real identity provider / JWKS

| Check | Evidence to attach | Status |
| --- | --- | --- |
| Hercules (or approved IdP) issuer discovery reachable from staging | URL + timestamped curl/log | open |
| JWKS signature verification for production audience | Test report linking `src/server/auth/hercules-oidc.ts` | open |
| `tokenIdentifier` format matches LexNepal `users` | Sample subject → user row (no email auto-link) | open |
| Session exchange `POST /api/v1/auth/session` | Staging runbook steps | open |
| MFA / enrollment paths if required in prod | Staging script or recorded demo | open |

Local Better Auth (ADR-0020) **does not** satisfy R7.2.

---

## R7.3 — Production-like data volume rehearsal

| Check | Evidence | Status |
| --- | --- | --- |
| Immutable Convex export + checksum at prod-like volume | Manifest path + SHA | open |
| Full `migration:rehearse-all` / domain imports on staging DB | Reconciliation report section | open |
| R4.8-class list/search budgets at representative volume | Perf smoke output | open |
| Postgres backup + restore to a **separate** database | Restore log + row counts | open |
| Storage object checksum sample at volume | Storage reconcile notes | open |

Local fixtures are insufficient; use anonymized or synthetic scale agreed by the data owner.

---

## R7.4 — Real antivirus / CDR policy

| Decision | Options | Status |
| --- | --- | --- |
| Antivirus | Keep ClamAV (managed) vs commercial AV with same fail-closed contract | open |
| CDR | Select provider + formats **or** accept residual risk in writing (supersede/extend ADR-0019) | open |
| Rejected / quarantine retention | Document prefix + legal hold interaction | open |

Evidence: updated ADR-0019 (or successor) + staging pipeline proof (`storage:verify-pipeline` equivalent against prod-like scanners).

---

## R7.5 — Email / SMS provider live

| Channel | Local | Production | Status |
| --- | --- | --- | --- |
| Email | Nodemailer / Mailpit path | ADR-0009 provider; SPF/DKIM; bounce handling | open |
| SMS | Fail-closed / simulated | Sparrow / Aakash / Twilio (or ADR choice); no silent success | open |
| Job types | Blocked when unconfigured | Staging sends + audit rows | open |

Do not enable communication cutover while jobs report success without delivery.

---

## R7.6 — Monitoring / alerts live

Depends on ADR-0012 acceptance.

| Signal | Minimum | Status |
| --- | --- | --- |
| Error rate / 5xx | Page on sustained breach | open |
| Auth / JWKS failures | Alert | open |
| Job DLQ / blocked providers | Alert | open |
| Storage scan failures | Alert | open |
| DB connections / replication lag / failed backups | Alert | open |
| Reconciliation drift post-cutover | Daily check during soak | open |

---

## R7.7 — Named incident commander + rollback contacts

Fill [`incident-contacts.md`](incident-contacts.md). Empty `TBD` cells **fail** this row.

---

## R7.8 — Domain-by-domain production cutover

Follow [`cutover-runbook.md`](cutover-runbook.md) with **production** commands filled in (currently stubs). Order suggestion (adjust only with migration owner approval):

1. CMS  
2. Work management (tasks / appointments)  
3. Matters / documents / storage  
4. Communication  
5. CRM  
6. Finance / envelopes (longest soak)  
7. HR / analytics / identity last-mile as needed  

**Prohibited:** single deployment switching all `VITE_BACKEND_*=next` in production without per-domain soak + log rows in a production cutover log (extend `cutover-log.csv` or a separate `cutover-log.prod.csv`).

Each domain: backup → freeze → delta → reconcile → flag → soak → rollback practice readiness → log.

---

## What localhost already proved (not R7 credit)

| Phase | Evidence |
| --- | --- |
| R2–R4 | Domain flags `next`, contract/security proves |
| R5 | UI on `src/app`, E2E smoke |
| R6 | `migration:prove-cutover-rehearsal` — 12/12 local dress rehearsal |

Use those as rehearsal muscle memory; re-run against staging/prod data before R7.8.

---

## Immediate planning actions (do now, still `DEFER_PROD`)

1. Name owners in [`incident-contacts.md`](incident-contacts.md) and Section 8 of [`REMAINING_WORK_PLAN.md`](REMAINING_WORK_PLAN.md).
2. Schedule ADR acceptance workshops for 0001, 0002, 0006, 0009, 0012–0015, 0017, 0019-prod.
3. Stand up a staging environment checklist (hosting + DB + bucket + IdP) once ADR-0001/0002 draft owners exist.
4. Keep building safe R8 cleanup waves that do not remove rollback paths.
