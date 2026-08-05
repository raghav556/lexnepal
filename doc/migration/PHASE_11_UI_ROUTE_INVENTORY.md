# Phase 11: Vite → App Router route inventory (R5.1)

## Status

`complete_local` for **R5.1–R5.7** (inventory through E2E smoke). Every Vite route has a shared `src/views` body and Next `page.tsx` (or `not-found.tsx`). Companion CSV: [`ui-route-inventory.csv`](ui-route-inventory.csv) — **68/68 `exists`**. Deep-link matrix: [`ui-deep-link-matrix.csv`](ui-deep-link-matrix.csv). E2E matrix: [`ui-e2e-smoke-matrix.csv`](ui-e2e-smoke-matrix.csv).

## Gate check

Finance/CRM APIs and R4 proving are `complete_local` with domain flags `next`. The former “do not start R5 early” gate is cleared. R5.1 is inventory only (no page moves).

## Coexistence (current)

| Surface | Role | Port / root |
| --- | --- | --- |
| Vite SPA | Legacy dual-run shell | `:3002` / `src/App.tsx` → `src/legacy-pages/*` |
| Next App Router | Product UI + API | `:3001` / `src/app` |
| Shared | Server/client/shared modules | `src/server`, `src/shared`, `src/client` |

[ADR-0018](architecture-decisions/0018-isolate-next-app-during-coexistence.md) isolated Next in `next-app/` while `src/pages` existed; **superseded in R5.6** (`src/app` + `src/legacy-pages`).

## Mapping rules

1. **Same URL path** by default (R5.5 will verify deep links).
2. Place under existing route groups:
   - `(public)/…` for marketing/legal pages
   - `(client)/client/…`
   - `(staff)/staff/…`
   - `(admin)/admin/…`
   - Auth/token routes at `app/sign-in`, `app/auth/callback`, `app/setup-account`, etc. (outside role groups)
3. Dynamic segments: Vite `:id` / `:slug` / `:token` → App Router `[id]` / `[slug]` / `[token]`.
4. Catch-all `*` → `next-app/app/not-found.tsx`.

## Status vocabulary (this inventory)

| Status | Meaning |
| --- | --- |
| `missing` | No `page.tsx` (or `not-found.tsx`) yet under the proposed Next path |
| `stub` | Next file exists, but Vite on `:3002` remains product authority; page is not considered migrated |
| `exists` | Next page is wired to the shared migrated view (`src/views`) |
| `redirect` | Intentional redirect instead of a page body (none required in this inventory) |

## Next pages present today (cross-check)

All routes (W1–W5) are wired as thin `"use client"` re-exports from `src/views/*` (status `exists` in CSV). Layout chrome remains in Vite/Next layout files; role guards via `PortalRoleGuard` (R5.2).

Layouts already exist: `(public)`, `(client)`, `(staff)`, `(admin)`, plus root `app/layout.tsx`.

## Counts by audience

| Audience | Vite routes | Next exists | Remaining stub/missing |
| --- | --- | --- | --- |
| Auth | 5 | 5 | 0 |
| Token | 2 | 2 | 0 |
| Public | 14 | 14 | 0 |
| Client | 10 | 10 | 0 |
| Staff | 11 | 11 | 0 |
| Admin (non-CMS) | 14 | 14 | 0 |
| Admin CMS | 11 | 11 | 0 |
| Catch-all | 1 | 1 | 0 |
| **Total** | **68** | **68** | **0** |

## Move waves (for R5.3)

| Wave | Scope | Route count |
| --- | --- | --- |
| `W1-auth-public` | Auth, token, public marketing/legal, not-found | 22 |
| `W2-client` | `/client` and children | 10 |
| `W3-staff` | `/staff` and children | 11 |
| `W4-admin` | Admin ops (users, finance, CRM, etc.) excluding CMS | 14 |
| `W5-cms` | `/admin/cms` subtree | 11 |

CMS is last so public CMS-backed pages can move in W1 against stable `/api/v1` CMS while admin CMS editors follow after admin shell (W4).

## Shared / special notes

- **SharedProfilePage** is mounted at `/client/profile`, `/staff/profile`, and `/admin/profile` — one presentational component, three thin Next pages.
- **AccountSetupPage** serves both `/setup-account` and `/reset-password`.
- **LegalPage** serves both `/privacy-policy` and `/terms` (path-discriminated).
- Token routes (`/intake/:token`, `/share/:token`) sit outside PublicLayout in Vite; keep them outside `(public)` layout chrome in Next if the UX must stay shell-free.
- Several existing Next stubs still have Convex-bridge residuals; clearing those is **R5.4**, not R5.1.

