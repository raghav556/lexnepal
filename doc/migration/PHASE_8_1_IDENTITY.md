# Phase 8.1 — firms, users, settings, sessions and audit

## Current status

Status: `complete_local`. The local authoritative backend is Next.js/PostgreSQL with `AUTH_PROVIDER=local` and `VITE_BACKEND_IDENTITY=next`. Production remains a separate deployment approval and must use a real immutable export and production credentials.

## Accepted local architecture

- Better Auth owns passwords, recovery tokens, email verification, sessions, database rate limits, TOTP and backup codes.
- LexNepal owns firm membership, roles, capabilities and account state.
- Mailpit captures invitation and recovery email locally; delivery still runs through the PostgreSQL durable queue.
- Administrators and partners must enroll MFA before application APIs authorize them.
- MinIO stores avatars privately; uploads are quarantined, SHA-256 checked and ClamAV scanned before promotion.
- Convex sessions, passwords, activation tokens and TOTP secrets are explicitly retired, never migrated.

## Implemented Next.js surface

- Firm-scoped users, directory, detail, create/invite, update, archive and own-profile update.
- Password invitation/recovery, sign-in, mandatory privileged MFA, audited administrator MFA recovery and revocable sessions.
- Firm settings and capability-matrix management.
- Firm-scoped audit events with actor, IP, request ID and timestamp.
- Avatar upload intents, quarantine, durable scan, promotion, signed read and removal.
- Idempotent Convex identity migration plus read-only field reconciliation.
- Typed frontend identity adapter with the domain flag switched locally to Next.js.

## Local exit gate

- [x] Invitation and reset email use the durable job queue and never return activation secrets.
- [x] Password and MFA ownership is recorded in ADR-0020.
- [x] Privileged accounts are blocked until TOTP enrollment.
- [x] Avatar upload uses MinIO quarantine and ClamAV scanning.
- [x] Every page is free of direct identity/settings/audit Convex calls.
- [x] Identity migration is idempotent and excludes legacy credential material.
- [x] Anonymous, same-firm, cross-firm, MFA and sensitive-DTO route checks pass.
- [x] Read-only shadow reconciliation passes with zero mismatches.
- [x] Local identity backend flag is `next`.

## Completed Phase 8.2 boundary

`useCmsTeamIdentityBridge` now uses the Next.js identity invitation/archive API and the firm-scoped CMS team-profile API when the CMS backend flag is `next`. Its Convex branch remains only as an explicit rollback path.

Hard user deletion is not reproduced. Users are suspended/archived so legal and audit history remains intact.
