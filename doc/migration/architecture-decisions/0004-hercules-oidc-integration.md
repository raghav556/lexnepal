# ADR-0004: Preserve Hercules as the OIDC identity provider

- Status: proposed
- Date: 2026-08-02
- Owner: Security owner — `TBD`
- Reviewers: Platform owner, API owner, migration owner

## Context

LexNepal currently delegates identity to Hercules through Convex. The installed `@usehercules/auth` package exposes React and Convex adapters, but no Next.js server adapter. Replacing the identity provider is outside the approved migration scope.

## Decision

Preserve Hercules as the authority. Next.js validates JWT access tokens against the issuer discovery document and remote JWKS, requiring the configured issuer, client audience and an allowlist of asymmetric algorithms. A verified identity must match an existing LexNepal `users.token_identifier`; authentication never creates or links an account by email.

The API accepts a Hercules bearer token for server-to-server use and exchanges it at `POST /api/v1/auth/session` for a local browser session. Browser code never receives database credentials or internal user secrets.

## Consequences

- Identity lifecycle and credential authentication remain with Hercules.
- LexNepal owns application account status, firm assignment, roles and capabilities.
- Issuer/JWKS availability affects new bearer validation; established local sessions remain independently revocable.
- A staging proof must confirm the production token audience, issuer, algorithm and `tokenIdentifier` format before acceptance.

## Security and rollback

Fail closed on discovery, signature, issuer, audience, expiry or account-link failures. During coexistence, restore Convex authentication authority using the migration rollback runbook; do not auto-link identities as a rollback shortcut.

## Evidence

- `src/server/auth/hercules-oidc.ts`
- `src/server/auth/session-service.ts`
- Phase 4 authentication and authorization tests
