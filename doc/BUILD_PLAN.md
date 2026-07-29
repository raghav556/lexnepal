# LexNepal — Full Build Plan

**App:** Nepal law firm management platform  
**Stack:** Vite + React + TypeScript + Convex + Hercules Auth  
**Last updated:** 2081 Mangsir (July 2026)

---

## Current State Summary

| Area | Status | Notes |
|---|---|---|
| Public website UI | 95% | 3 fixes needed (see Phase 1) |
| Convex schema | 5% | Only `users` table exists |
| Staff portal UI | 80% | All pages built, all data is mock |
| Client portal UI | 80% | All pages built, all data is mock |
| Admin console UI | 80% | All pages built, all data is mock |
| Auth | Done | Hercules Auth wired, callback working |
| RBAC | 0% | No role enforcement yet |
| File storage | 0% | Not started |
| Billing / PDF | 0% | Not started |
| Notifications | 0% | Not started |

---

## Phase 1 — Public Website Fixes
**Status:** Not started  
**Effort:** Small (half day)  
**Depends on:** Nothing

### Goals
Close the 3 remaining gaps so the public website is fully functional and shippable.

### Tasks
- [ ] Fix broken nav/footer links: `/lawyers` → `/our-lawyers`
- [ ] Add `leads` table to `convex/schema.ts`
- [ ] Add `createLead` mutation in `convex/leads.ts` (public, no auth required)
- [ ] Apply LexNepal brand theme to `src/index.css`:
  - Primary: navy `oklch(0.25 0.07 250)` 
  - Accent: gold `oklch(0.72 0.13 70)`
  - Light background: warm ivory `oklch(0.98 0.01 80)`
  - Dark surfaces: charcoal `oklch(0.16 0.01 250)`

### Definition of Done
- Consultation and Contact forms save a lead to Convex without error
- All nav links resolve to correct pages (no 404s)
- Navy + gold theme visible across public site, staff portal, and admin console

---

## Phase 2 — Convex Backend Foundation
**Status:** Not started  
**Effort:** Large (2–3 days)  
**Depends on:** Nothing (can run parallel to Phase 1)

### Goals
Build the complete database schema and all backend functions. Every subsequent phase depends on this.

### Schema tables to add

| Table | Key fields |
|---|---|
| `users` (extend) | Add `role`, `barNumber`, `barExpiry`, `avatarUrl`, `isActive` |
| `cases` | `caseNumber`, `title`, `clientId`, `assignedLawyerIds`, `practiceArea`, `court`, `status`, `openedAt`, `closedAt` |
| `hearings` | `caseId`, `court`, `dateTime`, `purpose`, `status`, `notes` |
| `documents` | `caseId`, `uploadedBy`, `fileName`, `storageId`, `documentType`, `isClientVisible` |
| `invoices` | `caseId`, `clientId`, `lineItems`, `subtotal`, `vat`, `total`, `status`, `issuedAt`, `dueAt` |
| `leads` | `fullName`, `email`, `phone`, `practiceAreaInterest`, `source`, `status`, `message`, `assignedTo` |
| `tasks` | `caseId`, `assignedTo`, `title`, `priority`, `status`, `dueDate` |
| `timeEntries` | `caseId`, `staffId`, `date`, `hours`, `description`, `isBillable`, `rateNPR` |
| `notifications` | `userId`, `type`, `title`, `body`, `isRead`, `relatedId` |

### Mutations and queries to build

- `convex/cases.ts` — list, get, create, update, close
- `convex/hearings.ts` — list by case, list upcoming, create, update
- `convex/documents.ts` — list by case, getDownloadUrl, create, delete
- `convex/invoices.ts` — list, get, create, markPaid
- `convex/leads.ts` — createLead (public), list, updateStatus
- `convex/tasks.ts` — list by case/assignee, create, updateStatus
- `convex/timeEntries.ts` — list by case/staff, create, delete
- `convex/notifications.ts` — list for user, markRead, markAllRead

### Definition of Done
- Convex build passes with zero errors
- All tables have correct indexes
- All mutations enforce auth where required
- TypeScript types pass

---

