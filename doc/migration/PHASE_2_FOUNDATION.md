# Phase 2 Next.js Foundation

**Status:** Implemented locally; remote CI and mandatory provider/legal ADRs pending  
**Implemented:** 2026-08-02  
**Next.js:** 16.2.12

## Runtime layout

- Next.js target: `next-app/`, port 3001.
- Legacy Vite application: repository `src/`, port 3002 through `npm run dev:legacy`.
- Shared target layers: `src/server`, `src/shared`, and `src/client`.
- Convex remains authoritative; Phase 2 adds no business-domain writes.

The separate Next directory is intentional and documented by ADR-0018. It prevents the legacy `src/pages` directory from being interpreted as Next.js Pages Router routes.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Next.js development server on port 3001 |
| `npm run build` | Next.js production build |
| `npm run start` | Next.js production server on port 3001 |
| `npm run dev:legacy` | Existing Vite application on port 3002 |
| `npm run build:legacy` | Existing Vite production build |
| `npm run typecheck` | Next foundation TypeScript check |
| `npm run lint` | Next foundation lint |
| `npm run format:check` | Foundation formatting check |
| `npm test` | Unit, integration and migration-characterization tests |

## Operational endpoints

| Endpoint | Purpose | Current readiness semantics |
|---|---|---|
| `GET /api/v1/health` | Process liveness | Returns 200 when the process can serve requests |
| `GET /api/v1/readiness` | Dependency readiness | Foundation mode returns 200 without a database; setting `READINESS_REQUIRE_DATABASE=true` without `DATABASE_URL` returns 503 |
| `GET /api/v1/version` | Build identification | Returns API, application and Git versions |

Every endpoint is non-cacheable and returns/propagates `x-request-id`. API failures use the shared structured error contract. Logs are JSON, redact sensitive field names and include route, method, status, duration and request ID.

Phase 3 replaced the database configuration check with a bounded `SELECT 1`; database-mode readiness now requires a reachable PostgreSQL connection.

## Environment contract

Server variables are validated lazily through Zod:

- `APP_VERSION`
- `GIT_SHA`
- `LOG_LEVEL`
- `READINESS_REQUIRE_DATABASE`
- `DATABASE_URL`

Only fields are reported on validation failure; secret values are not echoed. No target variable currently uses the `NEXT_PUBLIC_` prefix.

## Boundary enforcement

- Every TypeScript module under `src/server` imports `server-only`.
- Client components importing `src/server` fail Next compilation.
- Architecture tests scan for missing server markers and prohibited client imports.
- Tests alias the marker only inside Vitest so server modules can be tested in Node.

## Verification evidence

Validated locally on 2026-08-02:

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run format:check`
- [x] Four unit tests
- [x] Five operational-route integration tests
- [x] Four document-security characterization tests
- [x] `npm run build`
- [x] Production-server probes for health, readiness and version returned HTTP 200
- [x] Live probes propagated `x-request-id: phase2-live-probe`
- [ ] Hosted GitHub Actions run

## Open gates

- Hosting, PostgreSQL, auth/session, object storage, worker/queue, scheduler, messaging, search/realtime, observability, secrets, Nepal residency and final rollback ADRs remain pending.
- `npm audit --omit=dev` currently reports five high-severity advisories involving the latest installed Next.js transitive `postcss`/`sharp` packages and the legacy React Router dependency. There is no non-breaking Next upgrade offered by npm at the time of this record. These are tracked as a cutover-blocking supply-chain risk; do not use `npm audit fix --force` because it proposes an invalid Next downgrade.
- Readiness has no live database check until Phase 3.
