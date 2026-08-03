# PostgreSQL Schema Design

**Status:** Phase 3 implemented and verified locally  
**Date:** 2026-08-02  
**Schema source:** `db/schema.ts`  
**Migration dialect:** PostgreSQL

## Scope and counts

| Artifact                              |                                                Count |
| ------------------------------------- | ---------------------------------------------------: |
| Convex source tables mapped           |                                                   45 |
| PostgreSQL target tables              |                                                   58 |
| Normalized relationship/child tables  |                                                   13 |
| Tenant tables with `firm_id NOT NULL` | 60 (57 Phase 3 tables plus 3 Phase 6 storage tables) |
| PostgreSQL enums                      |                                                   42 |
| Explicit documented indexes           |                                                  125 |
| Data-quality check constraints        |                                                   19 |
| JSONB columns                         |                                                    2 |

`firms` is the only global registry. Every other table is tenant-owned. Current Convex rows that behave as global templates or CMS content must be copied to each applicable firm during data migration; null or ambiguous firm ownership is not preserved.

## Identity and tenancy

- New records use UUID primary keys.
- Imported records preserve the Convex identifier in a unique nullable `legacy_convex_id` column.
- Firm-owned business uniqueness includes `firm_id`.
- Every tenant table also has a unique `(firm_id, id)` candidate key.
- Relationship tables and critical domain tables use composite `(firm_id, foreign_id)` foreign keys, preventing a valid ID from another firm being referenced.
- Tenant authorization and PostgreSQL RLS/session context are Phase 4 concerns; Phase 3 establishes the relational invariants they rely on.

## Lifecycle and records fields

Every table has:

- `created_at TIMESTAMPTZ NOT NULL`
- `updated_at TIMESTAMPTZ NOT NULL`
- `deleted_at TIMESTAMPTZ NULL`

A database trigger maintains `updated_at`. Document deletion additionally requires `deleted_by`, while legal holds require a reason. Retention and legal-hold business enforcement remains in the Phase 4 policy/service layer and cannot be bypassed by repositories.

## Normalization

The complete field mapping is in `normalization-map.csv`. Arrays used for membership, filtering, ordering or relationships were moved into rows, including case teams, task watchers, message reads, document tags, template variables, KYC files and research tags.

Only genuinely flexible settings use JSONB:

- `firm_settings.value`
- `cms_settings.value`

No relationship, financial value, status, authorization field or document metadata is stored in JSONB.

## Documents and search

- Document versions use a self-FK plus firm-aware parent/version uniqueness.
- Documents, envelopes, recipients and challenges use firm-aware foreign keys.
- File size, SHA-256, version, legal-hold and deletion invariants have database checks.
- The Convex search index is replaced initially with a PostgreSQL GIN full-text expression index over title, description and extracted text.
- `pg_trgm` remains a provider-extension decision and is not required by the initial migration.

## Financial integrity

- Monetary values use fixed-precision `NUMERIC`, never floating point.
- Amount, quantity, duration and invoice-total checks are enforced in PostgreSQL.
- `runFinancialTransaction` is the required server boundary for future invoice, payment, trust, expense and time-entry mutations.
- Database tests prove atomic rollback. Domain-service transaction tests are added as each financial endpoint migrates.

## Migration policy

- `0000_initial_postgresql_schema.sql` is the generated base schema.
- `0001_tenant_integrity_and_checks.sql` adds custom tenant and PostgreSQL constraints.
- Migration SHA-256 values are committed in `drizzle/checksums.json`.
- Applied migrations are immutable; changes require a new numbered migration.
- The down migration destroys the empty schema and is only for rehearsal. Production rollback uses PITR/backup restoration.

## Verification

`npm run db:test` uses ephemeral PGlite PostgreSQL and proves:

- all 45 mappings and all 58 target tables exist;
- all 60 current tenant tables require `firm_id`;
- documented indexes exist;
- firm-owned uniqueness permits the same key in different firms but rejects duplicates inside one firm;
- cross-firm case, document-version and signer relationships fail;
- document and financial checks reject invalid rows;
- financial writes roll back atomically;
- the initial clean-schema down migration succeeds.

Production-provider migration, backup and PITR rehearsal remains blocked on ADR-0002.
