# Database migrations

`db/schema.ts` is the Drizzle schema source and this directory contains the committed PostgreSQL migrations.

Rules:

- Generate schema changes with `npm run db:generate -- --name=<description>`.
- Use custom migrations for PostgreSQL features Drizzle cannot express.
- Never use `drizzle-kit push` against shared, staging or production databases.
- Never edit a migration after it has been applied outside an ephemeral development database.
- Run `npm run db:check`, `npm run db:integrity` and `npm run db:test` before merging.
- The initial down migration is destructive and is only for empty-database rehearsal. Production rollback uses backup/PITR procedures.
