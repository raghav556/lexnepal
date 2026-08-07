# Audit — Admin Users & cross-portal identity mapping

**Scope:** `http://localhost:3001/admin/users` and how firm people map to admin / staff / client portals and the public website.  
**Date:** 2026-08-06  
**Rule:** Fix without drift, skipping, or duplicating create paths. One writer for identity.

---

## 1. Honest verdict

`/admin/users` is a **real Next + Postgres identity console**, not a stub. List, invite, role change, suspend, password reset, MFA reset, session revoke, CSV, and activity are wired to `/api/v1/users*`.

It is **not** yet corporate-grade multi-firm SaaS people management because:

1. Three “people” models remain (identity, CRM, CMS) — write paths are split cleanly for a **single firm** (Phases A–D).
2. Invite → activate, portal grant, and Users directory polish are proven on localhost.
3. Multi-firm / firm switcher is **docs-deferred** — see [`PHASE_E_SINGLE_FIRM_SAAS.md`](./PHASE_E_SINGLE_FIRM_SAAS.md).

---

## 2. Route & surface map

```text
Public website (/)
  └── CMS team / lawyer profiles  ← only users with isPublicFacing (CMS team UI)
        ≠ Admin Users create (always isPublicFacing: false)

Sign-in
  /sign-in/admin  → /admin       → /admin/users (manage), /admin/profile (self)
  /sign-in/staff  → /staff       → /staff/profile (self); names via /users/directory
  /sign-in/client → /client      → /client/profile (self); matters need clients.userId

Admin related
  /admin/users           ← sole intended create/invite/role/suspend surface
  /admin/cms/team        ← overlaps create (bridge forces invite:true)
  /admin/hr              ← consumes useUsers() for salary/attendance
  /admin/crm             ← converts lead → clients row WITHOUT portal user
  /admin/settings        ← role capability matrix (users.manage = admin only)
  /admin/audit           ← firm audit; Users detail uses filtered audit
```

| Role | Portal home | Profile | Created from Admin Users? | Public site |
| --- | --- | --- | --- | --- |
| admin | `/admin` | `/admin/profile` | Yes | No |
| partner…intern | `/staff` | `/staff/profile` | Yes (directory only if active & !pending) | Only if CMS public-facing |
| client | `/client` | `/client/profile` | Yes as identity only | No — no auto CRM `clients` row |

---

## 3. What works today

| Capability | Status |
| --- | --- |
| List / search / status tabs / Staff·Clients·Admins | Working |
| Invite (POST `/api/v1/users`, Mailpit reset email) | Wired |
| Role change / suspend·reactivate | Working |
| Password reset / “resend invite” (same endpoint) | Wired |
| MFA reset / revoke all sessions | Working |
| Self profile (all portals) | Working (Phases 4–6) |
| Firm scoping on identity APIs | Working (single firm) |
| Staff directory for assignments | Working (`/api/v1/users/directory`) |

**Key files**

- UI: `src/views/admin/AdminUsersPage.tsx`
- Route: `src/app/(admin)/admin/users/page.tsx`
- APIs: `src/app/api/v1/users/**`
- Service/repo: `identity-service.ts`, `identity-repository.ts`
- Auth provision: `local-auth.ts` (`provisionLocalIdentity`, `activateLinkedUser` on `onPasswordReset`)

---

## 4. Gaps, bugs, mismatches (prioritized)

### P0 — access / trust

| ID | Issue | Evidence |
| --- | --- | --- |
| P0.1 | **Invite activation** — hardened: resolve `lexnepalUserId` from DB if missing; invites redirect to `/setup-account`; resend uses setup path while pending; proven by `npm run verify:invite-activation`. | `local-auth.ts`, `AccountSetupPage`, verify script |
| P0.2 | **Archive ≡ suspend.** `archiveUser` only sets `isActive: false`; no `deletedAt`. UI says “Archive”. | `identity-repository.ts` `archiveUser` |
| P0.3 | **No browser E2E for invite → activate → portal** (scripted API proof exists). | Optional Playwright follow-up |

### P1 — product wiring / duplication

| ID | Issue | Evidence |
| --- | --- | --- |
| P1.1 | **Two create UIs.** `/admin/users` and `/admin/cms/team`. Bridge forces `invite: true` even when CMS passes `invite: false`. | `identity.ts` `useCmsTeamIdentityBridge` |
| P1.2 | **Client portal ≠ CRM client.** CRM convert / staff Add Client create `clients` without `userId` and without invite. Admin inviting `role: client` does not create `clients` row. | `crm-repository.ts` `convertToClient` |
| P1.3 | **Practice areas on Users page are dead.** Parsed and shown locally; never sent in `updateUser` (not in schema). Real data is CMS team / `userPracticeAreas`. | `AdminUsersPage` `handleSaveProfile` |
| P1.4 | **Public team never auto-linked** from Users invite (`isPublicFacing: false` always). | Create form in `AdminUsersPage` |
| P1.5 | **KPI vs tab mismatch** (intern in Staff tab, excluded from “Active Staff” KPI). | `AdminUsersPage` |

