# ADR-0016: Use versioned HTTP API contracts

- Status: accepted
- Date: 2026-08-02
- Owner: API owner role
- Reviewers: Migration/security owner roles

## Context

The legacy React application must switch domain by domain without importing Next.js server code. External/public sharing routes also need stable HTTP semantics.

## Decision

- Browser and external interfaces use Route Handlers under `/api/v1`.
- Zod schemas in `src/shared/contracts` define request and response contracts.
- Route Handlers own HTTP parsing only; domain services own business behavior.
- Errors use `{ error: { code, message, requestId, details? } }` and never expose internal stacks.
- Breaking contract changes require a new API version or a documented compatibility period.
- UI-only Server Actions may be introduced after the UI moves to Next.js, but cannot duplicate service logic.

## Consequences

The legacy application can migrate through a typed client adapter. Contract and integration tests become mandatory evidence in the parity ledger.

## Security and rollback impact

Authentication and authorization remain server-side. Request IDs support incident tracing. Domain feature flags can route callers back to Convex during the approved rollback window.
