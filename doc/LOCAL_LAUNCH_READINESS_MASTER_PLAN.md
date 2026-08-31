# LexNepal Local Launch-Readiness Master Plan

**Owner:** Project owner with Codex acting as the local engineering delivery team  
**Scope:** Localhost only. No cloud provisioning, live deployment, DNS, production credentials, or production data changes.  
**Created:** 2026-08-31  
**Product:** Srimar Law / LexNepal legal-practice platform  
**Stack:** Next.js 16, React 19, TypeScript, PostgreSQL/Drizzle, MinIO, ClamAV, Mailpit, Better Auth, Vitest, Playwright  
**Status:** `LOCAL_LAUNCH_READY`
**Completed locally:** 2026-08-31

## 1. Purpose and completion rule

This is the single control document for taking LexNepal from its present localhost state to a
complete, premium, corporate-grade, production-shaped local release. Existing plans remain useful
technical evidence, but this file controls the order and acceptance of the remaining work.

A phase is complete only when:

1. Its implementation is present in the active Next.js/PostgreSQL application.
2. Its automated checks pass from a fresh local run.
3. Its important user journeys are verified in a real browser.
4. Loading, empty, error, success, permission, and high-data states are handled.
5. No critical/high defect remains hidden or undocumented.
6. Evidence is recorded in this document or a directly linked evidence file.

Status vocabulary:

- `NOT_STARTED` — not yet audited under this plan.
- `IN_PROGRESS` — being inspected or corrected.
- `BLOCKED` — cannot continue without an external decision or unavailable dependency.
- `PASS_LOCAL` — implementation and localhost evidence pass.
- `DEFER_PROD` — intentionally requires the later live-deployment phase.

## 2. Non-negotiable delivery rules

- Work only against local files and local services.
- Preserve existing uncommitted work; never reset or overwrite it blindly.
- Inspect before changing; every fix must be tied to reproducible evidence.
- Reuse current services, repositories, contracts, components, and tests; avoid parallel duplicate paths.
- Keep business authorization on the server, never only in the UI.
- Keep PostgreSQL tenant isolation and transactional integrity intact.
- Never edit an applied migration; add a new migration for schema changes.
- Never expose `.env.local`, passwords, tokens, private documents, or user data in reports.
- Do not label placeholders, simulated providers, or unavailable integrations as production-ready.
- Stop and record a blocker when completion requires live accounts, legal approval, or production authority.
- After each phase, rerun the checks affected by that phase before moving forward.

## 3. Current evidence-based baseline

Recorded before this plan was created:

- 83 page routes and 169 API route handlers are present.
- Public, client, staff, and admin applications exist in the Next.js App Router.
- PostgreSQL, MinIO, ClamAV, and Mailpit start successfully on localhost.
- 130 unit tests pass.
- 8 integration tests pass.
- 13 database tests pass after bringing the migration test inventory up to the current schema.
- TypeScript and ESLint pass after repairing incomplete dashboard-refactor call sites.
- Authentication baseline passes for admin, staff, and client roles.
- Auth cookie, storage presigning, ClamAV clean/EICAR, and durable-job checks pass.
- Migration integrity now covers all 43 current forward/down SQL files.
- Existing worktree contains a large in-progress dashboard and UI modernization; it must be completed,
  not discarded.
- Compatible dependency upgrades removed every critical/high finding. Four moderate `esbuild`
  advisories remain in Drizzle's development toolchain; the offered forced fix is a breaking
  migration-tool downgrade.
- Production cloud decisions and credentials remain `DEFER_PROD`.

## 4. Route and product surfaces in scope

Every surface below must be included in automated or browser verification.

### Public and unauthenticated

- Home, About, Practice Areas list/detail, Lawyers list/detail.
- Blog list/detail, News list/detail, Resources list/detail/download.
- Careers/application, Consultation booking, Contact, newsletter.
- Privacy, Terms, intake token, shared-document token.
- Sign-in, account setup, reset password, MFA enrollment, auth callback, not-found.

### Client portal

- Dashboard, cases list/detail, documents, hearings, billing/payment return.
- Booking, KYC, messages, notifications, signatures, checklist, profile.

### Staff portal

- Dashboard, cases list/detail, clients, CRM, appointments, hearings.
- Tasks, documents, research, content, messages, team chat, time, HR, profile.

### Admin portal

- Dashboard, analytics, users, clients, CRM, appointments, conflict checks, audit.
- Finance, expenses, HR, templates, document generator, settings, profile.
- CMS dashboard, homepage, navigation, about, practice areas, team, testimonials,
  blog, news, resources, careers, and governance.

### Backend domains

