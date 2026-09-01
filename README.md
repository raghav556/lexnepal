# LexNepal / Srimar Law

LexNepal is a local-first legal-practice platform with a public website, CMS, client portal,
staff workspace, and administration portal. The active application is Next.js 16 with React 19,
TypeScript, PostgreSQL/Drizzle, private MinIO document storage, ClamAV scanning, Better Auth,
Mailpit, Vitest, and Playwright.

This repository is currently approved for **localhost use only**. Public hosting, production
credentials, real providers, and live data are deliberately deferred.

## Owner quick start (Windows)

The prepared workstation already has the required local configuration. Open PowerShell in this
folder and run:

```powershell
npm run local:infra:start
npm run db:migrate
npm run storage:provision
npm run dev
```

Then open:

- Application: `http://localhost:3001`
- Sign in: `http://localhost:3001/sign-in`
- Captured local email: `http://127.0.0.1:8025`
- MinIO console: `http://127.0.0.1:9001`

Press `Ctrl+C` in the application terminal to stop Next.js. Stop the project-owned supporting
services with:

```powershell
npm run local:infra:stop
```

The infrastructure start command is idempotent, so it is safe to run again when services are
already healthy.

## First setup on another Windows workstation

Prerequisites are Node.js/npm, PostgreSQL, MinIO, ClamAV, and Mailpit. The current verified local
toolchain is Node.js 24 and npm 11. PostgreSQL is isolated on port `5433`; it does not modify a
normal PostgreSQL service on `5432`.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run local:infra:start
npm run db:integrity
npm run db:check
npm run db:migrate
npm run db:seed
npm run e2e:seed
npm run storage:provision
npm run jobs:schedules:seed
npm run dev
```

Before starting, replace the blank `BETTER_AUTH_SECRET` in `.env.local` with a private random value
of at least 32 characters. `.env.local` is ignored by Git. Never reuse its local database, object
storage, or authentication credentials in production.

`npm run db:seed` creates the base firm and a pending placeholder administrator record; that record
cannot sign in. Local demo login users are provisioned by `npm run e2e:seed` and are listed on the
development sign-in screen. Their localhost-only fixture details are documented in
[`doc/migration/PHASE_AUTH_0_BASELINE.md`](doc/migration/PHASE_AUTH_0_BASELINE.md); they must never
be copied into a live environment.

`npm run auth:provision-local` is different: it creates local identities and sends setup links to
Mailpit for existing users with email addresses. Use it for invitation/setup-flow testing, not for
the fixed demo credentials.

### Canonical local firm

`PUBLIC_FIRM_SLUG=phase-6-firm-a` is the canonical tenant for the current localhost application.
It owns the public CMS settings and the prepared admin, staff, and client fixtures. The older
`lexnepal` database firm is not the public website tenant and must not be selected for CMS editing.
An administrator can publish public branding only when their account belongs to the configured
public firm. Keep `.env.local`, `.env.example`, and the seeded fixture firm aligned; do not infer a
tenant from the repository or product name.

## Background processing

For interactive testing of queued email, document scanning, notifications, and scheduled work,
keep these running in separate PowerShell terminals:

```powershell
npm run jobs:worker
npm run jobs:scheduler
```

## Verification commands

Use the fast gates while developing:

```powershell
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

With the application and local infrastructure running, use:

```powershell
npm run test:e2e
npm run verify:local-production-shaped -- --full
npm run performance:smoke-local
npm run audit:production
```

The full verifier covers storage and malware rejection, jobs, authentication boundaries, CMS,
matters, analytics, HR, signatures, CRM, communications, documents, work management,
tenant isolation, idempotency, retries, and URL preservation. Its generated report is written to
`.migration-reports/local-production-shaped.json` and is intentionally ignored by Git.

## Backup and restore drill

```powershell
npm run local:pg:backup
npm run local:pg:restore-drill
```

Backups are stored beneath `%LOCALAPPDATA%\LexNepal\backups`. The restore drill uses an isolated
temporary database and does not overwrite the active local database.

## Local addresses

| Service             | Address                                           |
| ------------------- | ------------------------------------------------- |
| Next.js             | `http://localhost:3001`                           |
| PostgreSQL          | `127.0.0.1:5433`                                  |
| MinIO API / console | `http://127.0.0.1:9000` / `http://127.0.0.1:9001` |
| ClamAV              | `127.0.0.1:3310`                                  |
| Mailpit SMTP / UI   | `127.0.0.1:1025` / `http://127.0.0.1:8025`        |

Persistent service data and logs are under `%LOCALAPPDATA%\LexNepal`. Application-only temporary
logs are under the ignored `.local` directory.

## Troubleshooting

- If a page does not open, run `npm run local:infra:start`, then restart `npm run dev`.
- If the database schema is behind, run `npm run db:integrity`, `npm run db:check`, and
  `npm run db:migrate` in that order.
- If document uploads fail, run `npm run storage:verify-local` and
  `npm run storage:verify-clamav`.
- If the fixed sign-in fixtures are missing, run `npm run db:seed`, then `npm run e2e:seed`, and
  restart the app.
- If Turbopack has a local compiler issue, use `npm run dev -- --webpack` as the diagnostic
  fallback.
- Do not delete `%LOCALAPPDATA%\LexNepal` to troubleshoot; it contains the local database and
  stored documents. Use the backup/restore commands first.

## Readiness and production boundary

The authoritative phase tracker is
[`doc/LOCAL_LAUNCH_READINESS_MASTER_PLAN.md`](doc/LOCAL_LAUNCH_READINESS_MASTER_PLAN.md). The final
plain-language result and deferred live-launch work are in
[`doc/LOCAL_RELEASE_SIGN_OFF.md`](doc/LOCAL_RELEASE_SIGN_OFF.md).

Local readiness does not authorize deployment. DNS/TLS, managed infrastructure, vault-managed
secrets, production identity, email/SMS providers, monitoring, legal/privacy approval,
real-data migration, penetration testing, rollback ownership, and public cutover remain a separate
production phase.
