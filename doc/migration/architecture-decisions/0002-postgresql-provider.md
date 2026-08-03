# ADR-0002: PostgreSQL provider and recovery policy

- Status: proposed
- Date: 2026-08-02
- Owner: Data/platform owner roles
- Reviewers: Security, legal and migration owner roles

## Context

Phase 3 defines provider-neutral PostgreSQL migrations and verifies them with PGlite. A managed production provider must still be selected without weakening tenancy, recovery, residency or operational requirements.

## Minimum acceptance criteria

- Supported PostgreSQL 16 or newer.
- TLS required for every connection and encryption at rest with managed key rotation.
- Private networking or documented IP/identity access controls.
- High availability and automatic failover appropriate to the approved service target.
- Point-in-time recovery and automated backups meeting the approved RPO/RTO and retention policy.
- Separate development, staging and production databases and credentials.
- Least-privilege migration and runtime roles.
- Metrics for connections, locks, replication lag, storage, CPU, slow queries and failed backups.
- Tested export and restore to a separate database.
- Region and subprocessor terms approved for Nepal data-residency/legal requirements.
- Support for required GIN full-text indexes; `pg_trgm` support is desirable but not required initially.

## Decision still required

Compare eligible providers and record region, version, HA tier, backup/PITR settings, cost, connection pooling and recovery-test evidence. Do not place production data in a provider until this ADR is accepted.

## Migration and rollback impact

The provider must run the committed migrations unchanged. A clean staging migration, representative-volume rehearsal, backup, PITR and restore test are required before production cutover. Production schema rollback prefers restore/forward-fix rather than destructive down migrations.
