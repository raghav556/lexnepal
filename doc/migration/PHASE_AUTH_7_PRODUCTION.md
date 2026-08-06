# Phase 7 — Auth production environment checklist

**Goal:** Ship auth with production-trust defaults. Mostly ops/config; minimal code.  
**Related:** Phases 0–6 auth UX/security work; `scripts/local/verify-auth-cookies.mjs`, `verify-auth-baseline.mjs`.

---

## Checklist

| Item | Local | Production | Status in code |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SKIP_ROLE_GUARDS` | Off for real tests | **Must be unset / not `1`** | Enforced by `PortalRoleGuard`; baseline verifier fails if `=1` |
| Demo credentials on sign-in | OK on localhost | **Hidden** | Shown only when host is localhost/127.0.0.1 **and** `NODE_ENV !== "production"` **and** `NEXT_PUBLIC_HIDE_DEMO_ACCOUNTS` ≠ `1` |
| HTTPS | Optional | **Required** | Ops: terminate TLS at reverse proxy / load balancer; set `BETTER_AUTH_URL` / `APP_PUBLIC_URL` to `https://…` |
| `BETTER_AUTH_SECRET` | In `.env.local` (≥32 chars) | **Strong secret in vault** | Startup throws if production still uses the default placeholder |
| Session cookie `Secure` | Dev exception (HTTP OK) | **Enabled** | `NODE_ENV === "production"` → `useSecureCookies` + `secure: true`; verify with `npm run verify:auth-cookies` |
| Rate limiting on sign-in | Optional locally (already on) | **Enabled** | Better Auth DB rate limit: 20 req / 60s; MFA lockout 5 failures / 15 min |
| CORS / trusted origins | `localhost:3001` (+3002) | **Production domain** | Derived from `APP_PUBLIC_URL` + `BETTER_AUTH_URL` plus local defaults |

---

## Production env values (set in vault / host env — not in git)

```bash
NODE_ENV=production
AUTH_PROVIDER=local

# Public URLs must be HTTPS in production
BETTER_AUTH_URL=https://app.example.com
APP_PUBLIC_URL=https://app.example.com

# Generate: openssl rand -base64 48
BETTER_AUTH_SECRET=<vault-managed-secret-min-32-chars>

# Never enable in production
# NEXT_PUBLIC_SKIP_ROLE_GUARDS=1

# Optional belt-and-suspenders (demo UI already hidden when NODE_ENV=production)
NEXT_PUBLIC_HIDE_DEMO_ACCOUNTS=1

AUTH_SESSION_COOKIE_NAME=lexnepal_session
AUTH_SESSION_TTL_SECONDS=28800
```

---

## Pre-deploy verification

1. **Role guards:** `NEXT_PUBLIC_SKIP_ROLE_GUARDS` absent or not `1` in production env.
2. **Secret:** Confirm `BETTER_AUTH_SECRET` is not the local placeholder; app refuses to start otherwise.
3. **Cookies:** Against a production-like HTTPS deploy, `npm run verify:auth-cookies` with `NODE_ENV=production` and `BASE_URL=https://…` — expect `httpOnly`, `SameSite=Lax`, `Secure`.
4. **Origins:** Sign-in from the production origin succeeds; requests from unknown origins are rejected by Better Auth CSRF/origin checks.
5. **Demo UI:** Open `/sign-in` on production — no “demo accounts” panel.
6. **Rate limit:** Confirm `auth_rate_limit` (or Better Auth rate-limit storage) is writable in production DB.
7. **Baseline smoke (local):** `npm run verify:auth-baseline` and `npx playwright test tests/e2e/auth-portal.spec.ts` before cutover.

---

## Owner sign-off

| Check | Owner | Date | Pass |
| --- | --- | --- | --- |
| Guards off in production | | | ☐ |
| Demo accounts hidden | | | ☐ |
| HTTPS + public URLs | | | ☐ |
| Secret in vault | | | ☐ |
| Secure cookies verified | | | ☐ |
| Rate limit / MFA lockout live | | | ☐ |
| Trusted origins = prod domain | | | ☐ |

---

## Notes

- Local `npm run start` with `NODE_ENV=production` on `http://localhost` will set `Secure` cookies that browsers may refuse over plain HTTP — use `npm run rebuild:start` / next start only for true HTTPS staging, or keep local verification on development mode for cookie Secure.
- Idle timeout (Phase 6) for admin/staff remains client-side; production still depends on short session TTL + MFA for high-privilege roles.