### P2 — polish / SaaS readiness

| ID | Issue |
| --- | --- |
| P2.1 | Card-grid UX vs corporate directory table; `window.confirm`; unused imports |
| P2.2 | Bulk: suspend + resend only; N parallel PATCHes; no bulk reactivate |
| P2.3 | Settings integrations hub not in Zod save schema (related settings, not Users) |
| P2.4 | No firm switcher (OK for single-tenant local; incomplete multi-firm SaaS) |
| P2.5 | Mailpit-centric copy; no deep links Users → CMS team / CRM client / HR |

---

## 5. What must NOT be duplicated

| Concern | Canonical surface | Do not |
| --- | --- | --- |
| Create / invite / role / suspend | `/admin/users` | Second full identity console |
| Public bio / education / practice areas / facing flag | `/admin/cms/team` | Re-implement CMS fields on Users |
| CRM matter client record | `/admin/crm`, `/staff/clients` | Treat CRM-only as portal login |
| Portal access for clients | Explicit “Grant portal access” linking `clients.userId` | Auto-magic dual create without UX |
| Self password / MFA / sessions | `*/profile` | Admin-only password set UI |

---

## 6. Implementation plan (ordered, no drift)

### Phase A — Prove & harden invite activation (1 day) ✅

1. Live proof via `npm run verify:invite-activation` (invite → set password → `/staff`).
2. `activateLinkedUser` resolves `lexnepalUserId` from DB if missing; writes `auth.invite_activated` audit.
3. Invites use `/setup-account`; forgotten passwords use `/reset-password`. Resend while pending uses setup path.
4. Users UI: “Awaiting activation” + “Resend setup email”.
5. Also fixed local production build blockers: HTTPS guard allows localhost HTTP; `/mfa-enroll` Suspense wrap.

**Done when:** New invite can sign into the correct portal on localhost without manual DB edits. **PASS** (2026-08-06).

### Phase B — Collapse people write paths (1–2 days) — **DONE**

1. `/admin/users` = sole create/invite/role/suspend/reactivate.
2. `/admin/cms/team`: edit-only public profile; **Feature on website** from existing staff; hide ≠ suspend; no identity create. CMS PATCH no longer accepts `email`/`role`.
3. Removed dead practice-areas editor from Users; staff get **Edit public profile** → `/admin/cms/team`.
4. Removed duplicate Archive button (same as Suspend via `isActive: false`); Suspend/Reactivate only.
5. Active Staff KPI includes `intern` and counts active non-pending only.

**Done when:** One create path; no dead fields; suspend/archive semantics match UI. **PASS** (2026-08-06).

### Phase C — Client identity ↔ CRM (1–2 days) — **DONE**

1. On staff Clients (`/staff/clients`): **Grant portal access** → create/link `users` (`role: client`) + set `clients.userId` + setup email. `POST /api/v1/clients/:id/portal-access`.
2. Inviting `role: client` from Users auto-links/creates a CRM client by email.
3. Pending invites can be linked (validateLinkedUser allows `isPending`). Client cases empty state explains unlinked profile.

**Done when:** Client can log into `/client` and see linked matters/KYC where data exists. Verify: `npm run verify:client-portal-grant`.

### Phase D — Corporate Users console polish (2 days) — **DONE**

1. Table-first directory + right-side detail drawer (not card sprawl).
2. Deep links: CMS public team, `/admin/clients` (CRM), HR, audit; sessions/MFA in drawer.
3. Bulk suspend / **reactivate** / resend; confirm dialogs (no `window.confirm`).
4. Invite copy: Mailpit hint only on localhost hostnames; production wording otherwise.
5. Tests: `tests/e2e/admin-users.spec.ts`, `npm run verify:users-directory`.

**Done when:** `/admin/users` looks and behaves like a firm directory ops console on localhost. **PASS** (2026-08-06).

### Phase E — SaaS readiness notes (docs only unless multi-firm required) — **DONE**

1. Documented single-firm assumption for identity/Users: [`PHASE_E_SINGLE_FIRM_SAAS.md`](./PHASE_E_SINGLE_FIRM_SAAS.md).
2. Production checklist remains [`PHASE_AUTH_7_PRODUCTION.md`](./PHASE_AUTH_7_PRODUCTION.md) (referenced, not rewritten).
3. Firm switcher and multi-firm admin deferred until product requires multi-tenant SaaS; Phase 8 list updated in [`../SAAS_MULTI_FIRM_PHASE8.md`](../SAAS_MULTI_FIRM_PHASE8.md).

**Done when:** Docs only; no firm-switcher code. **PASS** (2026-08-06).

---

## 7. Suggested build order (next actions)

```text
(none for this Users workstream — multi-firm only when product requires it)
```

---

## 8. Out of scope (avoid rabbit holes)

- Rewriting Better Auth or Hercules OIDC for this workstream
- Building a second HR directory
- Multi-firm admin console before product requires it
- Replacing CMS public team with Admin Users fields

---

**Owner checkpoint:**  
Phases A–E for this Users workstream are complete on localhost (E = docs only). Do not start firm-switcher / multi-firm admin until product requires it.