- Identity/auth/sessions/MFA/RBAC/audit and tenant isolation.
- Firms/settings, clients/KYC, cases, conflicts, tasks, hearings, research and SOPs.
- CRM leads/appointments/intake, communications/notifications/direct messages.
- Documents/tags/templates/storage/scanning/OCR/shares and signature envelopes/OTP.
- Finance/invoices/payments/trust/time/expenses, HR/attendance/leave/payroll.
- CMS/public content/assets/editorial workflow, analytics, jobs, scheduler and migration tooling.

## 5. Phase plan

### Phase 0 — Control, preservation, and truth baseline

**Status:** `PASS_LOCAL`

Work:

- Capture branch, commit, worktree status, diff summary, tool versions, and local service ports.
- Identify which changes predate this plan and preserve them.
- Reconcile stale documents with actual code; this plan becomes the authoritative tracker.
- Keep secrets out of logs and ensure ignored runtime files remain ignored.
- Record all failures by severity: P0 security/data loss, P1 launch blocker, P2 important polish,
  P3 enhancement.

Exit gate:

- Work is recoverable and scoped; no unknown destructive action is required.
- Current phase, open failures, and evidence commands are documented.

### Phase 1 — Architecture, route, contract, and data-flow inventory

**Status:** `PASS_LOCAL`

Work:

- Generate the canonical page-route and API-route inventories.
- Map each page to its query hooks, API handlers, service, repository, tables, permissions, and tests.
- Find dead links, orphan pages, missing detail routes, duplicate APIs, direct database access from UI,
  direct provider SDK use outside adapters, and remaining legacy/Convex runtime references.
- Reconcile endpoint parity, frontend consumers, database index map, sitemap, robots behavior, and nav.
- Classify all external integrations as local-real, sandbox/simulated, or `DEFER_PROD`.

Exit gate:

- Every active page and domain has an owner path from UI to database.
- No route or feature is silently omitted from later testing.

### Phase 2 — Engineering-quality baseline

**Status:** `PASS_LOCAL`

Required checks:

- Clean install reproducibility with the committed lockfile.
- TypeScript, ESLint, formatting check, unit tests, integration tests, database tests.
- Drizzle schema check, migration checksum integrity, and migration application.
- Next.js production build and start-mode smoke test.
- Search for TODO/FIXME, disabled checks, skipped tests, debug logging, unsafe casts, and swallowed errors.

Exit gate:

- All required commands pass without ignored warnings.
- Build output contains no unexplained dynamic/runtime failure.

### Phase 3 — Local infrastructure and database integrity

**Status:** `PASS_LOCAL`

Work:

- Verify repeatable start/stop for PostgreSQL `:5433`, MinIO `:9000/:9001`, ClamAV `:3310`,
  Mailpit `:1025/:8025`, and Next.js `:3001`.
- Apply all forward migrations to the local database and verify checksums.
- Validate schema constraints, tenant ownership, foreign keys, unique constraints, indexes, and transactions.
- Verify idempotent seed/provision flows and all demo roles.
- Verify MinIO bucket privacy, presigned transfer, quarantine, scanning, promotion/rejection, and cleanup.
- Exercise backup and restore drill using only local data.

Exit gate:

- A stopped local environment can be started, migrated, seeded, verified, backed up, and restored
  using documented commands.

### Phase 4 — Backend/API correctness and business domains

**Status:** `PASS_LOCAL`

Work:

- Run the domain verifiers for identity, CMS, matters, work management, finance, CRM,
  communications, documents, envelopes, analytics, HR, jobs, and migration tooling.
- Verify request validation, normalized errors, permission checks, tenant filtering, pagination,
  sorting, filtering, idempotency, audit events, and transaction boundaries.
- Verify create/read/update/archive/restore/delete behavior where supported.
- Verify no API returns private server fields or cross-firm data.
- Verify honest behavior for unavailable OCR, SMS, payment gateways, court data, or other providers.

Exit gate:

- All active API/domain verification scripts pass.
- No P0/P1 backend defect remains.

### Phase 5 — Authentication, authorization, privacy, and application security

**Status:** `PASS_LOCAL`

Work:

- Verify sign-in/out, session expiry/revocation, invitations, setup, reset, verification, MFA and lockout.
- Test admin/staff/client route guards and server capabilities, including direct API attacks.
- Test horizontal/vertical privilege escalation and cross-firm access.
- Audit cookies, CSRF/origin checks, rate limiting, redirect safety, upload validation, XSS sinks,
  rich-text sanitation, SQL construction, secrets, headers, and sensitive logging.
- Review public token entropy, expiry, revocation and download authorization.
- Remediate dependency vulnerabilities without forced breaking downgrades.

Exit gate:

- Security tests and production-auth checklist pass locally where applicable.
- No known critical/high exploitable issue remains; production-only controls are marked `DEFER_PROD`.

### Phase 6 — Public website and CMS end-to-end

**Status:** `PASS_LOCAL`

Work:

