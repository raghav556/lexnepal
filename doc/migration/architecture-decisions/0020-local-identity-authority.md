# ADR-0020: PostgreSQL-backed local identity authority

- Status: accepted for local development
- Date: 2026-08-02
- Owner: migration owner
- Supersedes: ADR-0004 and ADR-0005 for the local environment only

## Context

Hercules is not provisioned locally. Waiting for external tenant configuration prevents identity migration, invitation, MFA, session and route-security verification.

## Decision

Use Better Auth with the existing local PostgreSQL database as the local credential authority. Better Auth owns password hashes, password-reset tokens, verified email state, rate limits, session cookies, TOTP secrets and backup codes. LexNepal's `users` table owns firm membership, application role, capability policy, public profile and active/pending/suspended state.

Invitations are inaccessible random-password accounts followed by a single-use password-reset flow. Delivery is a durable `communication.email` job to local Mailpit. Administrators and partners cannot access application APIs until Better Auth confirms TOTP enrollment. Public avatars enter a private MinIO quarantine prefix and must pass size, MIME, magic-byte, SHA-256 and ClamAV checks before promotion.

Convex password hashes, activation tokens, TOTP secrets and sessions are never imported. All Convex sessions are retired at migration.

## Consequences

- Local development no longer depends on Hercules credentials.
- Production may adopt the same authority or supersede this ADR with a separately validated external identity provider.
- Mailpit is a local capture service, not a production email provider.
- The application database secret must be replaced in production; startup rejects the checked development default.
- `AUTH_PROVIDER=hercules` remains available during coexistence and rollback.

## Evidence

- `npm run auth:verify-boundary`
- `npm run auth:verify-avatar`
- `npm run migration:identity -- <export> <firm-map>` run twice
- `npm run migration:identity:shadow -- <export> <firm-map>`

## Rollback

Set `VITE_BACKEND_IDENTITY=convex` and restore the previous authentication provider. Do not copy Better Auth credential material back into Convex.
