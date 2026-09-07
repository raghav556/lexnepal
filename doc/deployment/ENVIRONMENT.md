# LexNepal Environment Variables

LexNepal runtime secrets must come from `.env.local` for localhost only, cPanel/Passenger
environment variables, PM2/systemd environment, or a server-side `.env.runtime` outside Git.
`runtime-env.cjs` loads `.env.runtime` without overriding variables already supplied by the host.

## Application

| Variable                     | Purpose                                                              |
| ---------------------------- | -------------------------------------------------------------------- |
| `NODE_ENV`                   | `development`, `test`, or `production`.                              |
| `APP_VERSION`                | Version reported by operational endpoints.                           |
| `GIT_SHA`                    | Build/source identifier for logs and diagnostics.                    |
| `LOG_LEVEL`                  | `debug`, `info`, `warn`, or `error`.                                 |
| `APP_PUBLIC_URL`             | Public HTTPS origin in production.                                   |
| `PUBLIC_FIRM_SLUG`           | Canonical CMS/public firm tenant. Local default is `srimar-law`.     |
| `READINESS_REQUIRE_DATABASE` | Set `true` when readiness must verify MySQL.                         |

## Public/Browser

| Variable                         | Purpose                                                        |
| -------------------------------- | -------------------------------------------------------------- |
| `NEXT_PUBLIC_SKIP_ROLE_GUARDS`   | Local diagnostic only. Never set to `1` in production.         |
| `NEXT_PUBLIC_HIDE_DEMO_ACCOUNTS` | Hides demo accounts; production also hides them by `NODE_ENV`. |
| `NEXT_PUBLIC_IDLE_WARNING_MS`    | Optional client idle-warning override.                         |
| `NEXT_PUBLIC_IDLE_LOGOUT_MS`     | Optional client idle-logout override.                          |
| `VITE_HERCULES_OIDC_AUTHORITY`   | Optional browser OIDC authority helper.                        |
| `VITE_HERCULES_OIDC_CLIENT_ID`   | Optional browser OIDC client ID helper.                        |
| `VITE_AUTH_REDIRECT_URI`         | Optional auth callback URI helper.                             |

## Database

| Variable       | Purpose                                                           |
| -------------- | ----------------------------------------------------------------- |
| `DATABASE_URL` | MySQL connection URL used by Drizzle and runtime database access. |

Forward migrations use the Drizzle ORM migrator through `npm run db:migrate` locally and the
packaged `node runtime/migrate.mjs` entrypoint in a standalone release. Drizzle Kit remains the
schema generation and validation tool. Do not use fixture seeds, fresh resets, or destructive down
migrations for live deployment.

### Local MySQL credentials

Local database credentials live in the repo root `.env.local` (git-ignored, never commit it) under
`DATABASE_URL`, e.g.:

```
DATABASE_URL=mysql://ethan:ethan@127.0.0.1:3306/dit_lexnepal
```

Start the local MySQL with `npm run local:infra:start`. Production credentials belong in the
server-side `.env.runtime` (passenger app root), not `.env.local`.

### Fresh migrate + seed (local)

Run with a Node >= 20 shell (the project targets Node 24; Node < 20 rejects
`--env-file-if-exists`). From the repo root:

```
npm run db:migrate        # apply drizzle/ migrations to the local DATABASE_URL
npm run db:seed           # create the firm + seed admin/staff/client accounts
npm run db:seed:tenant    # ensure the srimar-law public tenant
npm run auth:provision-local   # (resend setup links if you prefer the email flow)
```

`db:seed` provisions the `srimar-law` firm and three accounts: one `admin`, one `staff`
(default `associate`), and one `client` (individual, `kyc_status=pending`), plus the linked
`clients` row. Each account gets a working Better Auth **scrypt** identity with
`email_verified=true` so they can sign in immediately — no verification email required.

Default seed values (override with `SEED_PASSWORD`, `SEED_ADMIN_EMAIL`, `SEED_STAFF_*`,
`SEED_CLIENT_*`):

