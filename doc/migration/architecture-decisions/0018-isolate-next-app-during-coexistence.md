# ADR-0018: Isolate the Next.js application during coexistence

- Status: superseded
- Date: 2026-08-02
- Superseded: 2026-08-06 (R5.6)
- Owner: Migration/API owner roles
- Reviewers: Frontend owner role

## Context

The legacy Vite application stored ordinary React components under `src/pages/`. Next.js treats that directory as its Pages Router. A root-level Next `app/` therefore failed because Next requires detected `pages` and `app` directories to share a parent. Moving legacy pages early would have mixed Phase 2 with the Phase 11 frontend migration.

## Decision (historical)

Keep the Next.js project in `next-app/` during coexistence:

- `next-app/app/` contains App Router routes.
- `src/server`, `src/shared` and later `src/client` remain repository-level shared layers.
- Root npm scripts explicitly pass `next-app` to the Next CLI.
- Legacy Vite runs through `dev:legacy` and `build:legacy` on port 3002.
- Phase 11 may consolidate directories after legacy `src/pages` no longer conflicts.

## Supersession (R5.6)

Isolation is removed after page bodies moved to `src/views/`:

- App Router lives at [`src/app/`](../../../src/app/) with root [`next.config.ts`](../../../next.config.ts).
- Vite shell (layouts + thin re-exports) lives at [`src/legacy-pages/`](../../../src/legacy-pages/) so it is **not** named `pages` and does not trigger Pages Router detection.
- `dev:legacy` (:3002) remains available until decommission (R8); Next fallback rewrite to Vite may remain during dual-run.
- Cleanup **C5** (remove `next-app` workaround) is satisfied locally.

## Consequences

The two runtimes still build independently when needed. Shared layers stay at repository root (`src/server`, `src/shared`, `src/client`, `src/views`).

## Rollback impact

Reintroducing a `src/pages` directory would restore the Pages Router conflict and require either renaming it again or restoring a separate Next project directory.