- Verify every public page uses live PostgreSQL CMS data with credible loading/error/empty fallbacks.
- Verify admin/staff editorial CRUD, review/publish/unpublish, slug uniqueness, preview, ordering,
  navigation nesting, assets, gated resources, applications, newsletter and legal pages.
- Verify metadata, canonical URLs, sitemap, social previews, headings, structured content and 404s.
- Check header/footer/mobile menu, consultation/contact conversion paths, typography, spacing,
  imagery, motion, dark mode and visual consistency.
- Remove hardcoded firm content where the CMS is authoritative; keep safe defaults only where justified.

Exit gate:

- Admin CMS changes are reflected correctly on the public site.
- All public routes pass desktop/mobile browser checks without console or network errors.

### Phase 7 — Client, staff, and admin portal completeness

**Status:** `PASS_LOCAL`

Work:

- Complete the shared premium dashboard system and portal-specific visual identities.
- Verify every portal route, deep link, sidebar, mobile navigation, breadcrumbs and account menu.
- Verify forms, dialogs, tables, filters, search, pagination, export, charts, date/currency formatting,
  optimistic/loading states, error recovery, empty states and destructive confirmations.
- Verify Nepali/English localization behavior and AD/BS date presentation where promised.
- Ensure all displayed metrics are truthful and derived from real APIs.
- Remove broken demo actions and label any intentional sandbox flow clearly.

Exit gate:

- Every portal page is functional for its authorized role at desktop, tablet and mobile widths.
- No P0/P1 UI, navigation, data-binding or permission defect remains.

### Phase 8 — Cross-domain workflows

**Status:** `PASS_LOCAL`

Work:

- Lead → intake → appointment → conflict check → client → matter.
- Matter → task/hearing/time/document → invoice/payment/trust → analytics.
- User invite → activation → MFA/profile → assignment → audit/session revocation.
- Client KYC upload → scan → review → status and notification.
- Document upload → quarantine → scan → share/download/OCR where available.
- Envelope create → send → view → OTP → sign/decline/void/expire → certificate state.
- Leave request → review → balance → payroll run/payslip.
- CMS draft → review → publish → public consumption.

Exit gate:

- Each workflow passes with valid data, invalid data, unauthorized role, and recoverable failure cases.

### Phase 9 — Accessibility, responsive design, and visual QA

**Status:** `PASS_LOCAL`

Work:

- Keyboard navigation, visible focus, logical tab order, skip/navigation semantics, dialog focus trapping.
- Labels, names, roles, status announcements, validation messages and non-color status cues.
- WCAG AA contrast for text, controls, focus, charts and portal themes in light/dark mode.
- Reflow at mobile, tablet, laptop, desktop and scaled-Windows widths; no clipped content or horizontal overflow.
- Browser screenshots for representative public/admin/staff/client pages and important states.
- Consistent corporate spacing, hierarchy, typography, iconography, tables, charts and density.

Exit gate:

- Automated accessibility checks plus manual keyboard/visual review pass for representative routes.
- No serious/critical accessibility violation or broken responsive layout remains.

### Phase 10 — Performance, reliability, and dependency health

**Status:** `PASS_LOCAL`

Work:

- Resolve npm audit findings using compatible upgrades and rerun full regression.
- Check server/client bundle boundaries, expensive renders, query duplication, N+1 database access,
  missing indexes, oversized assets, image/font handling and caching.
- Measure cold/warm public and portal requests plus the existing performance smoke gate.
- Verify timeouts, retries, dead-letter recovery, idempotency and graceful dependency failures.
- Confirm no service worker caches private authenticated responses or stale sensitive data.

Exit gate:

- No critical/high production dependency vulnerability remains, or a precise non-exploitable exception is documented.
- Agreed local performance gates pass with no data-integrity compromise.

### Phase 11 — Automated browser regression and production-shaped localhost rehearsal

**Status:** `PASS_LOCAL`

Work:

- Seed deterministic E2E fixtures.
- Run all Playwright suites for auth, public, client, staff and admin workflows.
- Add coverage for any route or P1 workflow missing from the current suite.
- Run production build, production-mode local server, health/readiness, route smoke and deep links.
- Run backup/restore, migration rehearsal, security, storage, job and performance proof commands.
- Review browser console, failed network requests, server errors and screenshots/traces.

Exit gate:

- Full automated suite passes twice from a stable seeded local state.
- Production-shaped localhost rehearsal passes with no unexplained difference.

### Phase 12 — Local release sign-off and owner handoff

**Status:** `PASS_LOCAL`

Work:

- Produce a plain-language completed/open/deferred report.
- Update README with exact local setup, start, stop, seed, test and troubleshooting commands.
- Document demo roles without exposing reusable production secrets.
- Record known limitations and all `DEFER_PROD` items separately from local defects.
- Produce the later production launch checklist: hosting, managed PostgreSQL/backups, object storage,
  identity, secrets vault, TLS/DNS, email/SMS/payment providers, monitoring, privacy/legal approvals,
  incident ownership, rollback, data migration and final security review.

