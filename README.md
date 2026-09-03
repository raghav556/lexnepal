# LexNepal / Srimar Law

LexNepal is a local-first legal-practice platform with a public website, CMS, client portal,
staff workspace, and administration portal. The active application is Next.js 16 with React 19,
TypeScript, MySQL/Drizzle, private local filesystem document storage, optional ClamAV scanning,
Better Auth, Mailpit, Vitest, and Playwright.

This repository is currently approved for **localhost use only**. Public hosting, production
credentials, real providers, and live data are deliberately deferred.

## Owner quick start

The prepared workstation already has the required local configuration. Open a terminal in this
folder and run:

```bash
npm run local:infra:start
npm run db:migrate
npm run storage:provision
npm run dev
```

Then open:

- Application: `http://localhost:3001`
- Sign in: `http://localhost:3001/sign-in`
- Captured local email: `http://127.0.0.1:8025`
- Document storage root: `./.local/storage` (auto-created)

Press `Ctrl+C` in the application terminal to stop Next.js. Stop the project-owned supporting
services with:

```bash
npm run local:infra:stop
```

The infrastructure start command is idempotent, so it is safe to run again when services are
already healthy.

## First setup on another workstation

Prerequisites are Node.js/npm, MySQL 8.4, and Mailpit. ClamAV is optional; when installed it
provides on-upload malware scanning, but the local start script skips it gracefully if `clamd` is
not available. The current verified local
toolchain is Node.js 24 and npm 11. The project-owned MySQL data directory listens only on
`127.0.0.1:3306` and does not modify a normal MySQL service on `3306`.

`npm run local:infra:start`, `npm run local:infra:stop`, and `npm run local:clamav:update`
auto-select the platform runner:

- Windows: PowerShell scripts in `scripts/local/*.ps1`.
- Linux/macOS: Bash scripts in `scripts/local/*.sh`.

On Linux/macOS, the scripts do not install packages and do not use `sudo` or `apt`. They expect
`mysqld`, `mysql`, `mysqladmin`, and `mailpit` to be available in `PATH`, or
for the expected ports to already be served by compatible local processes. ClamAV (`clamd`,
`freshclam`) is optional; the script skips it automatically when the binaries are absent.
Runtime data is stored
under `./.local/runtime` by default; override it with `LEXNEPAL_RUNTIME_ROOT=/path/to/runtime` when
needed. Some distro-packaged MySQL daemons, especially `/usr/sbin/mysqld` on confined Ubuntu
installs, cannot initialize a user-owned data directory; use a user-local MySQL binary, Docker,
Homebrew, or an already-running compatible MySQL service in that case.

If you use external services during local development, set `.env.local` away from the default local
ports and the Unix script will skip those local daemons. You can also force skips explicitly.
MySQL is mandatory and is always started locally; migrations and seeders depend on it.

```bash
LEXNEPAL_SKIP_LOCAL_CLAMAV=1 npm run local:infra:start
LEXNEPAL_SKIP_LOCAL_MAILPIT=1 npm run local:infra:start
LEXNEPAL_SKIP_SMTP=1 npm run dev
```

```bash
npm ci
cp .env.example .env.local
npm run local:infra:start
npm run db:integrity
npm run db:check
npm run db:migrate
npm run db:migrate:status
npm run db:seed:tenant
npm run db:seed
npm run e2e:seed
npm run storage:provision
npm run jobs:schedules:seed
npm run dev
```

## Required tech stack for Ubuntu deployment

### Minimum system requirements

| Component | Version | Notes |
| --- | --- | --- |
| Node.js | 24.x (pinned in `.nvmrc`) | Use nvm for version management |
| npm | 11.12.1 (pinned in `package.json` `packageManager`) | Must match exactly |
| MySQL | 8.4+ | Required for Drizzle ORM and all migrations |
| OS | Ubuntu 22.04+ (or compatible Linux distro) | Bash/sh required for infrastructure scripts |

### Optional local services

| Component | Purpose | Install |
| --- | --- | --- |
| ClamAV (`clamd`, `freshclam`) | On-upload malware scanning | `sudo apt install clamav clamav-daemon` |
| Mailpit | Local SMTP capture for dev/testing | `go install github.com/axllent/mailpit@latest` or binary download |
| Docker | Fallback MySQL when native `mysqld` fails (AppArmor) | `sudo apt install docker.io` |

### Required environment variables (production)

Set in `.env.local` (localhost) or server-side `.env.runtime` / process environment:

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | MySQL connection URL: `mysql://user:pass@host:port/dbname` |
| `BETTER_AUTH_SECRET` | Yes | Cryptographic secret, min 32 characters |
| `BETTER_AUTH_URL` | Yes | Production HTTPS origin (e.g. `https://example.com`) |
| `APP_PUBLIC_URL` | Yes | Public HTTPS origin for email links, CORS, cookies |
| `STORAGE_ROOT` | Yes | Private writable directory for document storage |
| `STORAGE_DOWNLOAD_TOKEN_SECRET` | Yes | HMAC secret for download tokens, min 32 characters |
| `NODE_ENV` | Yes | `production` for live deployments |
| `CLAMAV_HOST` / `CLAMAV_PORT` | No | Omit to accept uploads without malware scanning |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_FROM` | No | Omit to skip queued email delivery |

### Linux deployment process

```bash
# 1. Install Node 24 via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
nvm install 24

# 2. Clone and install
git clone <repo-url> && cd lexnepal
npm ci