## Full inventory

Machine-readable source of truth: [`ui-route-inventory.csv`](ui-route-inventory.csv).

### W1 — Auth / token / public

All **22** W1 routes are `exists` — shared bodies in `src/views/{auth,public}/` (+ `src/views/NotFound.tsx`); Next `page.tsx` / `not-found.tsx` are thin re-exports. See CSV for full paths.

| vitePath | nextPath | nextFile | status |
| --- | --- | --- | --- |
| `/auth/callback` | `/auth/callback` | `app/auth/callback/page.tsx` | exists |
| `/setup-account` | `/setup-account` | `app/setup-account/page.tsx` | exists |
| `/reset-password` | `/reset-password` | `app/reset-password/page.tsx` | exists |
| `/sign-in` | `/sign-in` | `app/sign-in/page.tsx` | exists |
| `/mfa-enroll` | `/mfa-enroll` | `app/mfa-enroll/page.tsx` | exists |
| `/intake/:token` | `/intake/[token]` | `app/intake/[token]/page.tsx` | exists |
| `/share/:token` | `/share/[token]` | `app/share/[token]/page.tsx` | exists |
| `/` | `/` | `app/(public)/page.tsx` | exists |
| `/practice-areas` | `/practice-areas` | `app/(public)/practice-areas/page.tsx` | exists |
| `/about-us` | `/about-us` | `app/(public)/about-us/page.tsx` | exists |
| `/lawyers` | `/lawyers` | `app/(public)/lawyers/page.tsx` | exists |
| `/lawyers/:id` | `/lawyers/[id]` | `app/(public)/lawyers/[id]/page.tsx` | exists |
| `/consultation` | `/consultation` | `app/(public)/consultation/page.tsx` | exists |
| `/contact` | `/contact` | `app/(public)/contact/page.tsx` | exists |
| `/blog` | `/blog` | `app/(public)/blog/page.tsx` | exists |
| `/blog/:slug` | `/blog/[slug]` | `app/(public)/blog/[slug]/page.tsx` | exists |
| `/careers` | `/careers` | `app/(public)/careers/page.tsx` | exists |
| `/resources` | `/resources` | `app/(public)/resources/page.tsx` | exists |
| `/news` | `/news` | `app/(public)/news/page.tsx` | exists |
| `/privacy-policy` | `/privacy-policy` | `app/(public)/privacy-policy/page.tsx` | exists |
| `/terms` | `/terms` | `app/(public)/terms/page.tsx` | exists |
| `*` | `*` | `app/not-found.tsx` | exists |

### W2 — Client

All **10** W2 routes are `exists` — bodies in `src/views/client/` (+ `src/views/shared/SharedProfilePage` for `/client/profile`). `ClientLayout` stays in Vite/Next layouts (not moved).

| vitePath | nextPath | nextFile | status |
| --- | --- | --- | --- |
| `/client` | `/client` | `app/(client)/client/page.tsx` | exists |
| `/client/cases` | `/client/cases` | `app/(client)/client/cases/page.tsx` | exists |
| `/client/documents` | `/client/documents` | `app/(client)/client/documents/page.tsx` | exists |
| `/client/messages` | `/client/messages` | `app/(client)/client/messages/page.tsx` | exists |
| `/client/billing` | `/client/billing` | `app/(client)/client/billing/page.tsx` | exists |
| `/client/booking` | `/client/booking` | `app/(client)/client/booking/page.tsx` | exists |
| `/client/kyc` | `/client/kyc` | `app/(client)/client/kyc/page.tsx` | exists |
| `/client/signatures` | `/client/signatures` | `app/(client)/client/signatures/page.tsx` | exists |
| `/client/checklist` | `/client/checklist` | `app/(client)/client/checklist/page.tsx` | exists |
| `/client/profile` | `/client/profile` | `app/(client)/client/profile/page.tsx` | exists |

### W3 — Staff

All **11** W3 routes are `exists` — bodies in `src/views/staff/` (+ shared profile for `/staff/profile`). `StaffLayout` stays in Vite/Next layouts (not moved).

