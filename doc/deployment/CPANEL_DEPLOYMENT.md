# cPanel Deployment

LexNepal is still approved for localhost only. cPanel deployment must be an explicit, monitored
operator action after the separate production-launch checklist is satisfied.

## Setup Node.js App

Use the cPanel **Setup Node.js App** screen approximately as follows:

| Setting | Value |
| --- | --- |
| Node.js version | Node `24` if available. Otherwise the host is not compatible with this pin. |
| Application mode | Production |
| Application root | `apps/lexnepal/current` or the host's symlink-compatible equivalent |
| Application URL | The approved domain/subdomain |
| Startup file | `app.cjs` |
| Environment | `NODE_ENV=production`, `PORT`/`HOSTNAME` as required by Passenger |

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
- `OBJECT_STORAGE_*` and `AWS_*`
- `CLAMAV_HOST` / `CLAMAV_PORT`
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_FROM`

No localhost URLs, Mailpit settings, local MinIO keys, fixture/demo credentials, or repository
`.env.local` files should be used in production.

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
npm run jobs:worker
npm run jobs:scheduler
```

If cPanel cannot run persistent worker/scheduler processes, queued email, malware scans, reminders,
scheduled analytics, cleanup, and similar jobs will not drain reliably. Use PM2/systemd on a VPS or
another host that can supervise these processes.

## Deployment Command

Create `~/.config/lexnepal/deploy.env` from `doc/deployment/deploy.env.example`, then run:

```bash
./deploy.sh --preflight
./deploy.sh
```

`--preflight` performs local validation and build checks only. The deployment file must live outside
the repository; `deploy.sh` refuses repo-local deploy env files.

If the build needs database-backed static data, set `BUILD_DATABASE_URL` to a safe staging or
sanitized database for preflight. Do not point preflight at production unless that access is
explicitly approved.
