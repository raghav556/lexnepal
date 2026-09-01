# LexNepal Infrastructure

This repository remains `LOCAL_LAUNCH_READY` and `DEFER_PROD` for public launch. These notes prepare
deployment operations, but they do not authorize DNS, TLS, production credentials, live data, or
public traffic without a separate production phase.

## Required

| Component | Requirement |
| --- | --- |
| Node.js/npm | Node `24` from `.nvmrc`; npm `11.12.1` from `package.json`. |
| Next.js runtime | Next.js 16 standalone web server, usually behind Passenger, PM2, systemd, or a reverse proxy. |
| PostgreSQL | Required by Drizzle runtime access and migrations via `DATABASE_URL`. |
| Private object storage | MinIO or S3-compatible service; must remain private and reachable by the Node process. |
| ClamAV | TCP-reachable scanner for document, avatar, CMS asset, and KYC malware checks. |
| SMTP | Real provider for production email jobs. Mailpit is local-only. |
| HTTPS/domain | Required for production auth origins, secure cookies, and public traffic. |
| Background execution | Independent worker and scheduler processes for queued and scheduled work. |
| Backups | PostgreSQL backup/restore ownership plus code-artifact rollback. DB rollback is not automatic. |

Redis is not an actual LexNepal dependency today. The durable queue and scheduler use PostgreSQL.

## Development-Only

| Component | Local details |
| --- | --- |
| PostgreSQL | Local service on `127.0.0.1:5433` from `npm run local:infra:start`. |
| MinIO | Local API/console on `127.0.0.1:9000` / `127.0.0.1:9001`. |
| ClamAV | Local daemon on `127.0.0.1:3310`. |
| Mailpit | Local SMTP/UI on `127.0.0.1:1025` / `127.0.0.1:8025`. |
| Fixtures | `npm run db:seed`, `npm run e2e:seed`, and related demo users are localhost-only. |

Persistent local infrastructure data lives under `%LOCALAPPDATA%\LexNepal` on Windows and must not
be deleted by deployment scripts.

## Hosting Fit

cPanel shared hosting can usually supervise the web process with Passenger if it supports the
required Node version and startup file. It may not provide PostgreSQL, private S3-compatible
storage, ClamAV TCP access, or reliable long-running worker supervision. Those components may need
managed services or a VPS.

For a VPS, PM2 or systemd can supervise:

- `lexnepal-web`: `.next/standalone/app.cjs`
- `lexnepal-worker`: `npm run jobs:worker`
- `lexnepal-scheduler`: `npm run jobs:scheduler`

Because worker and scheduler entrypoints are TypeScript scripts using `tsx`, the current worker
deployment model needs the source checkout with dev tooling installed. A future compiled-worker
artifact can reduce that requirement.