| vitePath | nextPath | nextFile | status |
| --- | --- | --- | --- |
| `/staff` | `/staff` | `app/(staff)/staff/page.tsx` | exists |
| `/staff/cases` | `/staff/cases` | `app/(staff)/staff/cases/page.tsx` | exists |
| `/staff/cases/:id` | `/staff/cases/[id]` | `app/(staff)/staff/cases/[id]/page.tsx` | exists |
| `/staff/hearings` | `/staff/hearings` | `app/(staff)/staff/hearings/page.tsx` | exists |
| `/staff/documents` | `/staff/documents` | `app/(staff)/staff/documents/page.tsx` | exists |
| `/staff/tasks` | `/staff/tasks` | `app/(staff)/staff/tasks/page.tsx` | exists |
| `/staff/time` | `/staff/time` | `app/(staff)/staff/time/page.tsx` | exists |
| `/staff/clients` | `/staff/clients` | `app/(staff)/staff/clients/page.tsx` | exists |
| `/staff/appointments` | `/staff/appointments` | `app/(staff)/staff/appointments/page.tsx` | exists |
| `/staff/research` | `/staff/research` | `app/(staff)/staff/research/page.tsx` | exists |
| `/staff/profile` | `/staff/profile` | `app/(staff)/staff/profile/page.tsx` | exists |

### W4 — Admin (non-CMS)

All **14** W4 routes are `exists` — bodies in `src/views/admin/` (+ shared profile for `/admin/profile`). `AdminLayout` and CMS pages stay for W5 / layouts.

| vitePath | nextPath | nextFile | status |
| --- | --- | --- | --- |
| `/admin` | `/admin` | `app/(admin)/admin/page.tsx` | exists |
| `/admin/users` | `/admin/users` | `app/(admin)/admin/users/page.tsx` | exists |
| `/admin/analytics` | `/admin/analytics` | `app/(admin)/admin/analytics/page.tsx` | exists |
| `/admin/hr` | `/admin/hr` | `app/(admin)/admin/hr/page.tsx` | exists |
| `/admin/finance` | `/admin/finance` | `app/(admin)/admin/finance/page.tsx` | exists |
| `/admin/expenses` | `/admin/expenses` | `app/(admin)/admin/expenses/page.tsx` | exists |
| `/admin/crm` | `/admin/crm` | `app/(admin)/admin/crm/page.tsx` | exists |
| `/admin/settings` | `/admin/settings` | `app/(admin)/admin/settings/page.tsx` | exists |
| `/admin/audit` | `/admin/audit` | `app/(admin)/admin/audit/page.tsx` | exists |
| `/admin/conflict-checker` | `/admin/conflict-checker` | `app/(admin)/admin/conflict-checker/page.tsx` | exists |
| `/admin/document-generator` | `/admin/document-generator` | `app/(admin)/admin/document-generator/page.tsx` | exists |
| `/admin/appointments` | `/admin/appointments` | `app/(admin)/admin/appointments/page.tsx` | exists |
| `/admin/templates` | `/admin/templates` | `app/(admin)/admin/templates/page.tsx` | exists |
| `/admin/profile` | `/admin/profile` | `app/(admin)/admin/profile/page.tsx` | exists |

### W5 — Admin CMS

All **11** W5 routes are `exists` — bodies in `src/views/admin/cms/`.

| vitePath | nextPath | nextFile | status |
| --- | --- | --- | --- |
| `/admin/cms` | `/admin/cms` | `app/(admin)/admin/cms/page.tsx` | exists |
| `/admin/cms/navigation` | `/admin/cms/navigation` | `app/(admin)/admin/cms/navigation/page.tsx` | exists |
| `/admin/cms/practice-areas` | `/admin/cms/practice-areas` | `app/(admin)/admin/cms/practice-areas/page.tsx` | exists |
| `/admin/cms/testimonials` | `/admin/cms/testimonials` | `app/(admin)/admin/cms/testimonials/page.tsx` | exists |
| `/admin/cms/team` | `/admin/cms/team` | `app/(admin)/admin/cms/team/page.tsx` | exists |
| `/admin/cms/blog` | `/admin/cms/blog` | `app/(admin)/admin/cms/blog/page.tsx` | exists |
| `/admin/cms/news` | `/admin/cms/news` | `app/(admin)/admin/cms/news/page.tsx` | exists |
| `/admin/cms/careers` | `/admin/cms/careers` | `app/(admin)/admin/cms/careers/page.tsx` | exists |
| `/admin/cms/resources` | `/admin/cms/resources` | `app/(admin)/admin/cms/resources/page.tsx` | exists |
| `/admin/cms/about` | `/admin/cms/about` | `app/(admin)/admin/cms/about/page.tsx` | exists |
| `/admin/cms/governance` | `/admin/cms/governance` | `app/(admin)/admin/cms/governance/page.tsx` | exists |

