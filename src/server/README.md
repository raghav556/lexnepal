# Server boundary

All TypeScript modules below `src/server/` must import `server-only` as their first runtime import. Client components must communicate through typed APIs and may not import repositories, services, policies, jobs, storage or environment modules directly.

The planned subdirectories are `auth`, `db`, `dal`, `repositories`, `services`, `policies`, `jobs`, `storage`, `audit`, `http`, and `observability`. Empty domains are added when their first implementation lands; placeholder business logic is intentionally avoided.
