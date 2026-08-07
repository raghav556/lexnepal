# Phase E — Single-firm assumption & multi-firm SaaS (docs only)

**Date:** 2026-08-06  
**Scope:** Identity / Users / portals after Phases A–D  
**Rule:** Documentation only. Do **not** build a firm switcher, multi-tenant admin console, or platform billing until product explicitly requires multi-firm SaaS.

---

## 1. Current product assumption

LexNepal on localhost and in the near-term production target is a **single-firm** deployment:

| Assumption | Meaning in practice |
| --- | --- |
| One active firm | Session principal resolves to one `firmId`; ops consoles (`/admin/users`, `/admin/clients`, CMS, HR) manage that firm only |
| No firm switcher | Users do not pick “which firm” after sign-in; portals are role-based (`/admin`, `/staff`, `/client`), not tenant-based |
| Tenant columns exist | `firms` and `firmId` on domain tables are **preparation**, not a shipped multi-tenant product |
| People write paths | Users = identity invite/role/suspend; CMS team = public profile; CRM clients = grant portal link — all within one firm |

Phases A–D (invite activation, one identity create path, CRM portal grant, Users directory polish) are complete under this assumption.

---

## 2. What is already documented elsewhere

| Topic | Canonical doc |
| --- | --- |
| Auth production env (HTTPS, secrets, cookies, guards, demo accounts) | [`PHASE_AUTH_7_PRODUCTION.md`](./PHASE_AUTH_7_PRODUCTION.md) |
| Multi-firm remaining product work (signup, enforce firmId everywhere, per-firm CMS, branding, platform billing, super-admin, enterprise IdP) | [`../SAAS_MULTI_FIRM_PHASE8.md`](../SAAS_MULTI_FIRM_PHASE8.md) |
| Users / identity audit & Phases A–D | [`AUDIT_ADMIN_USERS.md`](./AUDIT_ADMIN_USERS.md) |

Do not duplicate those checklists here. Use them as the source of truth when production or multi-firm work starts.

---

## 3. Explicitly deferred (until product requires it)

Do **not** start these as follow-ons from the Users workstream:

1. **Firm switcher UI** (header org picker, “switch firm”, multi-membership sessions)
2. **Multi-firm Users console** (cross-tenant directory, firm-scoped invite as a platform op)
3. **Super-admin / platform console** for many firms
4. **Subdomain / custom-domain tenant routing**
5. **Platform SaaS billing** separate from firm client invoices
6. **SCIM / enterprise IdP provisioning** beyond current Better Auth + MFA

When product asks for multi-firm, start from [`SAAS_MULTI_FIRM_PHASE8.md`](../SAAS_MULTI_FIRM_PHASE8.md) and keep portal templates; add firm context + query filters rather than rewriting portals.

---

## 4. Safe single-firm production posture

For a **one-firm** production cutover:

1. Follow [`PHASE_AUTH_7_PRODUCTION.md`](./PHASE_AUTH_7_PRODUCTION.md) end-to-end.
2. Keep `NEXT_PUBLIC_SKIP_ROLE_GUARDS` unset in production.
3. Treat `firmId` as mandatory on new writes (already the service pattern) even while only one firm exists.
4. Do not expose demo accounts or Mailpit-oriented copy on the public production host (Users invite copy already scopes Mailpit to localhost).

Localhost may still use Mailpit, E2E users, and a single seeded firm — that does not change the single-firm product contract.

---

## 5. Trigger to leave docs-only mode

Leave Phase E / Phase 8 “docs and prep” mode only when product confirms **at least one** of:

- A second paying firm must share the same deployment, **or**
- Operators need to switch between firms in one browser session, **or**
- Firm self-signup / platform billing is sold.

Until then, identity and Users work stays single-firm; multi-tenant code is out of scope.

---

## 6. Done when

- [x] Single-firm assumption written for identity/Users.
- [x] Production checklist referenced (not rewritten).
- [x] Firm switcher and multi-firm admin explicitly deferred.
- [x] Cross-link from Users audit Phase E.

**PASS** (2026-08-06) — docs only; no firm-switcher implementation.
