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
| RBAC | Done | `requireRole` + `requirePermission` matrix; case scoping |
| User management | Done | Invite lifecycle, suspend gates, TOTP 2FA, admin CRUD, staff directory |
| File storage | Partial | Convex `generateUploadUrl` + mock blob fallback |
| Billing / PDF | Done | Invoice lifecycle, PDF, gateway initiate + payments rows |
| Notifications | Done | In-app + email/SMS audit log via `communications` |

---

## User Management System (UMS)

Primary UI: `/admin/users` (`AdminUsersPage`). Self-service: shared profile page. Backend: `convex/users.ts`, `convex/lib/roles.ts`, `convex/lib/totp.ts`.

| Capability | Behavior |
|---|---|
| Invite | `createUser` sets `isPending`, inactive until activate; 7-day `inviteExpiresAt`; email via audit/comms log |
| Resend / reset | `resendInvitation`, `sendPasswordReset` refresh token + expiry |
| Activate | `/setup-account?token=` → `activateAccount`; OIDC email match also binds + activates |
| Client link | Client-role invites auto-create/link `clients.userId` |
| Suspend | `isActive: false` enforced in `requireAuth` / `requireRole`; sessions revoked |
| Directory | `listUsers` admin-only; `listStaffDirectory` for assignment dropdowns |
| Sessions | Created on `updateCurrentUser`; admin revoke-all; profile revoke own |
| Audit | `auditLog` on invite/role/suspend/activate/2FA/profile |
| 2FA | TOTP enroll/confirm/disable (`beginTotpEnrollment`…) |
| Permissions | Default matrix in `DEFAULT_ROLE_PERMISSIONS`; editable under Settings → Role Permissions |
| Soft delete | `archiveUser` (hard delete blocked if assigned to cases) |

SSO / SCIM / multi-firm org units: deferred to Phase 8.

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
- [x] UMS completion — invite lifecycle, gates, admin CRUD, profile/2FA, permission matrix
- [ ] Phase 8 — Multi-firm SaaS (see `SAAS_MULTI_FIRM_PHASE8.md`)

---

## Nepal-Specific Requirements

- Dates: prefer `nepali-calendar.ts` / `bs-calendar.ts` re-exports
- Currency NPR via `formatNPR()`
- VAT 13% server-side
- PF 10% + SSF 3.33% in payroll generator