## Out of scope (later R5 items)

| Item | Phase |
| --- | --- |
| Harden `(public|client|staff|admin)` layouts/guards | R5.2 — **done** (below) |
| Move page components into Next | R5.3 — **complete_local** (W1–W5) |
| Replace Convex providers | R5.4 — **complete_local** (below) |
| URL preserve / redirect proofs | R5.5 — **complete_local** (below) |
| Remove ADR-0018 isolation | R5.6 — **complete_local** (below) |
| E2E smoke | R5.7 — **complete_local** (below) |

## R5.2 Layout guards (`complete_local`)

Shared client-side guard: [`src/components/auth/PortalRoleGuard.tsx`](../../src/components/auth/PortalRoleGuard.tsx).

Wired into:

| Route group | Layout | Allowed |
| --- | --- | --- |
| `(client)` | `next-app/app/(client)/layout.tsx` | `client` |
| `(staff)` | `next-app/app/(staff)/layout.tsx` | `staff` (`STAFF_ROLES`) |
| `(admin)` | `next-app/app/(admin)/layout.tsx` | `admin` |
| `(public)` | `next-app/app/(public)/layout.tsx` | open; “My Portal” → `getPortalForRole` |

Behavior (matches Vite portal gates; no Next middleware in R5.2):

1. Loading (`useCurrentUser` undefined) → spinner
2. Unauthenticated (`null`) → branded sign-in gate (`SignInButton`), not redirect to `/`
3. Wrong role → “Redirecting to your portal…” + `router.replace(getPortalForRole(role))`
4. Allowed → portal chrome + children

**Opt-in bypass:** set `NEXT_PUBLIC_SKIP_ROLE_GUARDS=1` to preview all portals without role checks (replaces the old always-on `NODE_ENV===development` bypass). Default: guards **enforced**.

Auth callback [`next-app/app/auth/callback/page.tsx`](../../next-app/app/auth/callback/page.tsx) re-exports shared [`src/views/auth/Callback.tsx`](../../src/views/auth/Callback.tsx) (uses `getPortalForRole` + navigation shim).

## R5.3 page moves (`complete_local` — W1–W5)

Shared page bodies live under [`src/views/`](../../src/views/) (outside `src/pages` per ADR-0018). Vite `src/pages/*` and Next `next-app/app/**/page.tsx` are thin re-exports.

Navigation compatibility: [`src/client/navigation/`](../../src/client/navigation/) — Vite aliases to `vite.ts` (react-router), Next to `next.ts` (`next/link` + `next/navigation`). Views use `Link` with **`href`** only.

| Wave | Status | Notes |
| --- | --- | --- |
| W1 auth/public/token/not-found | **done** — 22 | Auth, public marketing/legal, intake/share tokens, `not-found.tsx` |
| W2 client | **done** — 10 | `/client` + children; shared profile view |
| W3 staff | **done** — 11 | `/staff` + children incl. `/staff/cases/[id]` |
| W4 admin | **done** — 14 | Admin ops excl. CMS |
| W5 CMS | **done** — 11 | `/admin/cms` subtree in `src/views/admin/cms` |

Pass rule met: **68/68** inventory rows `exists`. Layouts still dual-stack (Vite `src/legacy-pages` + Next `src/app`). ADR-0018 superseded in **R5.6**.

## R5.4 Auth/data through Next adapters (`complete_local`)

**Pass rule:** no product page/layout/view imports `convex-bridge` or `@/convex/_generated/api` directly. Adapters in `src/client/queries/*` may keep Convex rollback branches; `ConvexProvider` mounts only when any `BACKEND_*=convex|shadow`.

### Auth

| Piece | Change |
| --- | --- |
| `AuthSessionGate` | Vite portal layouts use Better Auth/`useAuth` instead of Convex `Authenticated`/`AuthLoading` |
| `useAuth` | When `identity=next` (or Convex runtime disabled), uses `localAuthClient`; does not require live Convex |
| `DefaultProviders` | Conditional `ConvexProvider` via `convexRuntimeEnabled` |
| `convex-bridge` | No-op hooks when all flags are `next` |

### Data adapters

| Feature | Path |
| --- | --- |
| Document templates | `/api/v1/document-templates` (+ seed) → `src/client/queries/templates.ts` (`documents` domain) |
| Document tags | `/api/v1/document-tags` → same adapter module |
| Briefs / OCR / PESI / legacy migrate | Gated when domain is `next` (empty/disabled UI; Convex only inside adapters for rollback) |

### Grep gate (product UI)

