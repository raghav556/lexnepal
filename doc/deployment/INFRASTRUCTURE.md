# LexNepal Infrastructure

This repository remains `LOCAL_LAUNCH_READY` and `DEFER_PROD` for public launch. These notes prepare
deployment operations, but they do not authorize DNS, TLS, production credentials, live data, or
public traffic without a separate production phase.

## Required

| Component              | Requirement                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| Node.js/npm            | Node `24` from `.nvmrc`; npm `11.12.1` from `package.json`.                                           |
| Next.js runtime        | Next.js 16 standalone web server, usually behind Passenger, PM2, systemd, or a reverse proxy.         |
| MySQL                  | Required by Drizzle runtime access and migrations via `DATABASE_URL`.                                 |
| Private object storage | Local filesystem storage root (`STORAGE_ROOT`); must remain private and writable by the Node process. |
| ClamAV                 | Optional TCP-reachable scanner for document, avatar, CMS asset, and KYC malware checks.               |
| SMTP                   | Optional real provider for production email jobs. Mailpit is local-only.                              |
| HTTPS/domain           | Required for production auth origins, secure cookies, and public traffic.                             |
| Background execution   | Independent worker and scheduler processes for queued and scheduled work.                             |
| Backups                | MySQL backup/restore ownership plus code-artifact rollback. DB rollback is not automatic.             |

Redis is not an actual LexNepal dependency today. The durable queue and scheduler use MySQL.

## Development-Only

| Component | Local details                                                                     |
| --------- | --------------------------------------------------------------------------------- |
| MySQL     | Project-owned service on `127.0.0.1:3306` from `npm run local:infra:start`.       |
| Storage   | Local filesystem at `./.local/storage` in the workspace (auto-created).           |
| ClamAV    | Local daemon on `127.0.0.1:3310`.                                                 |
| Mailpit   | Local SMTP/UI on `127.0.0.1:1025` / `127.0.0.1:8025`.                             |
| Fixtures  | `npm run db:seed`, `npm run e2e:seed`, and related demo users are localhost-only. |

Persistent local infrastructure data lives under `%LOCALAPPDATA%\LexNepal` on Windows and must not
be deleted by deployment scripts.

## Hosting Fit

cPanel shared hosting can usually supervise the web process with Passenger if it supports the
required Node version and startup file. It may not provide MySQL, a private writable storage
root, ClamAV TCP access, SMTP, or reliable long-running worker supervision. Missing ClamAV and SMTP
now degrade to unscanned uploads and skipped email, but workers are still needed for queued cleanup,
reminders, analytics, and any configured async integrations.

For a VPS, PM2 or systemd can supervise:

- `lexnepal-web`: `app.cjs`
- `lexnepal-worker`: `runtime/worker.mjs`
- `lexnepal-scheduler`: `runtime/scheduler.mjs`

`deploy.sh` compiles the worker and scheduler into the standalone release and packages the MySQL
migrations. PM2 can start all three processes from the packaged `ecosystem.config.cjs`. Passenger
deployments must configure `REMOTE_BACKGROUND_RESTART_COMMAND` for independently supervised worker
and scheduler processes.
