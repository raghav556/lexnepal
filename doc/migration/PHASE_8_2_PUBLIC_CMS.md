# Phase 8.2 — Public CMS

## Current status

Status: `complete_local`. PostgreSQL and Next.js are authoritative locally through `VITE_BACKEND_CMS=next`. Convex remains available only behind the domain rollback flag. Production cutover still requires a fresh immutable production export, approved firm assignment and production reconciliation.

## Decisions

- Every CMS record is resolved through a configured firm. Public requests use `PUBLIC_FIRM_SLUG`; authenticated management requests use the session firm and require `cms.manage`.
- Public endpoints expose only active, approved or published content. Drafts, inactive records, applications and subscribers are never returned publicly.
- Deletes are soft deletes. Administrative mutations and their audit events commit atomically.
- CMS settings cannot contain keys suggesting secrets, tokens, passwords, private values, API keys or executable scripts. The legacy arbitrary live-chat script setting is deliberately retired.
- Navigation accepts only relative paths or HTTPS URLs.
- Team account creation, suspension and authentication remain owned by Phase 8.1 identity. CMS owns only public profile fields.
- Legacy global CMS data must be assigned to one explicit target firm during migration; the importer never guesses tenant ownership.

## Implemented vertical slice

- PostgreSQL repositories, tenant-scoped services, Zod contracts and Next.js Route Handlers for practice areas, testimonials, blog posts, news/awards, careers, job applications, resources, legal pages, navigation, newsletter, CMS settings and public team profiles.
- Public collection, blog-slug, legal-page, resource-download, newsletter-subscription and career-application endpoints.
- Authenticated collection CRUD, application workflow, newsletter workflow, settings, legal-page, navigation reorder and team-profile endpoints.
- Typed TanStack Query hooks and mutations with stable query keys and normalized API errors.
- All React components are free of direct `api.cms` calls. The adapter retains a feature-flagged Convex rollback branch.
- A governance screen manages privacy/terms content and newsletter subscribers.
- An idempotent Convex directory/ZIP importer preserves legacy IDs, normalizes career requirements, repairs job and navigation relationships, rejects unsafe setting keys and reports count reconciliation.

## Local commands

```powershell
npm run migration:cms -- tests/fixtures/convex-cms-export 61000000-0000-4000-8000-000000000001
npm run cms:verify-local
```

The migration command is safe to rerun. For production, replace the fixture with the immutable export path and use the approved target firm UUID.

## Verification evidence

- The representative export was imported twice with equal source/target counts and zero exceptions.
- Public route verification confirms published-only reads.
- Anonymous administration is rejected with 401.
- A cross-firm mutation returns 404 and does not disclose record existence.
- Executable CMS settings are rejected with 400.
- Duplicate newsletter subscription is idempotent.
- Contract tests cover unsafe settings, unsafe navigation URLs, publication rules and testimonial rating bounds.

## Local exit gate

- [x] Every listed CMS table has a tenant-scoped repository and service.
- [x] Every management operation requires `cms.manage` and records audit context.
- [x] Public response filtering and sensitive-setting DTO rules pass.
- [x] Every direct frontend CMS consumer uses the adapter.
- [x] Migration is idempotent and reconciliation passes.
- [x] Cross-firm and route-level security verification passes.
- [x] Local CMS backend flag is `next`.
- [x] Convex writes can be restored only by intentionally changing the domain flag.

## Deliberate boundaries

Public job applications currently accept an optional HTTPS resume link; LexNepal does not ingest or trust that remote file. A future first-party resume upload must use the existing quarantine, hash and malware-scanning pipeline before staff download. Production deployment should also place gateway rate limits and bot protection in front of anonymous newsletter and application endpoints; application-level validation and duplicate-newsletter idempotency are already enforced.
