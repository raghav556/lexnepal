# Phase 4 Authentication and Authorization Evidence

**Status:** Local implementation complete; staging identity-provider proof and security-owner ADR acceptance pending  
**Date:** 2026-08-02

## Implemented boundary

- Hercules OIDC discovery/JWKS verification with issuer, audience, expiry and algorithm validation.
- Bearer-to-opaque-session exchange at `/api/v1/auth/session`.
- Hashed, expiring, tenant-bound, revocable PostgreSQL sessions.
- Active/pending account checks and current role-permission resolution on every request.
- Central `requireSession`, `requireFirmContext`, `requireCapability`, `requireSameFirm`, `requireCaseAccess`, `requireClientOwnership` and `requireDocumentAccess` policies.
- Safe current-session DTO and actor/firm/IP/request-ID/timestamp audit context.

## Configuration

```text
HERCULES_OIDC_AUTHORITY=https://issuer.example
HERCULES_OIDC_CLIENT_ID=lexnepal-client-id
AUTH_SESSION_COOKIE_NAME=lexnepal_session
AUTH_SESSION_TTL_SECONDS=28800
DATABASE_URL=postgresql://...
```

The reverse proxy must overwrite `X-Real-IP` or `X-Forwarded-For`; untrusted clients must not be able to supply the audit IP header directly.

## Verification evidence

- Typecheck, ESLint and Next.js production build pass.
- 15 unit tests pass, including anonymous, suspended, pending, expiry, revocation, role/capability and sensitive DTO cases.
- 9 database tests pass, including incomplete-session and cross-firm revoker rejection.
- 5 operational route integration tests pass.

## Remaining production gate

1. Accept ADR-0004 and ADR-0005 with named owners.
2. Verify a real Hercules access token in staging, including issuer, audience, signature algorithm and identifier mapping.
3. Verify the deployment proxy overwrites client-IP headers and terminates HTTPS.
4. Run session issuance, cookie, revocation, suspension and cross-firm attack tests against managed PostgreSQL.
