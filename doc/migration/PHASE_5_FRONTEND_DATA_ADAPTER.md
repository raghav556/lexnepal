# Phase 5 Frontend Data Adapter Evidence

**Status:** Exit gates complete  
**Date:** 2026-08-02

## Architecture

```text
Component
  -> domain hook and stable query key
      -> domain feature flag
          -> Convex adapter during coexistence
          -> typed Next.js API client after endpoint parity
```

`DataProvider` owns the TanStack Query client and immutable per-build backend flags. Components do not read environment variables or choose a backend.

## Initial domain surface

- Documents: `useDocuments`, `useDocumentSearch`, `useRecentDocuments`, `useCreateDocument`.
- Cases: `useCases`, `useCreateCase`.
- Tasks: `useTasks`, `useUpdateTask`.

The staff documents, cases and tasks pages use these hooks for their primary reads/writes. Other screens have been removed from direct `convex/react` imports and temporarily use the isolated bridge. Each is moved to its domain hook as that domain gains typed contracts and Next.js endpoint parity.

## Backend flags

All flags accept `convex` or `next` and default to `convex` on absence or invalid input:

```text
VITE_BACKEND_IDENTITY
VITE_BACKEND_DOCUMENTS
VITE_BACKEND_CASES
VITE_BACKEND_TASKS
VITE_BACKEND_CLIENTS
VITE_BACKEND_HEARINGS
VITE_BACKEND_FINANCE
VITE_BACKEND_MESSAGES
VITE_BACKEND_NOTIFICATIONS
VITE_BACKEND_APPOINTMENTS
VITE_BACKEND_CMS
VITE_BACKEND_HR
VITE_BACKEND_RESEARCH
VITE_BACKEND_LEADS
```

Next.js-rendered clients may use the equivalent `NEXT_PUBLIC_BACKEND_*` names. A domain flag must not be changed to `next` before its endpoints and parity suite exist.

## Query and invalidation rules

- Root: `[domain]`.
- Collection: `[domain, "list", filters]`.
- Detail: `[domain, "detail", id]`.
- Nested resource: `[domain, "detail", id, child]`.
- Successful mutations invalidate at least the domain root key.
- Keys contain serializable values only.

## Error contract

Every transport exposes `ApiClientError` with `code`, `message`, `status`, optional `requestId` and optional `details`. Structured Next.js errors retain their request ID; Convex and network failures are normalized into the same type.

## Verification

- Source scan: only `src/client/data/convex-bridge.ts` may import `convex/react`.
- ESLint blocks new direct imports.
- Unit tests cover independent flags, safe defaults, query keys and error normalization.
- Next.js and legacy Vite production builds pass.