# 3. Configure runtime environment
cp .env.example .env.local
# Edit .env.local with production secrets (never commit this file)

# 4. Start local infrastructure (MySQL on 127.0.0.1:3306)
npm run local:infra:start

# 5. Run migrations and seed the tenant
npm run db:migrate
npm run db:seed:tenant

# 6. Build standalone artifact
npm run build

# 7. Run verification gates
npm run format:check
npm run lint
npm run typecheck
npm run test

# 8. Start production server
npm run start
# Or use the standalone artifact directly:
# NODE_ENV=production PORT=3001 node .next/standalone/app.cjs
```

### Background workers (production)

The web process enqueues work but does not execute it. Run these as supervised long-running processes:

```bash
npm run jobs:worker      # Drains queued jobs (email, scans, cleanup)
npm run jobs:scheduler   # Triggers scheduled/recurring tasks
```

Use PM2 or systemd to supervise all three processes (web, worker, scheduler). See
`ecosystem.config.cjs` for PM2 configuration.

Before starting, replace the blank `BETTER_AUTH_SECRET` and `STORAGE_DOWNLOAD_TOKEN_SECRET` values
in `.env.local` with separate private random values of at least 32 characters. `.env.local` is
ignored by Git. Never reuse its local database, document storage, or authentication credentials in
production.

`npm run db:migrate` applies Drizzle migrations and then prints a Laravel-style migration status
using the `__drizzle_migrations` table. `npm run db:migrate:status` prints the same status without
applying changes. `npm run db:seed:tenant` upserts the public firm using `PUBLIC_FIRM_SLUG` and
`PUBLIC_FIRM_NAME`; it is separate from demo/e2e data.

`npm run db:seed` creates the base firm plus three working accounts on it — `admin`
(`admin@srimarlaw.com.np`), `staff` (default `associate`, `staff@srimarlaw.com.np`), and `client`
(`client@srimarlaw.com.np`) — and a linked `clients` row for the client. Each account gets a Better
Auth scrypt identity with `email_verified=true` and signs in with the default seed password
`SrimarSeed123!` (no email/reset flow). Re-running it is idempotent and keeps accounts active.
Override the accounts or password with `SEED_ADMIN_*`, `SEED_STAFF_*`, `SEED_CLIENT_*`, and
`SEED_PASSWORD`. Local demo login users for the sign-in screen are provisioned separately by
`npm run e2e:seed` and are listed on the development sign-in screen. Their localhost-only fixture
details are documented in
[`doc/migration/PHASE_AUTH_0_BASELINE.md`](doc/migration/PHASE_AUTH_0_BASELINE.md); they must never
be copied into a live environment. Rotate the seed password after first sign-in.

`npm run auth:provision-local` differs: it creates local identities and sends setup links to
Mailpit for existing users with email addresses — use it for invitation/setup-flow testing, not for
the fixed seed credentials from `npm run db:seed`.

### Canonical local firm

`PUBLIC_FIRM_SLUG=srimar-law` is the canonical tenant for the current localhost application.
It owns the public CMS settings and the prepared admin, staff, and client fixtures. The older
`lexnepal` database firm is not the public website tenant and must not be selected for CMS editing.
An administrator can publish public branding only when their account belongs to the configured
public firm. Keep `.env.local`, `.env.example`, and the seeded fixture firm aligned; do not infer a
tenant from the repository or product name.

## Background processing

For interactive testing of queued email, document scanning, notifications, and scheduled work,
keep these running in separate terminals:

```bash
npm run jobs:worker
npm run jobs:scheduler
```

## Verification commands

Use the fast gates while developing:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

With the application and local infrastructure running, use:

```bash
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

```bash
npm run local:mysql:backup
npm run local:mysql:restore-drill
```

On Windows, backups are stored beneath `%LOCALAPPDATA%\LexNepal\backups`. The restore drill uses an
isolated temporary database and does not overwrite the active local database.

## Local addresses

| Service           | Address                                    |
| ----------------- | ------------------------------------------ |
| Next.js           | `http://localhost:3001`                    |
| MySQL             | `127.0.0.1:3306`                           |
| Document storage  | `./.local/storage` (local filesystem)      |
| ClamAV            | `127.0.0.1:3310` (optional)                 |
| Mailpit SMTP / UI | `127.0.0.1:1025` / `http://127.0.0.1:8025` |

Persistent service data and logs are under `%LOCALAPPDATA%\LexNepal` on Windows and
`./.local/runtime` on Linux/macOS. Application-only temporary logs are under the ignored `.local`
directory.

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
- Do not delete `%LOCALAPPDATA%\LexNepal` or `./.local/runtime` to troubleshoot; it contains the
  local database and service data. Use the backup/restore commands first.

## Readiness and production boundary

The authoritative phase tracker is
[`doc/LOCAL_LAUNCH_READINESS_MASTER_PLAN.md`](doc/LOCAL_LAUNCH_READINESS_MASTER_PLAN.md). The final
plain-language result and deferred live-launch work are in
[`doc/LOCAL_RELEASE_SIGN_OFF.md`](doc/LOCAL_RELEASE_SIGN_OFF.md).

Local readiness does not authorize deployment. DNS/TLS, managed infrastructure, vault-managed
secrets, production identity, email/SMS providers, monitoring, legal/privacy approval,
real-data migration, penetration testing, rollback ownership, and public cutover remain a separate
production phase.