`src/views`, `src/pages`, `src/components` (except conditional provider) — **zero** `convex-bridge` / `_generated/api` imports.

## R5.5 Preserve URLs / deep-link proofs (`complete_local`)

**Pass rule:** every Vite product URL resolves to the **same path** on Next, or has a **documented redirect**. No path renames were required in this pass.

| Artifact | Role |
| --- | --- |
| [`ui-route-inventory.csv`](ui-route-inventory.csv) | Source of truth for vitePath ↔ nextPath ↔ nextFile |
| [`ui-deep-link-matrix.csv`](ui-deep-link-matrix.csv) | Sample deep links (`exact` / `dynamic` / `catch-all`); `redirectFrom` empty |
| `npm run migration:prove-url-preserve` | Offline gate: inventory + matrix + `App.tsx` coverage + `next-app` filesystem |

**Redirect policy:** same-path by default. Matrix `redirectFrom` is empty (0 redirects). If a legacy alias is added later, register it in the matrix **and** `next-app/next.config.ts` `redirects()`.

**Dynamic samples:**

| Pattern | Sample URL |
| --- | --- |
| `/lawyers/:id` | `/lawyers/sample-lawyer` |
| `/blog/:slug` | `/blog/sample-post` |
| `/staff/cases/:id` | `/staff/cases/00000000-0000-4000-8000-000000000001` |
| `/intake/:token`, `/share/:token` | `/intake/sample-token`, `/share/sample-token` |

**Optional HTTP smoke:** set `NEXT_PROOF_BASE_URL=http://localhost:3001` when Next is running; prove script `GET`s each sample URL and fails on HTTP 404. Offline proof does not require a live server.

**Evidence:** `npm run migration:prove-url-preserve` → `passed: true` (68 inventory / 68 matrix / 68 App.tsx routes; `redirectCount=0`; httpSmoke skipped unless env set). Regenerator: `scripts/migration/generate-deep-link-matrix.ts`.

## R5.6 Remove ADR-0018 / consolidate app roots (`complete_local`)

**Pass rule:** Next no longer requires a separate `next-app/` scaffold; `src/pages` is gone (no Pages Router conflict).

| Before | After |
| --- | --- |
| `next-app/app` | [`src/app`](../../src/app/) App Router + `/api/v1` |
| `src/pages` | [`src/legacy-pages`](../../src/legacy-pages/) Vite shell (layouts + re-exports) |
| ADR-0018 accepted | ADR-0018 **superseded** |

Root [`next.config.ts`](../../next.config.ts) + `dev:next` / `build` / `start` run Next from the repo root. Vite remains on `:3002` via `dev:legacy` until R8. Fallback rewrite Next → Vite kept for dual-run.

**Evidence:** `npm run migration:prove-url-preserve` (68/68); `npm run build` succeeds against `src/app`. Cleanup **C5** satisfied locally.

## R5.7 E2E smoke (`complete_local`)

**Pass rule:** Browser smoke covers login, matter, document, invoice, signature, and CMS public pages against Next `:3001`.

| Area | Paths |
| --- | --- |
| CMS public | `/`, `/blog`, `/practice-areas`, `/about-us`, `/contact` |
| Login | `/sign-in` → role portal |
| Matter | `/staff/cases` |
| Document | `/staff/documents` |
| Invoice | `/admin/finance`, `/client/billing` |
| Signature | `/client/signatures` |

**How to run**

1. Ensure Postgres + `DATABASE_URL`; Next built (`npm run build`) and serving (`npm run start` or `dev:next` on `:3001`).
2. `npm run migration:prove-e2e-smoke` — seeds `e2e-*@example.invalid` users, runs Playwright (`tests/e2e/r57-smoke.spec.ts`), appends reconciliation notes.
3. Optional: `E2E_START_SERVER=1` lets Playwright spawn `npm run start`; `E2E_BASE_URL` overrides the default `http://127.0.0.1:3001`.

Also fixed during this pass: Next client bundles must see `VITE_BACKEND_*` via static `process.env` reads + `next.config.ts` `env` (dynamic `process.env[key]` left every domain on Convex and crashed ThemeEngine).

**Evidence:** `npm run migration:prove-e2e-smoke` → `passed: true` (4/4 Playwright tests). Matrix: [`ui-e2e-smoke-matrix.csv`](ui-e2e-smoke-matrix.csv).

## Next action

**R6** — complete locally (`cutover-runbook.md` + `migration:prove-cutover-rehearsal`). Next: **R7** (`DEFER_PROD`) or safe **R8** cleanup.