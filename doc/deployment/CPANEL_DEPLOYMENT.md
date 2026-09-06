# cPanel Deployment

LexNepal is still approved for localhost only. cPanel deployment must be an explicit, monitored
operator action after the separate production-launch checklist is satisfied.

## Setup Node.js App

Use the cPanel **Setup Node.js App** screen approximately as follows:

| Setting          | Value                                                                       |
| ---------------- | --------------------------------------------------------------------------- |
| Node.js version  | Node `24` if available. Otherwise the host is not compatible with this pin. |
| Application mode | Production                                                                  |
| Application root | `apps/lexnepal/current` or the host's symlink-compatible equivalent         |
| Application URL  | The approved domain/subdomain                                               |
| Startup file     | `app.cjs`                                                                   |
| Environment      | `NODE_ENV=production`, `PORT`/`HOSTNAME` as required by Passenger           |

The application root should be outside `public_html`. Only intentionally public static files should
be mirrored into `public_html` if the cPanel routing setup requires it.

## Artifact Layout

`next.config.ts` enables `output: "standalone"`. After `npm run build`, deployment expects:

- `.next/standalone/server.js`
- `.next/static`
- `public/`

The scripts copy `runtime-env.cjs`, `app.cjs`, `public/`, and `.next/static` into the standalone
artifact because Next standalone does not copy those static folders automatically.

## Runtime Secrets

Prefer cPanel environment variables or an external `.env.runtime` stored on the server. The runtime
loader never overrides variables already supplied by the host and never prints secrets.

Production must set:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `APP_PUBLIC_URL`
- `STORAGE_ROOT` and `STORAGE_DOWNLOAD_TOKEN_SECRET`

Optional production integrations:

- `CLAMAV_HOST` / `CLAMAV_PORT`; when absent, uploads are accepted after app-level file validation
  without malware scanning.
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_FROM`; when absent, queued email jobs are marked skipped and
  no mail is sent.

No localhost URLs, Mailpit settings, local storage token secrets, fixture/demo credentials, or
repository `.env.local` files should be used in production.

`deploy.sh` writes `RUNTIME_ENV_SOURCE` to the **active release** (after `activate_release` flips
the `current` symlink), so a freshly built release always boots with the runtime secrets — never the
dev placeholders. Local development secrets belong in `DATABASE_URL` inside `.env.local` at the repo
root (e.g. `mysql://ethan:ethan@127.0.0.1:3306/dit_lexnepal`).

## Restart

Passenger-compatible cPanel hosts normally restart by touching:

```bash
touch tmp/restart.txt
```

`deploy.sh` does this when `REMOTE_RESTART_MODE=passenger`.

## Static Assets

The standalone server can serve `public` and `.next/static` when they are copied into the standalone
directory. Some cPanel setups require browser-facing static assets to exist below `public_html`;
enable `MIRROR_STATIC_TO_PUBLIC_HTML=1` only when that is how the host routes `_next/static` and
public assets. Never place private document storage under `public_html`.

## Workers And Scheduler

Passenger usually supervises only the web process. LexNepal also needs:

```bash
node runtime/worker.mjs
node runtime/scheduler.mjs
```

If cPanel cannot run persistent worker/scheduler processes, queued email, malware scans, reminders,
scheduled analytics, cleanup, and similar jobs will not drain reliably. Use PM2/systemd on a VPS or
another host that can supervise these processes. Set `REMOTE_BACKGROUND_RESTART_COMMAND` for a
Passenger deployment; `deploy.sh` refuses to deploy without it.

## Database Setup

The release contains compiled migration tooling and `deploy.sh` runs it by default. Run it manually
from the deployed release with:

```bash
node runtime/migrate.mjs
```

Print migration status without applying changes:

```bash
node runtime/migration-status.mjs
```

Seed the default tenant by setting `PUBLIC_FIRM_SLUG` / `PUBLIC_FIRM_NAME` and running:

```bash
npm run db:seed:tenant
```

`npm run db:seed` (run first, once) creates the `srimar-law` firm plus three working accounts —
`admin` (`admin@srimarlaw.com.np`), `staff` (default `associate`, `staff@srimarlaw.com.np`), and
`client` (`client@srimarlaw.com.np`) — and a linked `clients` row for the client
(`kyc_status=pending`). Each account gets a Better Auth **scrypt** identity with
`email_verified=true`, so they can sign in immediately with the default seed password
`SrimarSeed123!` (no verification email or reset flow). Override the accounts or password with
`SEED_ADMIN_*`, `SEED_STAFF_*`, `SEED_CLIENT_*`, and `SEED_PASSWORD`. Re-running `db:seed` is
idempotent: it re-keys the Better Auth identity for the seed emails and keeps accounts active.
Rotate the seed password after first sign-in.

## Deployment Command

Create `~/.config/lexnepal/deploy.env` from `doc/deployment/deploy.env.example`, then run:

```bash
./deploy.sh --preflight
./deploy.sh
```

`SMOKE_BASE_URL` is required for a real deployment. After restart, deployment now fails unless
database readiness, public CMS settings, public header navigation, deployed Git SHA, and homepage
fallback rendering all verify successfully. The readiness check also requires an exact active,
non-deleted `PUBLIC_FIRM_SLUG` record whenever `READINESS_REQUIRE_DATABASE=true`.
Deployment validates the server/app targets and requires an HTTPS smoke URL before contacting the
server. The npm patch version may differ from `packageManager`, but its major version must match.

`--preflight` performs local validation and build checks only. The deployment file must live outside
the repository; `deploy.sh` refuses repo-local deploy env files.

If the build needs database-backed static data, set `BUILD_DATABASE_URL` to a safe staging or
sanitized database for preflight. Do not point preflight at production unless that access is
explicitly approved.

Set `DEPLOY_TEST_DATABASE_URL` to a disposable MySQL authority that may create and drop the fixed
`dit_lexnepal_test` database. Never point this variable at production. Preflight refuses to run the
migration test suite without this isolation boundary.

When `BUILD_DATABASE_URL` is unset, the deployment deliberately uses an unavailable build-only
database address. Public ISR pages therefore compile with deterministic Srimar Law/navigation
fallbacks instead of accidentally embedding localhost or production CMS data in the artifact.
