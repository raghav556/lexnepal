# ADR-0003: Use Drizzle ORM

- Status: accepted
- Date: 2026-08-02
- Owner: API/data owner role
- Reviewers: Migration owner role

## Context

LexNepal must translate 45 Convex tables into explicit PostgreSQL schema, constraints, indexes and repeatable migrations. The migration needs SQL visibility and must preserve legacy Convex identifiers during transition.

## Decision

Use Drizzle ORM and Drizzle Kit for the PostgreSQL schema and migrations. SQL migrations remain reviewed artifacts; business rules stay in domain services rather than ORM models.

## Consequences

- Phase 3 will add Drizzle after the PostgreSQL provider ADR is accepted.
- Schema design remains PostgreSQL-first and can use constraints, indexes and transactions directly.
- Switching to Prisma later requires a superseding ADR and a migration-cost assessment.

## Security and rollback impact

Firm scoping is enforced in schema, repositories and policies rather than relying on ORM filtering conventions. Migration rollback uses reviewed SQL/down or forward-fix procedures and database recovery, not runtime schema synchronization.
