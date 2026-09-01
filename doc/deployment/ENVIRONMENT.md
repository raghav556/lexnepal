# LexNepal Environment Variables

LexNepal runtime secrets must come from `.env.local` for localhost only, cPanel/Passenger
environment variables, PM2/systemd environment, or a server-side `.env.runtime` outside Git.
`runtime-env.cjs` loads `.env.runtime` without overriding variables already supplied by the host.

## Application

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `development`, `test`, or `production`. |
| `APP_VERSION` | Version reported by operational endpoints. |
| `GIT_SHA` | Build/source identifier for logs and diagnostics. |
| `LOG_LEVEL` | `debug`, `info`, `warn`, or `error`. |
| `APP_PUBLIC_URL` | Public HTTPS origin in production. |
| `PUBLIC_FIRM_SLUG` | Canonical CMS/public firm tenant. Local default is `phase-6-firm-a`. |
| `READINESS_REQUIRE_DATABASE` | Set `true` when readiness must verify PostgreSQL. |

## Public/Browser

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SKIP_ROLE_GUARDS` | Local diagnostic only. Never set to `1` in production. |
| `NEXT_PUBLIC_HIDE_DEMO_ACCOUNTS` | Hides demo accounts; production also hides them by `NODE_ENV`. |
| `NEXT_PUBLIC_IDLE_WARNING_MS` | Optional client idle-warning override. |
| `NEXT_PUBLIC_IDLE_LOGOUT_MS` | Optional client idle-logout override. |
| `VITE_HERCULES_OIDC_AUTHORITY` | Optional browser OIDC authority helper. |
| `VITE_HERCULES_OIDC_CLIENT_ID` | Optional browser OIDC client ID helper. |
| `VITE_AUTH_REDIRECT_URI` | Optional auth callback URI helper. |

## Database

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection URL used by Drizzle and runtime database access. |

Forward migrations are run by `npm run db:migrate`, backed by `drizzle-kit migrate --config
drizzle.config.ts`. Do not use fixture seeds, fresh resets, or destructive down migrations for live
deployment.

## Auth

| Variable | Purpose |
| --- | --- |
| `AUTH_PROVIDER` | `local` for Better Auth, `hercules` for OIDC callback flow. |
| `BETTER_AUTH_SECRET` | Strong secret, at least 32 characters. Never use the local placeholder. |
| `BETTER_AUTH_URL` | Production HTTPS Better Auth base URL. |
| `AUTH_SESSION_COOKIE_NAME` | Session cookie name. |
| `AUTH_SESSION_TTL_SECONDS` | Session TTL, default 28800 seconds. |
| `HERCULES_OIDC_AUTHORITY` | Server-side OIDC authority when `AUTH_PROVIDER=hercules`. |
| `HERCULES_OIDC_CLIENT_ID` | Server-side OIDC client ID when `AUTH_PROVIDER=hercules`. |

Production must use HTTPS origins and must not include localhost callback URLs or demo credentials.

## Storage

| Variable | Purpose |
| --- | --- |
| `OBJECT_STORAGE_BUCKET` | Private document bucket. Required for document storage. |
| `OBJECT_STORAGE_REGION` | Object storage region. |
| `OBJECT_STORAGE_ENDPOINT` | S3-compatible endpoint. Local default points to MinIO. |
| `OBJECT_STORAGE_PROVIDER` | `aws-s3` or `minio`. |
| `OBJECT_STORAGE_FORCE_PATH_STYLE` | `true` for local MinIO/path-style providers. |
| `OBJECT_STORAGE_SSE` | `aes256` or `none`. Production default should remain encrypted where supported. |
| `AWS_ACCESS_KEY_ID` | S3-compatible access key. |
| `AWS_SECRET_ACCESS_KEY` | S3-compatible secret key. |
| `UPLOAD_INTENT_TTL_SECONDS` | Upload intent lifetime. |
| `UPLOAD_URL_TTL_SECONDS` | Presigned upload URL lifetime. |
| `DOWNLOAD_URL_TTL_SECONDS` | Presigned download URL lifetime. |

Do not expose document buckets, quarantine prefixes, or private downloads through `public_html`.

## Malware Scanner

| Variable | Purpose |
| --- | --- |
| `CLAMAV_HOST` | Hostname/IP for the ClamAV daemon reachable by the Node process. |
| `CLAMAV_PORT` | ClamAV TCP port. Local default is `3310`. |
| `CDR_ENDPOINT` | Optional content-disarm service endpoint. |
| `CDR_API_KEY` | Optional content-disarm API key. |

If a shared host cannot provide ClamAV TCP access, document upload/scanning is blocked; do not turn
off malware scanning as a deployment workaround.

## Email

| Variable | Purpose |
| --- | --- |
| `SMTP_HOST` | SMTP host. Local uses Mailpit on `127.0.0.1`. |
| `SMTP_PORT` | SMTP port. Local Mailpit default is `1025`. |
| `SMTP_FROM` | Sender address. |

Mailpit is local-only. Production requires a real SMTP provider or managed mail service.

## Jobs

| Variable | Purpose |
| --- | --- |
| `JOB_WORKER_POLL_MS` | Durable worker polling interval. |
| `JOB_SCHEDULER_POLL_MS` | Scheduler polling interval. |

The web process enqueues work, but `npm run jobs:worker` and `npm run jobs:scheduler` must be
supervised separately for email delivery, malware scans, reminders, analytics aggregation, cleanup,
and scheduled work.
