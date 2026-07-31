# LexNepal — Full Build Plan (Updated)

**App:** Nepal law firm management platform  
**Stack:** Vite + React + TypeScript + Convex + Hercules Auth  
**Last updated:** Aug 2026 (audit roadmap implementation)

---

## Current State Summary

| Area | Status | Notes |
|---|---|---|
| Public website UI | Done | CMS-driven nav, legal pages, careers/resources/news |
| Convex schema | Done | firms + firmId prep, expenses, templates, research, testimonials, intake, sessions, legal pages |
| Staff portal | Done | Live queries; case messages/timeline; Pesi honest empty state |
| Client portal | Done | Dashboard/cases/billing/KYC/e-sign/booking wired to client record |
| Admin console | Done | Finance status, payroll generator, CMS news/resources CRUD |
| Auth | Done | Mock opt-in via `VITE_USE_MOCK`; live OIDC hooks ready |
| RBAC | Done | Case list scoped by role; server `requireRole` |
| File storage | Partial | Convex `generateUploadUrl` + mock blob fallback |
| Billing / PDF | Done | Invoice lifecycle, PDF, gateway initiate + payments rows |
| Notifications | Done | In-app + email/SMS audit log via `communications` |

---

## Phase status (audit roadmap)

- [x] Phase 0 — Foundation (mock flag, env example, firmId, providers, auth hooks)
- [x] Phase 1 — Schema & API parity (expenses, templates, research, analytics, settings, CMS gaps, intake)
- [x] Phase 2 — Public CMS (nav, privacy/terms, news admin, resources CRUD, careers apply, newsletter)
- [x] Phase 3 — Staff portal (Command Center fix, Pesi, appointments links, case detail, BS calendar)
- [x] Phase 4 — Client portal (dashboard, clientId fix, KYC, e-sign, booking)
- [x] Phase 5 — Finance/payments/payroll
- [x] Phase 6 — Notifications & communications
- [x] Phase 7 — i18n, RBAC, SaaS prep doc
- [ ] Phase 8 — Multi-firm SaaS (see `SAAS_MULTI_FIRM_PHASE8.md`)

---

## Nepal-Specific Requirements

- Dates: prefer `nepali-calendar.ts` / `bs-calendar.ts` re-exports
- Currency NPR via `formatNPR()`
- VAT 13% server-side
- PF 10% + SSF 3.33% in payroll generator
