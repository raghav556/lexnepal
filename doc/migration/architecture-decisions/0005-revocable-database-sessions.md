# ADR-0005: Store revocable opaque browser sessions in PostgreSQL

- Status: proposed
- Date: 2026-08-02
- Owner: Security owner — `TBD`
- Reviewers: Data owner, API owner, operations owner

## Context

LexNepal needs immediate session revocation, suspended-user enforcement and current firm/capability evaluation. A self-contained browser JWT would preserve stale permissions until expiry and complicate revocation.

## Decision

Use 256-bit random opaque session tokens in an HttpOnly, SameSite=Lax cookie. Store only the SHA-256 token hash, identity subject, user/firm binding, expiry, request metadata and revocation metadata in PostgreSQL. Re-read the user and role-permission override on every authenticated request. Default lifetime is eight hours and is configurable between five minutes and thirty days.

Legacy `sessions` rows remain migratable, but only rows with complete authentication fields can authenticate. Composite foreign keys bind the user and revoking actor to the session firm.

## Consequences

- Every browser request performs a session and user lookup.
- Role changes, suspension, pending status and revocation take effect on the next request.
- Cleanup of expired rows is a future scheduled job; expired rows are never accepted.
- Production cookies require HTTPS and receive `Secure` automatically in production.

## Security and rollback

Raw tokens are returned only in `Set-Cookie` and are never persisted. Revocation is idempotent. During rollback, expire the Next.js cookie and return browser authentication authority to Convex; preserve session/audit rows for the approved evidence-retention period.

## Evidence

- `drizzle/0002_authentication_sessions.sql`
- `next-app/app/api/v1/auth/session/route.ts`
- Database and session security tests
