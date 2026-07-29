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
| Staff portal UI | 80% | All pages built, mock data |
| Client portal UI | 80% | All pages built, mock data |
| Admin console UI | 80% | All pages built, role edit live |
| Auth | ✅ Done | Hercules Auth wired, callback working |
| RBAC | ✅ Done | Server enforcement + post-login redirect |
| File storage | 0% | Not started |
| Billing / PDF | 0% | Not started |
| Notifications | 0% | Not started |

---

## Phase 1 — Public Website Fixes ✅ DONE

## Phase 2 — Convex Backend Foundation ✅ DONE

## Phase 3 — Role-Based Access Control ✅ DONE
**Status:** Complete

- [x] `updateCurrentUser` returns `{ id, role }` — Callback.tsx redirects to correct portal
- [x] All sensitive mutations enforce `requireRole` / `requireAuth`
  - `createCase`, `updateCase` → staff + admin
  - `createClient`, `updateClient` → staff + admin
  - `createHearing`, `updateHearing` → staff + admin
  - `createDocument` → any auth; `deleteDocument` → staff + admin
  - `createTask`, `updateTask`, `deleteTask` → staff + admin
  - `createTimeEntry`, `deleteTimeEntry` → staff + admin
  - `createInvoice`, `updateInvoiceStatus`, `addLineItem`, `createTrustTransaction` → staff + admin
  - `sendMessage` → any auth; internal messages → staff + admin
  - `updateLead` → staff + admin; `createLead` → public
  - `createLeaveRequest` → staff + admin; `reviewLeaveRequest` → admin only
  - `listAuditLog` → admin only
- [x] AdminUsersPage: live role assignment via `updateUser` mutation (admin-only)
- [x] Layout role guards redirect to correct portal on wrong access

---

## Phase 4 — Staff Portal (Live Data)
**Status:** Not started  
**Effort:** Large (2–3 days)  
**Depends on:** Phase 3 ✅

---

## Phase 5 — Client Portal (Live Data)
**Status:** Not started  
**Effort:** Medium (1–2 days)  
**Depends on:** Phase 3 ✅

---

## Phase 6 — Admin Console (Live Data)
**Status:** Not started  
**Effort:** Large (2 days)  
**Depends on:** Phase 3 ✅

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
