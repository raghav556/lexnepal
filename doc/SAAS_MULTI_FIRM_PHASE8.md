# Phase 8 — Multi-Firm SaaS (prepared, not shipped)

LexNepal is complete as a **single-firm** product. Schema already includes:

- `firms` table (`name`, `slug`, `isActive`)
- Optional `firmId` on `users`, `clients`, `cases`, `leads`, `appointments`, `expenses`, `firmSettings`

## Remaining work for true multi-tenant SaaS

1. **Firm signup / onboarding** — create firm + first admin user
2. **Enforce `firmId` on every query/mutation** — never return cross-firm rows
3. **Per-firm CMS** — scope `cmsSettings`, `practiceAreas`, `blogPosts`, `navigation` by firm
4. **Per-firm branding** — theme colors, domain/subdomain routing
5. **Platform billing** — LexNepal subscription separate from firm client invoices
6. **Super-admin console** — manage firms, suspend, usage metrics

## Rule

Do **not** rewrite portal UI. Add firm context provider + filter helpers; keep existing templates.
