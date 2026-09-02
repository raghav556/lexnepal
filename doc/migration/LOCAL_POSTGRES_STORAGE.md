# Local MySQL and Local Filesystem Storage

LexNepal uses an isolated MySQL instance and a local filesystem storage root for local Next.js development. The project-owned MySQL instance listens on port 3307 and does not modify a normal MySQL service on port 3306. Stage 1 replaced the previous self-hosted MinIO server entirely; uploads and downloads now go through app-controlled routes backed by a private on-disk storage root.

## Installed services

| Dependency    | Local address           | Persistent data                            |
| ------------- | ----------------------- | ------------------------------------------ |
| MySQL 8.4     | `127.0.0.1:3307`        | `%LOCALAPPDATA%\LexNepal\MySQL\data`       |
| Storage root  | `./.local/storage`      | Workspace-local, git-ignored               |
| ClamAV daemon | `127.0.0.1:3310`        | `%LOCALAPPDATA%\LexNepal\ClamAV`           |
| Mailpit SMTP  | `127.0.0.1:1025`        | Local invitation/recovery capture          |
| Mailpit UI    | `http://127.0.0.1:8025` | Same Mailpit process                        |

Development credentials live in the git-ignored `.env.local`. They are intentionally local-only and must never be reused in staging or production.

## Daily commands

```powershell
npm run local:infra:start
npm run db:migrate
npm run storage:provision
npm run storage:verify-local
npm run storage:verify-clamav
npm run storage:verify-pipeline
npm run jobs:schedules:seed
npm run jobs:verify-local
npm run auth:verify-boundary
npm run auth:verify-avatar
npm run dev
```

Run the durable worker and enqueue-only scheduler in separate terminals while testing background workflows:

```powershell
npm run jobs:worker
npm run jobs:scheduler
```

Stop the project-owned services with:

```powershell
npm run local:infra:stop
```

The start command is idempotent: it initializes the project database only when missing, then starts MySQL, ClamAV and Mailpit if they are not already healthy. The storage root is created automatically.

The legacy Vite shell has been decommissioned. Next.js on `http://localhost:3001` is the only
application shell, and `APP_PUBLIC_URL` should point there for localhost invitation links.

Update ClamAV signatures with `npm run local:clamav:update`, then restart the local infrastructure so the daemon reloads them.

## Local filesystem storage

`STORAGE_ROOT` (default `./.local/storage`) is the single private root for quarantine, protected, and rejected object keys. Keys keep their existing logical identifiers (`protected/<firmId>/...`, `quarantine/...`, `rejected/...`) and map onto nested directories inside the root. The root must never be exposed through `public_html` or any static file server; all transfers happen through authorization-checked application routes.

Upload grants replace S3 presigned POSTs: the intent services mint a single-use, size-bounded, expiring grant consumed by `POST /api/v1/storage/uploads/:grantId`. Downloads replace presigned GETs: services mint a short-lived HMAC download token bound to one object key, served by `GET /api/v1/storage/objects/*?token=...`. Both endpoints are application-controlled and enforce the existing document/case/firm authorization before any bytes move.

At-rest encryption for production deployments should be supplied by the volume or disk layer; it is outside the application adapter.

## Verification state

The local database is considered ready after all committed Drizzle migrations apply. Storage is ready when the storage root exists and stays private, upload/download round-trips via the app endpoints succeed, missing objects are handled, path-traversal keys are rejected, and the tokenized upload/download verification (`npm run storage:verify-local`) passes.

## Stage 1 migration note

The MinIO server, SDK (`@aws-sdk/*`), bucket provisioning, and MinIO startup/health wiring were removed in Stage 1. Existing MinIO object data was not present on this workstation (no `%LOCALAPPDATA%\LexNepal\MinIO\data`), so no object migration was required. On a workstation that does have MinIO data, copy the bucket's object keys into `STORAGE_ROOT` preserving key layout before switching, or run the storage export/migrate helpers against a manifest.
