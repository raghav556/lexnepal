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

Forward migrations are run by `npm run db:migrate`, backed by `drizzle-kit migrate --config
drizzle.config.ts`. Do not use fixture seeds, fresh resets, or destructive down migrations for live
deployment.

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
