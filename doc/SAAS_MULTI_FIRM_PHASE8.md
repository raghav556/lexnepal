# Phase 8 — Multi-Firm SaaS (prepared, not shipped)

> **Archived product option — out of scope.** LexNepal is the single-firm Srimar Law application.
> This document is retained only as historical planning and must not drive current implementation
> or release work.

LexNepal is complete as a **single-firm** product. Schema already includes:

- `firms` table (`name`, `slug`, `isActive`)
- Optional `firmId` on `users`, `clients`, `cases`, `leads`, `appointments`, `expenses`, `firmSettings`

**Identity / Users posture (2026-08):** Phases A–D assume one firm; see [`migration/PHASE_E_SINGLE_FIRM_SAAS.md`](./migration/PHASE_E_SINGLE_FIRM_SAAS.md). Do **not** build a firm switcher until product requires multi-tenant SaaS.

## Remaining work for true multi-tenant SaaS

1. **Firm signup / onboarding** — create firm + first admin user
2. **Enforce `firmId` on every query/mutation** — never return cross-firm rows
3. **Per-firm CMS** — scope `cmsSettings`, `practiceAreas`, `blogPosts`, `navigation` by firm
4. **Per-firm branding** — theme colors, domain/subdomain routing
5. **Platform billing** — LexNepal subscription separate from firm client invoices
6. **Super-admin console** — manage firms, suspend, usage metrics
7. **Firm switcher** — only if users belong to multiple firms in one deployment
8. **Enterprise IdP** — Okta / Azure AD SSO + SCIM provisioning (beyond current OIDC + TOTP UMS)

## Rule

Do **not** rewrite portal UI. Add firm context provider + filter helpers; keep existing templates.
