# LexNepal — Full Build Plan

**App:** Nepal law firm management platform  
**Stack:** Vite + React + TypeScript + Convex + Hercules Auth  
**Last updated:** 2081 Mangsir (July 2026)

---

## Current State Summary

| Area | Status | Notes |
|---|---|---|
| Public website UI | ✅ 100% | Brand theme applied, leads wired |
| Convex schema | ✅ 100% | All 18 tables defined |
| Staff portal UI | 80% | All pages built, all data is mock |
| Client portal UI | 80% | All pages built, all data is mock |
| Admin console UI | 80% | All pages built, all data is mock |
| Auth | ✅ Done | Hercules Auth wired, callback working |
| RBAC | 0% | Role guards in layouts, no server enforcement yet |
| File storage | 0% | Not started |
| Billing / PDF | 0% | Not started |
| Notifications | 0% | Not started |

---

## Phase 1 — Public Website Fixes ✅ DONE
**Status:** Complete

- [x] Nav links consistent (`/lawyers` route)
- [x] `leads` table in `convex/schema.ts`
- [x] `createLead` mutation in `convex/leads.ts` (public, no auth required)
- [x] LexNepal brand theme applied: navy `oklch(0.32 0.06 265)` primary, gold `oklch(0.68 0.12 60)` accent, ivory bg, dark sidebar for portals

---

## Phase 2 — Convex Backend Foundation ✅ DONE
**Status:** Complete

- [x] Extended `users` table: `role`, `barCouncilNumber`, `barCouncilExpiry`, `isActive`, `avatar`, `phone`
- [x] All 18 tables defined in `convex/schema.ts`
- [x] All queries & mutations built: `cases`, `clients`, `documents`, `hearings`, `hr`, `invoices`, `leads`, `messages`, `notifications`, `tasks`, `timeEntries`, `auditLog`
- [x] `requireRole` / `requireAuth` helpers in `convex/lib/roles.ts`
- [x] `useCurrentUser` hook + `getPortalForRole` in `src/hooks/use-current-user.ts`
- [x] `lex-constants.ts`, `nepali-calendar.ts`

---

## Phase 3 — Role-Based Access Control
**Status:** Not started  
**Effort:** Medium (1–2 days)  
**Depends on:** Phase 2 ✅

- [ ] Add role check after sign-in: redirect to `/client`, `/staff`, or `/admin` based on role
- [ ] Apply `requireRole` to every sensitive mutation and query
- [ ] Admin Users page: real role assignment (edit + save)
- [ ] Block direct URL access to wrong portal

---

## Phase 4 — Staff Portal (Live Data)
**Status:** Not started  
**Effort:** Large (2–3 days)  
**Depends on:** Phase 2 ✅, Phase 3

---

## Phase 5 — Client Portal (Live Data)
**Status:** Not started  
**Effort:** Medium (1–2 days)  
**Depends on:** Phase 2 ✅, Phase 3

---

## Phase 6 — Admin Console (Live Data)
**Status:** Not started  
**Effort:** Large (2 days)  
**Depends on:** Phase 2 ✅, Phase 3

---

## Phase 7 — File & Document Management
**Status:** Not started  
**Effort:** Medium (1–2 days)  
**Depends on:** Phase 4

---

## Phase 8 — Billing & PDF Invoicing
**Status:** Not started  
**Effort:** Medium (1–2 days)  
**Depends on:** Phase 6

---

## Phase 9 — Notifications
**Status:** Not started  
**Effort:** Small–Medium (1 day)  
**Depends on:** Phase 4, Phase 5

---

## Nepal-Specific Requirements (apply across all phases)

- All dates displayed in **Bikram Sambat (BS)** with Gregorian in parentheses
- All currency in **NPR** formatted as `रू 1,25,000` using `formatNPR()` from `src/lib/lex-constants.ts`
- **VAT rate: 13%** — always calculated server-side in Convex mutations
- **Provident Fund (PF): 10%** employer + **10%** employee contribution
- **SSF (Social Security Fund): 3.33%** employer contribution
- Court names use official Nepal judiciary names
- Bar Council numbers format: `NPC-XXXXXX`
- Case numbers format: `KTM/YYYY/NNN` (or district prefix)