## Phase 3 — Role-Based Access Control
**Status:** Not started  
**Effort:** Medium (1–2 days)  
**Depends on:** Phase 2

### Goals
Enforce that each user can only access what their role permits — both in the frontend (routing) and backend (Convex functions).

### Roles

| Role | Portal | Permissions |
|---|---|---|
| `partner` | `/staff` | Full access to all cases, all staff data |
| `senior_associate` | `/staff` | Full access to own cases and assigned cases |
| `associate` | `/staff` | Access to assigned cases only |
| `paralegal` | `/staff` | View cases, documents; no billing |
| `admin` | `/admin` | Full admin console access |
| `client` | `/client` | Own cases, own documents, own invoices only |

### Tasks
- [ ] Add role check after sign-in: redirect to `/client`, `/staff`, or `/admin` based on role
- [ ] Create `useCurrentUser` hook that returns the authenticated user with role
- [ ] Add `requireRole(ctx, [...allowedRoles])` helper in Convex
- [ ] Apply `requireRole` to every sensitive mutation and query
- [ ] Admin Users page: real role assignment (edit + save)
- [ ] Block direct URL access to wrong portal (redirect away if wrong role)

### Definition of Done
- A client cannot access `/staff` or `/admin` — redirected immediately
- A staff member cannot read another client's cases via Convex
- Admin can assign roles to users from the Users page

---

## Phase 4 — Staff Portal (Live Data)
**Status:** Not started  
**Effort:** Large (2–3 days)  
**Depends on:** Phase 2, Phase 3

### Goals
Replace all mock/static data in the staff portal with real Convex queries and mutations.

### Tasks

**Cases**
- [ ] `StaffCasesPage` — real paginated list with search and filter by status/practice area
- [ ] `StaffCaseDetailPage` — real case data: hearings timeline, documents list, time entries, task list, notes

**Hearings**
- [ ] `StaffHearingsPage` — real upcoming hearings sorted by date, filterable by court
- [ ] Create/edit hearing modal

**Clients**
- [ ] `StaffClientsPage` — real client list with case count, search

**Documents**
- [ ] `StaffDocumentsPage` — real documents with upload (Convex File Storage)
- [ ] View/download file links

**Tasks**
- [ ] `StaffTasksPage` — real task create/update/complete with case linkage

**Time Tracker**
- [ ] `StaffTimeTrackerPage` — real time entry log, billable flag, total hours per case

**Dashboard**
- [ ] `StaffDashboard` — real counts: open cases, upcoming hearings today, pending tasks, unbilled hours

### Definition of Done
- No hardcoded mock data remains in any staff page
- All loading and empty states are handled
- All writes persist and reflect immediately (Convex reactivity)

---

## Phase 5 — Client Portal (Live Data)
**Status:** Not started  
**Effort:** Medium (1–2 days)  
**Depends on:** Phase 2, Phase 3

### Goals
Replace all mock data in the client portal. Clients see only their own data.

### Tasks
- [ ] `ClientDashboard` — real case count, latest hearing, outstanding invoices
- [ ] `ClientCasesPage` — real cases assigned to this client
- [ ] `ClientDocumentsPage` — documents where `isClientVisible = true` for their cases
- [ ] `ClientMessagesPage` — threaded messages between client and assigned advocate
- [ ] `ClientBillingPage` — real invoices with NPR amounts, VAT, payment status

### Definition of Done
- A client can only see their own cases and documents (enforced by Convex)
- All pages handle loading skeletons and empty states

---

## Phase 6 — Admin Console (Live Data)
**Status:** Not started  
**Effort:** Large (2 days)  
**Depends on:** Phase 2, Phase 3

### Goals
Replace all mock data in the admin console with real Convex data.

### Tasks
- [ ] `AdminDashboard` — real KPIs: active cases, monthly revenue, leads this month, staff headcount
- [ ] `AdminUsersPage` — real user list from Convex, role edit, bar expiry warnings
- [ ] `AdminHRPage` — real attendance records, leave request approval flow
- [ ] `AdminFinancePage` — real invoice list, trust ledger entries, revenue totals
- [ ] `AdminCRMPage` — real leads from consultation/contact forms, status pipeline update
- [ ] `AdminAuditPage` — real audit log written by Convex mutations

