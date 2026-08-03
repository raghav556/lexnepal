# ADR-0018: Isolate the Next.js application during coexistence

- Status: accepted
- Date: 2026-08-02
- Owner: Migration/API owner roles
- Reviewers: Frontend owner role

## Context

The legacy Vite application stores ordinary React components under `src/pages/`. Next.js treats that directory as its Pages Router. A root-level Next `app/` therefore fails because Next requires detected `pages` and `app` directories to share a parent. Moving legacy pages now would mix Phase 2 with the Phase 11 frontend migration.

## Decision

Keep the Next.js project in `next-app/` during coexistence:

- `next-app/app/` contains App Router routes.
- `src/server`, `src/shared` and later `src/client` remain repository-level shared layers.
- Root npm scripts explicitly pass `next-app` to the Next CLI.
- Legacy Vite runs through `dev:legacy` and `build:legacy` on port 3002.
- Phase 11 may consolidate directories after legacy `src/pages` no longer conflicts.

## Consequences

The two runtimes build independently without copying business rules or moving legacy screens prematurely. Configuration must retain explicit aliases to the repository-level shared layers.

## Rollback impact

Removing the isolated scaffold does not affect the legacy Vite runtime. Until a domain cutover, Convex remains authoritative.