Exit gate:

- All Phases 0–11 are `PASS_LOCAL`.
- Owner can start and evaluate the full application locally using the documentation.
- Final status is **LOCAL LAUNCH READY**; real public launch remains `DEFER_PROD`.

## 6. Required command gates

These commands form the minimum final regression set; additional route/domain checks may be added.

```text
npm ci
npm run local:infra:start
npm run db:integrity
npm run db:check
npm run db:migrate
npm run storage:provision
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run verify:auth-baseline
npm run verify:auth-cookies
npm run verify:auth-production
npm run storage:verify-local
npm run storage:verify-clamav
npm run storage:verify-pipeline
npm run jobs:verify-local
npm run cms:verify-local
npm run matters:verify-local
npm run financial:verify-local
npm run crm:verify-local
npm run communication:verify-local
npm run documents:verify-local
npm run envelopes:verify-local
npm run analytics:verify-local
npm run hr:verify-local
npm run build
npm run test:e2e
npm run verify:local-production-shaped
```

## 7. Evidence ledger

| Phase | Status       | Evidence / remaining blocker                                                                                                                                                                                       |
| ----- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0     | `PASS_LOCAL` | Branch, dirty worktree, toolchain, ports, and services inventoried; pre-existing work preserved.                                                                                                                   |
| 1     | `PASS_LOCAL` | 83 page routes and 169 API files mapped; inventory, matrix, and active App Router paths match 83/83 with no orphan.                                                                                                |
| 2     | `PASS_LOCAL` | Prettier, zero-warning ESLint, TypeScript, 130 unit, 8 integration, 4 characterization, 13 database tests, and optimized build pass.                                                                               |
| 3     | `PASS_LOCAL` | PostgreSQL, MinIO, ClamAV, and Mailpit pass; migrations/checksums, repeatable seeds, storage, backup, and isolated restore drill pass.                                                                             |
| 4     | `PASS_LOCAL` | Identity, CMS, matters, work management, finance, CRM, communications, documents, envelopes, analytics, HR, and durable jobs pass locally.                                                                         |
| 5     | `PASS_LOCAL` | Auth baseline/cookies/checklist, invitations, client grants, MFA, rate limits, upload/XSS protections, tenant boundaries, security headers, and safe DTO checks pass. No critical/high dependency finding remains. |
| 6     | `PASS_LOCAL` | Public dynamic verifiers and CMS workflow proofs pass; the full public/auth route sweep and consultation conversion pass in Chromium.                                                                              |
| 7     | `PASS_LOCAL` | Every static admin, staff, and client route renders for its authorized role; portal workflows, navigation, responsive shells, and permission-aware states pass.                                                    |
| 8     | `PASS_LOCAL` | Browser and domain proofs cover appointments, CRM, users, HR, CMS, matters/documents, finance, billing/signatures, KYC, storage scanning, retries, and idempotency.                                                |
| 9     | `PASS_LOCAL` | Nine mobile Chromium checks cover WCAG A/AA serious/critical violations, overflow, and public/authenticated keyboard navigation; representative screenshots were visually inspected.                               |
| 10    | `PASS_LOCAL` | Local performance fixture stays under its 2-second budgets; runtime audit has no critical/high finding. Four moderate Drizzle development-tool advisories are documented.                                          |
| 11    | `PASS_LOCAL` | Complete Playwright suite passes twice at 28/28. Full production-shaped harness passes 23/23. Optimized local start on port 3002 passes health, readiness, CSS, headers, and public deep links.                    |
| 12    | `PASS_LOCAL` | Root README and `doc/LOCAL_RELEASE_SIGN_OFF.md` provide owner setup, stop, test, troubleshooting, limitations, and later production checklist.                                                                     |

## 8. Final verification record

- Full Chromium regression: `28/28` passed twice on the final code and stable seeded localhost state.
- Production-shaped domain harness: `23/23` passed in full mode; generated evidence is at
  `.migration-reports/local-production-shaped.json` (gitignored runtime report).
- Automated tests: 130 unit, 8 integration, 4 migration characterization, and 13 database tests pass.
- Optimized Next.js build: 144 static pages generated; production-mode localhost start passed on
  port 3002 and was stopped after rehearsal.
- Development application remains available at `http://localhost:3001`.
- Final classification: **LOCAL LAUNCH READY**. Public/live launch remains `DEFER_PROD`.

## 9. Production boundary

The following are not authorized in this plan and remain `DEFER_PROD`: deployment, cloud account
creation, DNS/TLS, production databases, production secrets, real client data import, live payment,
live SMS/email, monitoring account setup, legal/privacy approval, data-residency approval, production
penetration testing, and public traffic cutover.
