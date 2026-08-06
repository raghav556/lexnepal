# Phase 0 — Auth & Profile Baseline Test Matrix

**Goal:** Define acceptance criteria before auth/profile production upgrades.  
**Base URL (local):** `http://localhost:3001`  
**Automated check:** `npm run verify:auth-baseline`

---

## Environment prerequisites

| Check | Expected | How to verify |
|-------|----------|---------------|
| Server running | `http://localhost:3001` responds | `npm run rebuild:start` or `npm run start` after build |
| Role guards active | Portals enforce role | `NEXT_PUBLIC_SKIP_ROLE_GUARDS` **must not** be `1` in `.env.local` |
| E2E seed present | Demo accounts exist | `npm run db:seed` (if login fails) |
| Local infra | Postgres + MinIO up | `npm run local:infra:start` |

---

## Demo credentials (localhost only)

| Role | Email | Password | Expected portal |
|------|-------|----------|-----------------|
| Admin | `e2e-admin@example.invalid` | `E2E-Smoke-Only-2026!` | `/admin` |
| Staff | `e2e-staff@example.invalid` | `E2E-Smoke-Only-2026!` | `/staff` |
| Client | `e2e-client@example.invalid` | `E2E-Smoke-Only-2026!` | `/client` |

Source: `scripts/e2e/fixtures.ts`

---

## Test URLs (entry points)

| URL | Purpose |
|-----|---------|
| `/sign-in` | Default unified login |
| `/sign-in?next=/admin` | Post-login deep-link to admin |
| `/sign-in?next=/staff/cases` | Post-login deep-link to staff cases |
| `/sign-in?next=/client/cases` | Post-login deep-link to client cases |

---

## Manual test matrix

Mark each row **Pass / Fail / N/A** during baseline and after each auth phase.

### A. Sign-in & portal routing

| ID | Scenario | Steps | Expected result |
|----|----------|-------|-----------------|
| A1 | Admin login | Sign in as admin at `/sign-in` | Lands on `/admin`; no “Sign in” CTA in shell |
| A2 | Staff login | Sign in as staff at `/sign-in` | Lands on `/staff` |
| A3 | Client login | Sign in as client at `/sign-in` | Lands on `/client` |
| A4 | Deep-link admin | `/sign-in?next=/admin` → admin login | Redirects to `/admin` (or allowed admin path) |
| A5 | Deep-link staff | `/sign-in?next=/staff/cases` → staff login | Redirects to `/staff/cases` |
| A6 | Deep-link client | `/sign-in?next=/client/cases` → client login | Redirects to `/client/cases` |
| A7 | MFA step (if enabled) | Sign in privileged account with TOTP | TOTP prompt appears; valid code completes login |

### B. Wrong portal / unauthenticated access

| ID | Scenario | Steps | Expected result |
|----|----------|-------|-----------------|
| B1 | Client → admin | Signed in as client, visit `/admin` | Wrong-role screen; “Go to my portal” + “Sign in with another account” |
| B2 | Staff → client | Signed in as staff, visit `/client` | Wrong-role screen |
| B3 | Admin → staff | Signed in as admin, visit `/staff` | Wrong-role screen (admin is not staff role) |
| B4 | Anonymous → portal | Logged out, visit `/admin` | Sign-in prompt with return URL |

### C. Logout

| ID | Scenario | Steps | Expected result |
|----|----------|-------|-----------------|
| C1 | Admin desktop logout | Sidebar account menu → Sign Out | Session cleared; `/sign-in` |
| C2 | Staff desktop logout | Sidebar → Sign Out | `/sign-in` |
| C3 | Client desktop logout | Sidebar → Sign Out | `/sign-in` |
| C4 | Client mobile logout | Mobile drawer → Sign Out | `/sign-in` |
| C5 | Admin mobile logout | Mobile menu (if present) → Sign Out | `/sign-in` *(known gap pre-Phase 2)* |
| C6 | Staff mobile logout | Mobile menu → Sign Out | `/sign-in` *(known gap pre-Phase 2)* |

### D. Profile

| ID | Scenario | Steps | Expected result |
|----|----------|-------|-----------------|
| D1 | Admin profile load | `/admin/profile` while signed in | Tabs: General, Security, MFA, Sessions, Activity, Export |
| D2 | Staff profile load | `/staff/profile` | Same shell; lawyer bio visible for staff roles |
| D3 | Client profile load | `/client/profile` | Same shell; no internal-only fields |
| D4 | Profile save | Change display name → Save | Toast success; name persists after refresh |
| D5 | Password change | Change password (valid current + new) | Success; can sign in with new password |
| D6 | Sessions list | Open Sessions tab | At least current session listed |
| D7 | Session revoke | Revoke another session (if 2+) | Session removed from list |

### E. Public site auth chrome

| ID | Scenario | Steps | Expected result |
|----|----------|-------|-----------------|
| E1 | Logged out header | Visit `/` | “Sign In” visible |
| E2 | Logged in header | Visit `/` while signed in | “My Portal” links to correct portal *(no logout on public site — known gap)* |
| E3 | Auth skeleton | Hard refresh `/` while session loading | Skeleton, not flash of wrong button |

### F. Build & assets (regression guard)

| ID | Scenario | Steps | Expected result |
|----|----------|-------|-----------------|
| F1 | Rebuild start | `npm run rebuild:start` | Build succeeds; server on `:3001` |
| F2 | CSS chunks | Load `/sign-in`, inspect `_next/static/css/*` or `_next/static/chunks/*.css` | HTTP **200**, styled page |
| F3 | Portal pages | Load `/admin`, `/staff`, `/client` when authed | HTTP **200**, no “This page couldn’t load” |

---

## Known gaps (baseline — do not fail Phase 0 for these)

Documented for Phase 1+ work; listed here so testers do not confuse bugs with planned scope.

- Single `/sign-in` page (no `/admin/login`, `/staff/login`, `/client/login` routes yet)
- Admin/staff mobile: no profile/logout in drawer
- Public header: no sign-out when signed in
- MFA enrollment uses browser `prompt()` for password
- Profile UI is shared across roles (not role-tailored extras yet)

---

## Automated baseline script

```bash
npm run verify:auth-baseline
```

Checks:

1. `.env.local` — `NEXT_PUBLIC_SKIP_ROLE_GUARDS` absent or not `1`
2. Server health — `/sign-in` returns 200
3. CSS asset — at least one `/_next/static/css/*` or `/_next/static/chunks/*.css` link returns 200
4. API login — admin, staff, client each authenticate via Better Auth
5. Role mapping — `/api/v1/users/me` role matches expected portal prefix

---

## Phase 0 exit gate

| Step | Action | Status |
|------|--------|--------|
| 0.1 | This test matrix documented | ☑ |
| 0.2 | All three demo accounts verified | ☑ |
| 0.3 | `npm run rebuild:start` — CSS 200, portals load | ☑ |
| 0.4 | Role guards confirmed active (no skip flag) | ☑ |

**Sign-off:** Record date and verifier in “Last verified” below when all four pass.

---

## Last verified

<!-- Updated by `npm run verify:auth-baseline` or manual QA -->

| Field | Value |
|-------|-------|
| Date | 2026-08-06 |
| Verifier | verify-auth-baseline.mjs |
| Server | `http://localhost:3001` |
| Guards | NEXT_PUBLIC_SKIP_ROLE_GUARDS not set (guards active) |
| Admin login | pass |
| Staff login | pass |
| Client login | pass |
| CSS 200 | pass (200) |