### Definition of Done
- All admin pages show live Convex data
- Admin can approve leave requests and they persist
- CRM leads created from public forms appear in real time

---

## Phase 7 — File & Document Management
**Status:** Not started  
**Effort:** Medium (1–2 days)  
**Depends on:** Phase 4

### Goals
Allow staff to upload case documents to Convex File Storage and control client visibility.

### Tasks
- [ ] Implement 3-step Convex upload flow (generate URL → POST file → save storageId)
- [ ] `DocumentUploadModal` component reusable across staff pages
- [ ] Attach documents to cases with metadata (type, uploaded by, date)
- [ ] Toggle `isClientVisible` per document (staff can control what clients see)
- [ ] Client portal fetches only visible documents for their cases
- [ ] File download via signed Convex storage URL

### Definition of Done
- Staff can upload any file type to a case
- Clients can download documents marked as visible to them
- No file URLs are hardcoded

---

## Phase 8 — Billing & PDF Invoicing
**Status:** Not started  
**Effort:** Medium (1–2 days)  
**Depends on:** Phase 6

### Goals
Generate proper NPR invoices as PDFs with VAT, allow marking paid, and surface them to clients.

### Tasks
- [ ] Invoice creation form: add line items, auto-calculate 13% VAT
- [ ] Generate PDF using `jspdf` with firm header, client details, line items, subtotal, VAT, total
- [ ] Download PDF button on invoice card (staff + client)
- [ ] "Mark as Paid" action in admin finance and client billing pages
- [ ] Trust account: record receipt when retainer is received

### Definition of Done
- A staff member can create an invoice and download a correctly formatted PDF
- VAT calculation (13%) is always correct
- Client can see their invoices and download PDFs

---

## Phase 9 — Notifications
**Status:** Not started  
**Effort:** Small–Medium (1 day)  
**Depends on:** Phase 4, Phase 5

### Goals
Alert users to important events without them having to manually check every page.

### Tasks
- [ ] Notification bell in staff and client portal navbars with unread count badge
- [ ] Notification dropdown: list recent notifications, mark as read
- [ ] Write notifications from Convex mutations on key events:
  - New hearing scheduled → notify assigned lawyers
  - New document uploaded → notify client (if visible)
  - Invoice sent → notify client
  - Bar certificate expiring in 90 days → notify staff member + admin
- [ ] "Mark all read" action

### Definition of Done
- Notifications appear in real time when triggered
- Unread count clears when notification is viewed

---

## Phase Execution Order

```
Phase 1 ──────────────────────────────► Public website done
Phase 2 ──────────────────────────────► Backend ready (critical path)
Phase 3 ──────────────────────────────► Auth + roles enforced
Phase 4 ──────────────────────────────► Staff portal live
Phase 5 ──────────────────────────────► Client portal live
Phase 6 ──────────────────────────────► Admin console live
Phase 7 ──────────────────────────────► Files working
Phase 8 ──────────────────────────────► Billing + PDFs done
Phase 9 ──────────────────────────────► Notifications done
                                                │
                                          Production ready
```

Phases 1 and 2 can be built in parallel (no dependencies between them).  
Phases 4, 5, 6 can be built in parallel once Phase 3 is done.  
Phases 7, 8, 9 can be built in parallel once Phase 6 is done.

---

## Nepal-Specific Requirements (apply across all phases)

- All dates displayed in **Bikram Sambat (BS)** with Gregorian in parentheses
- All currency in **NPR** formatted as `रू 1,25,000` using `formatNPR()` from `src/lib/lex-constants.ts`
- **VAT rate: 13%** — always calculated server-side in Convex mutations
- **Provident Fund (PF): 10%** employer + **10%** employee contribution
- **SSF (Social Security Fund): 3.33%** employer contribution
- Court names use official Nepal judiciary names (`District Court, Kathmandu` etc.)
- Bar Council numbers format: `NPC-XXXXXX`
- Case numbers format: `KTM/YYYY/NNN` (or district prefix)
