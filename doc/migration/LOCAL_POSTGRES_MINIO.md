# Local PostgreSQL and MinIO

LexNepal uses an isolated native PostgreSQL cluster and a self-hosted MinIO server for local Next.js development. The existing machine-wide PostgreSQL service on port 5432 is not modified.

## Installed services

| Dependency    | Local address           | Persistent data                           |
| ------------- | ----------------------- | ----------------------------------------- |
| PostgreSQL 17 | `127.0.0.1:5433`        | `%LOCALAPPDATA%\LexNepal\PostgreSQL\data` |
| MinIO API     | `http://127.0.0.1:9000` | `%LOCALAPPDATA%\LexNepal\MinIO\data`      |
| MinIO console | `http://127.0.0.1:9001` | Same MinIO data directory                 |
| ClamAV daemon | `127.0.0.1:3310`        | `%LOCALAPPDATA%\LexNepal\ClamAV`          |
| Mailpit SMTP  | `127.0.0.1:1025`        | Local invitation/recovery capture          |
| Mailpit UI    | `http://127.0.0.1:8025` | Same Mailpit process                       |

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

The start command is idempotent: it initializes the project cluster and database only when missing, then starts PostgreSQL, MinIO, ClamAV and Mailpit if they are not already healthy.

Run the legacy React shell at `http://localhost:3002` with `npm run dev:legacy`; it proxies `/api` to the Next.js server on port 3001. Invitation links return to the React shell through `APP_PUBLIC_URL`.

Update ClamAV signatures with `npm run local:clamav:update`, then restart the local infrastructure so the daemon reloads them.

## MinIO compatibility

Local settings use `OBJECT_STORAGE_PROVIDER=minio`, path-style addressing, and `OBJECT_STORAGE_SSE=none`. MinIO buckets are private by default. AWS-only Public Access Block and ownership-control calls are intentionally not sent to MinIO.

At-rest encryption for a production MinIO deployment requires a configured external KMS. Local disk encryption is outside the application adapter and should be supplied by the workstation or volume when required.

## Verification state

The local database is considered ready after all committed Drizzle migrations apply. Storage is ready only when the bucket is private, versioning is enabled, lifecycle rules exist for `quarantine/` and `rejected/`, and the presigned upload/download verification succeeds.