| key      | role    | email                      |
| -------- | ------- | -------------------------- |
| admin    | admin   | admin@srimarlaw.com.np    |
| staff    | associate | staff@srimarlaw.com.np   |
| client   | client  | client@srimarlaw.com.np   |

Default seed password: `SrimarSeed123!` (12+ chars, satisfies Better Auth minimum). Rotate it on
first sign-in; pass `SEED_PASSWORD` to seed a different value. Re-running `db:seed` is idempotent —
it re-keys the Better Auth identity for the seed emails and keeps the accounts active.

## Auth

| Variable                   | Purpose                                                                 |
| -------------------------- | ----------------------------------------------------------------------- |
| `AUTH_PROVIDER`            | `local` for Better Auth, `hercules` for OIDC callback flow.             |
| `BETTER_AUTH_SECRET`       | Strong secret, at least 32 characters. Never use the local placeholder. |
| `BETTER_AUTH_URL`          | Production HTTPS Better Auth base URL.                                  |
| `AUTH_SESSION_COOKIE_NAME` | Session cookie name.                                                    |
| `AUTH_SESSION_TTL_SECONDS` | Session TTL, default 28800 seconds.                                     |
| `HERCULES_OIDC_AUTHORITY`  | Server-side OIDC authority when `AUTH_PROVIDER=hercules`.               |
| `HERCULES_OIDC_CLIENT_ID`  | Server-side OIDC client ID when `AUTH_PROVIDER=hercules`.               |

Production must use HTTPS origins and must not include localhost callback URLs or demo credentials.

## Storage

| Variable                        | Purpose                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------- |
| `STORAGE_ROOT`                  | Local filesystem storage root. Created automatically; must stay private (not under `public_html`). |
| `STORAGE_DOWNLOAD_TOKEN_SECRET` | HMAC secret (≥32 chars) for short-lived download tokens.                                           |
| `UPLOAD_INTENT_TTL_SECONDS`     | Upload intent lifetime.                                                                            |
| `UPLOAD_URL_TTL_SECONDS`        | Upload grant lifetime.                                                                             |
| `DOWNLOAD_URL_TTL_SECONDS`      | Download token lifetime.                                                                           |

Do not expose the storage root, quarantine prefixes, or private downloads through `public_html`.

## Malware Scanner

| Variable       | Purpose                                                                   |
| -------------- | ------------------------------------------------------------------------- |
| `CLAMAV_HOST`  | Optional hostname/IP for the ClamAV daemon reachable by the Node process. |
| `CLAMAV_PORT`  | ClamAV TCP port. Local default is `3310`.                                 |
| `CDR_ENDPOINT` | Optional content-disarm service endpoint.                                 |
| `CDR_API_KEY`  | Optional content-disarm API key.                                          |

If production does not set `CLAMAV_HOST`, uploads are accepted after app-level file validation
without malware scanning. This is allowed operationally, but it should be recorded as a security
trade-off for the deployment.

## Email

| Variable    | Purpose                                                |
| ----------- | ------------------------------------------------------ |
| `SMTP_HOST` | Optional SMTP host. Local uses Mailpit on `127.0.0.1`. |
| `SMTP_PORT` | SMTP port. Local Mailpit default is `1025`.            |
| `SMTP_FROM` | Optional sender address.                               |

Mailpit is local-only. If production does not set `SMTP_HOST` and `SMTP_FROM`, queued email jobs are
marked skipped and no mail is sent.

## Jobs

| Variable                | Purpose                          |
| ----------------------- | -------------------------------- |
| `JOB_WORKER_POLL_MS`    | Durable worker polling interval. |
| `JOB_SCHEDULER_POLL_MS` | Scheduler polling interval.      |

The web process enqueues work, but `npm run jobs:worker` and `npm run jobs:scheduler` must be
supervised separately for email delivery, malware scans, reminders, analytics aggregation, cleanup,
and scheduled work.
