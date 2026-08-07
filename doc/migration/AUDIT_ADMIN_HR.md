# Audit — Admin HR (`/admin/hr`) & staff HR surfaces

**Scope:** `http://localhost:3001/admin/hr` — Attendance, Leave, Payroll, and every related staff/API/schema surface.  
**Date:** 2026-08-06  
**Standard:** Advanced corporate-grade HR for a Nepal law firm on **localhost first**, then production-ready.  
**Rules:** No skip, no drift, no duplicate modules, no inventing a second HR product. One writer per concern; reuse existing `/api/v1/hr/*` + `HrService` / `HrRepository`.  
**Related:** Migration slice `PHASE_8_11_HR.md` (`complete_local` for Convex→Next authority only — **not** corporate-grade product completion).

---

## 1. Honest verdict

`/admin/hr` is a **real, wired admin console** on Next.js + PostgreSQL (not a stub). It can mark today’s attendance, approve/reject leave rows that already exist, set base salaries, and show a live Nepal-style PF/SSF/tax payroll preview.

It is **not** fully enterprise HR (holidays, multi-step approval, attendance→pay) but the localhost product track **HR-0…HR-6 is complete**:

1. **Staff portal HR self-service is live** (`/staff/hr`) for attendance, leave, and finalized payslips (HR-2 + HR-5).
2. **Ops UX gaps remain** — no holidays calendar or multi-step approval chains (HR-3 polish landed date/filter/export).
3. **Payroll runs exist (HR-5)** — draft generate → finalize → staff payslip read; live GET preview remains for ad-hoc calc.
4. **Policy layer partial (HR-4)** — leave balances enforced; holidays / multi-step approval still missing.
5. **Notifications (HR-6):** leave submit notifies `hr.manage`; decision notifies requester (in-app + email queue).
6. **Security / governance (HR-1 done):** attendance upsert is self-only unless `hr.manage`; review/payroll/salary use `hr.manage`; HR audit events are written. Partner UI for manage remains deferred.

**Where it is used today**

| Actor | Surface | What they can do |
| --- | --- | --- |
| Admin | `/admin/hr` | Mark attendance for staff, review leave, set salary, generate/finalize payroll runs, live preview |
| Partner / other staff | `/staff/hr` | Clock self attendance; request leave; view own history + finalized payslips |
| Staff (API only) | `POST /api/v1/hr/leave-requests`, `POST /api/v1/hr/attendance` | Same as staff UI; peer attendance denied without `hr.manage` |
| Client | — | Out of scope |

**Staff portal status:** **Complete for attendance + leave + payslips** (`/staff/hr`).

---

## 2. Surface & route map

```text
Admin Console (PortalRoleGuard: admin only)
  └── /admin/hr  → AdminHRPage
        ├── Tab: Attendance  (today only, per-staff present/absent/clock-out)
        ├── Tab: Leave       (list all requests; approve/reject if pending)
        └── Tab: Payroll     (live generate + set base salary forms)

Staff Workspace
  └── /staff/hr  → StaffHRPage
        ├── Tab: Attendance  (self clock in/out + 30-day history)
        └── Tab: Leave       (create request + own list)

Public / Client
  └── N/A (CMS careers ≠ firm HR — correctly owned by CMS)
```

**APIs (exist)**

| Method | Path | Auth today | UI consumer |
| --- | --- | --- | --- |
| GET/POST | `/api/v1/hr/attendance` | any staff role | Admin HR only (POST for any userId) |
| GET/POST | `/api/v1/hr/leave-requests` | any staff (POST = self) | GET admin; POST **no UI** |
| POST | `/api/v1/hr/leave-requests/review` | **admin role only** | Admin HR |
| GET | `/api/v1/hr/payroll` | **admin role only** | Admin HR |
| POST | `/api/v1/hr/base-salary` | **admin role only** | Admin HR |

**Schema (exist)**

- `attendance` — firm + user + date unique; clockIn/Out; status `present|absent|half_day|leave`
- `leave_requests` — type `annual|sick|maternity|paternity|unpaid`; status pending/approved/rejected; reviewedBy
- `users.base_salary` — numeric; used by payroll generator

**Not in schema:** leave balances, holiday calendar, payroll runs/payslips, overtime, shifts, departments, cost centers, employee documents.

---

## 3. Module-by-module inspection

### 3.1 Attendance

| Check | Status | Evidence / gap |
| --- | --- | --- |
| List by date | Partial | UI hard-codes **today**; API supports `date` / `userId` |
| Mark present / absent | Working (admin) | AdminHRPage handlers |
| Clock out | Working (admin) | Only if present without clockOut |
| Half-day | Schema only | Enum exists; **no UI** |
| Status = leave auto from approved leave | Missing | Leave approval does not write attendance rows |
| Date picker / history / month view | Missing | |
| Self clock-in (staff) | Missing | No staff page; API would allow any staff to mark others |
| Geo / device / IP attestation | Missing | Out of MVP corporate, list as P2 |
| Filters, search, pagination, export | Missing | Card list of all non-client users |
| Confirm dialogs | Missing | Immediate mutate |
| Audit `hr.attendance_*` | Missing | No HR-specific audit writes |

### 3.2 Leave

| Check | Status | Evidence / gap |
| --- | --- | --- |
| Admin list + approve/reject | Working | AdminHRPage Leave tab |
| Staff submit leave | **API only** | `createLeaveRequest` — **no staff UI** |
| Leave types | Partial | annual/sick/maternity/paternity/unpaid in contract |
| Entitlements / balances / accrual | Missing | No tables or UI |
| Overlap / conflict validation | Missing | Only toDate ≥ fromDate |
| Auto-mark attendance on approve | Missing | |
| Filters (status/type/person), pagination | Missing | Full unfiltered list |
| Cancel / withdraw pending | Missing | |
| Partner/manager approve (`hr.manage`) | Missing | Hard `requireAdmin`; partners cannot use `/admin` |
| Notifications on submit/decision | Missing | Toast only for admin reviewer |
| Audit | Missing | |

### 3.3 Payroll

| Check | Status | Evidence / gap |
| --- | --- | --- |
| Live PF 10% / SSF 3.33% / simple tax bands | Working | `HrRepository.generatePayroll` |
| Set base salary | Working | Per-user form on Payroll tab |
| Pay period / month selector | Missing | Always “current month” label; calc ignores attendance |
| Persist payroll run | Missing | Recomputed every GET; no `payroll_runs` table |
| Payslip PDF / download | Missing | |
| Attendance / unpaid leave deductions | Missing | Gross = base salary only |
| Employer vs employee contribution clarity | Weak | UI shows PF/SSF; SSF stored as employer-side in DTO naming |
| Bank / payment batch | Missing | |
| Export CSV / Excel | Missing | |
| Lock run / reopen / audit | Missing | |
| Nepal FY / BS calendar alignment | Missing | AD dates only |

### 3.4 Cross-cutting / governance

| Check | Status | Gap |
| --- | --- | --- |
| Capability `hr.manage` | Declared, unused | Service uses `role === "admin"` instead of `requireCapability(..., "hr.manage")` |
| Admin portal access | Admin-only | Partners with `hr.manage` never see `/admin/hr` |
| Deep link from Users drawer | Link to `/admin/hr` | Exists from Users Phase D; no reverse deep link staff→user |
| Localization / NPR | Partial | `formatNPR` on payroll; leave/attendance plain AD strings |
| E2E Playwright for HR UI | Missing | Only `hr:verify-local` API/migrate smoke |
| Staff nav + i18n keys | Missing | |

---

## 4. Staff portal gap (explicit)

| Expected corporate staff self-service | Present? |
| --- | --- |
| `/staff/hr` or `/staff/attendance` self clock | **No** |
| `/staff/leave` request + history | **No** |
| View own leave balance | **No** |
| View own payslip / net pay | **No** |
| Nav under Staff layout | **No** |

**Conclusion:** Admin HR is an **ops island**. The leave **create** path is unfinished end-to-end until staff UI exists. Do not build a second leave product — wire staff UI to existing `POST /api/v1/hr/leave-requests`.

---

## 5. Security & policy findings (must fix in upgrade)

| ID | Severity | Finding | Required fix |
| --- | --- | --- | --- |
| HR-S1 | **P0** | ~~`upsertAttendance` allows any staff to set attendance for **any** `userId`~~ | **Fixed HR-1:** self-only unless `hr.manage` |
| HR-S2 | **P0** | ~~Leave review / payroll gated by `role === "admin"` while matrix grants partners `hr.manage`~~ | **Fixed HR-1:** `requireCapability(..., "hr.manage")` |
| HR-S3 | **P1** | ~~No dedicated HR audit events~~ | **Fixed HR-1:** `hr.attendance_upserted`, `hr.leave_*`, `hr.salary_set`, `hr.payroll_generated` |
| HR-S4 | **P1** | Salary visible/editable only on admin page — OK — but no change history | Audit + optional salary history table later |

---

## 6. Missing requirements list (corporate-grade, localhost→production)

Grouped for the upgrade plan. **Do not implement unrelated HRIS** (recruiting ATS, performance reviews, benefits marketplace) unless product asks — those stay out of scope like CMS careers.

### A. Complete the existing three modules (must)

1. Staff self-service: clock in/out (self), request leave, see own leave + attendance history.  
2. Admin: date-range attendance, filters, table UX, export CSV.  
3. Admin: leave filters (status/type/user), pagination, confirm approve/reject.  
4. Leave approve → optional attendance rows for date span (`status: leave`).  
5. Harden attendance upsert authorization (HR-S1).  
6. Wire `hr.manage` for review/payroll/salary (HR-S2).  
7. HR audit events (HR-S3).  
8. Payroll: month selector; export CSV; clarify PF/SSF labels.  
9. Half-day attendance in admin + staff UI.  
10. Playwright + extend `hr:verify-local` for self-vs-manager rules.

### B. Policy / Nepal firm HR (should, before calling “corporate”)

11. Leave entitlements/balances per type per FY (or calendar year).  
12. Holiday calendar (AD; optional BS display).  
13. Unpaid leave / absence deduction rules into payroll preview.  
14. Persisted payroll **runs** (draft → finalized) + payslip view/PDF.  
15. Notifications (in-app ± email) on leave submit/decision.

### C. Hardening / production (ops)

16. Production copy (no locale-fragile clock strings without timezone policy).  
17. Document TZ policy (firm local Asia/Kathmandu).  
18. Rate limits / idempotent attendance upsert already conflict-safe — keep.  
19. Backup note: salary on `users` — sensitive; access audit required.  
20. Partner HR: either open limited admin HR for partners **or** manager console under `/staff/hr/manage` — pick one, do not duplicate both.

### D. Explicit non-goals (avoid drift)

- CMS careers / job applications (already CMS).  
- Full ERP (GL posting, bank file formats) until finance product asks.  
- Biometric devices / geo-fence MVP.  
- Multi-firm HR switcher (Phase E SaaS docs).  
- Second “People” directory (Users + Clients already split).

---

## 7. Phased upgrade plan (end-to-end on localhost)

**Done when each phase’s exit gate passes on `http://localhost:3001` without skipping modules.**

### Phase HR-0 — Baseline freeze (½ day) — **DONE 2026-08-07**

1. Confirm `npm run hr:verify-local` green.  
2. Screenshot / note current AdminHR tabs.  
3. Freeze scope to this document; no new domains.

**Exit:** Verify script PASS; scope signed.

#### HR-0 execution record

| Check | Result |
| --- | --- |
| `npm run hr:verify-local` | **PASS** (2026-08-07T01:25Z) |
| `auth:verify-boundary` | passed (`anonymous` 401, same-firm 200, cross-firm 404, MFA 403) |
| `migration:identity` | reconciliation passed |
| HR migrate reconcile | attendance 1→1, leaveRequests 1→1 |
| Associate payroll | **403** (expected) |
| Admin attendance list/upsert | 200 |
| Leave list / review / create (associate) | 200 / 200 / 201 |
| Base salary + payroll | 200; gross `250000`, PF `25000` |
| Script summary | `associatePayrollDenied: true`, `hr:verify-local passed` |

**Admin `/admin/hr` baseline (code inventory — freeze):**

| Surface | Baseline behavior |
| --- | --- |
| Route | `src/app/(admin)/admin/hr/page.tsx` → `AdminHRPage` |
| KPIs | Total Staff, Present Today, On Leave, Pending Leaves |
| Tab Attendance | Date picker + staff table; filters; half-day; CSV (HR-3) |
| Tab Leave | Table; status/type filters; confirm review; CSV (HR-3) |
| Tab Payroll | Live preview + CSV; salary Set/Not set; draft runs → finalize (HR-5) |
| Staff portal HR | `/staff/hr` Attendance + Leave (HR-2) |
| Known P0 still open | ~~HR-S1 / HR-S2~~ — **closed in HR-1** |

**Scope freeze (signed):** Upgrade work follows this document only — Attendance, Leave, Payroll (+ staff self-service wiring). No ATS/careers, no biometric, no second leave API, no multi-firm HR. Next phase: **HR-1**.

---

### Phase HR-1 — Authorization & audit hardening (1 day) — **P0** — **DONE 2026-08-07**

1. Attendance upsert: self-only **or** `hr.manage` / admin for others.  
2. Replace `requireAdmin` with `requireCapability(..., "hr.manage")` for review, payroll, base salary (admins already have all caps).  
3. Add HR audit writes on mutations.  
4. Extend `scripts/hr/verify-local.ts` for associate cannot mark peer attendance; can mark self; cannot payroll.

**Exit:** Verify script covers HR-S1/S2; no UI regression on admin happy path.

#### HR-1 execution record

| Check | Result |
| --- | --- |
| `npm run hr:verify-local` | **PASS** |
| HR-S1 associate peer attendance | 403 (`missing permission hr.manage`) |
| HR-S1 associate self attendance | 200 + `hr.attendance_upserted` |
| HR-S2 associate payroll / leave review | 403 |
| HR-S2 partner payroll + peer attendance | 200 (`hr.manage` default) |
| Admin happy path | attendance / leave review / salary / payroll OK |
| Audit events | `hr.attendance_upserted`, `hr.leave_created`, `hr.leave_approved`, `hr.salary_set`, `hr.payroll_generated` |

**Code:** `hr-service.ts` (capability gates), `hr-repository.ts` (transactional audit), HR API routes pass `buildAuditContext`.  
**Note:** Partners with `hr.manage` can call HR manage APIs; `/admin/hr` UI remains admin-portal-only until a later partner/manager surface (HR-2+).

---

### Phase HR-2 — Staff HR self-service (1–2 days) — **closes the biggest E2E hole** — **DONE 2026-08-07**

1. Add Staff nav: **HR** → `/staff/hr` (single page, tabs: Attendance | Leave — **not** a second payroll product).  
2. Attendance tab: clock in/out for **self** for today; history list (last 30 days).  
3. Leave tab: create request (types from contract); list own requests; status badges.  
4. Reuse `useHrCommands().createLeaveRequest` / `upsertAttendance` / filters `userId=me`.  
5. Empty states + confirm on clock-out.  
6. Playwright: staff sign-in → submit leave → appears pending.

**Exit:** Staff can create leave without admin API tools; admin still reviews on `/admin/hr`.

#### HR-2 execution record

| Check | Result |
| --- | --- |
| Route | `/staff/hr` → `StaffHRPage` |
| Staff nav | Workspace → **HR** (`nav.hr`, `UserCog`) |
| Attendance | Self clock in/out; confirm on clock-out; last-30-day history |
| Leave | Create (contract types) + own list with status badges |
| List privacy | Non-`hr.manage` forced to own `userId` on attendance + leave list |
| `hr:verify-local` | **PASS** (`associateAttendanceScoped: true`) |
| Playwright | `tests/e2e/staff-hr.spec.ts` — staff submit leave → pending |

**Code:** `src/views/staff/StaffHRPage.tsx`, `src/app/(staff)/staff/hr/page.tsx`, staff layout nav, `hr-service` self-scope lists.

---

### Phase HR-3 — Admin HR ops console polish (1–2 days) — **DONE 2026-08-07**

Align with Users/Clients corporate pattern **without** inventing a fourth people model:

1. Attendance: date picker; table of staff × status; filters; CSV export; half-day control.  
2. Leave: table + filters (status/type); confirm dialogs; link to user name.  
3. Payroll: month label + export CSV; show salary set state clearly; keep calculator until HR-4.  
4. KPI strip keep/refine (present, absent, on leave, pending).  
5. Deep links: Users drawer already → HR; from HR row → `/admin/users` optional.

**Exit:** Admin can operate a past date and export; no card sprawl for primary lists.

#### HR-3 execution record

| Check | Result |
| --- | --- |
| Attendance | Date picker; table; search + status filter; Present / Half day / Absent / Clock out; CSV |
| Leave | Table; search + status/type filters; confirm approve/reject; name → `/admin/users` |
| Payroll | Preview table + CSV; salary table with Set / Not set badges |
| KPIs | Present, Absent, On Leave/Half, Pending (keyed to selected attendance date) |
| `hr:verify-local` | **PASS** (API unchanged) |

**Code:** `src/views/admin/AdminHRPage.tsx` rewritten in place (no second admin HR page).

---

### Phase HR-4 — Leave policy + attendance sync (1–2 days) — **DONE 2026-08-07**

1. Minimal `leave_balances` (or settings JSON per firm) for annual/sick defaults.  
2. On create: reject if exceeds balance (when balance configured).  
3. On approve: upsert attendance `leave` for each date in range (skip weekends optional flag).  
4. Admin UI: view/adjust balance (simple).  

**Exit:** Approve leave affects attendance calendar; balance enforced when configured.

#### HR-4 execution record

| Check | Result |
| --- | --- |
| Schema | `leave_balances` + migration `0012_leave_balances` |
| Defaults | Firm policy defaults annual 18 / sick 12 (`hrLeavePolicy` / built-in default) |
| Create gate | Insufficient balance → 400 when type has entitled days |
| Approve sync | Attendance rows `status=leave` for charge days (weekends skipped by default) |
| Admin UI | Leave tab → balances table with adjust/save |
| Staff UI | Leave tab → remaining / used / pending chips |
| API | `GET/POST /api/v1/hr/leave-balances` |
| `hr:verify-local` | **PASS** (`leaveAttendanceSynced`, `leaveBalanceEnforced`) |
| Unit | `tests/unit/leave-days.test.ts` PASS |

**Code:** `hr-repository` / `hr-service`, `shared/hr/leave-days.ts`, Admin + Staff HR pages.

---

### Phase HR-5 — Payroll runs (2 days) — **DONE 2026-08-07**

1. Schema: `payroll_runs` + `payroll_run_lines` (firm, periodStart/End, status draft/final, amounts snapshot).  
2. `POST /api/v1/hr/payroll/runs` generate from base salary ± documented deductions.  
3. Admin: generate run → review → finalize (immutable).  
4. Staff: view own finalized payslip line (read-only) on `/staff/hr` Payslips tab.  
5. PDF optional — HTML print view first (no separate PDF module).

**Exit:** Regenerating GET no longer the only payroll artifact; at least one finalized run on localhost.

#### HR-5 execution record

| Check | Result |
| --- | --- |
| Schema | `payroll_runs` / `payroll_run_lines` + enum `payroll_run_status`; migration `0013_payroll_runs` |
| APIs | `GET/POST /api/v1/hr/payroll/runs`, `GET .../runs/[id]`, `POST .../finalize`, `GET .../payslips` |
| Authz | Manage paths require `hr.manage`; staff sees own finalized payslips only |
| Admin UI | Payroll tab: generate draft by month, list/view lines, finalize confirm |
| Staff UI | Payslips tab + print |
| `hr:verify-local` | **PASS** (`payrollRunFinalized`, `staffPayslipVisible`) |
| Note | If `db:migrate` skips 0013, journal `when` must be &gt; last `__drizzle_migrations.created_at` (manual apply + record used once locally) |

**Code:** `hr-repository` / `hr-service`, contracts + client queries, Admin + Staff HR pages.

---

### Phase HR-6 — Notifications & production checklist (1 day) — **DONE 2026-08-07**

1. In-app notification on leave submit (to users with `hr.manage`) and on decision (to requester).  
2. Email via existing communications path where Mailpit/local SMTP already used.  
3. Document TZ = Asia/Kathmandu for clock strings.  
4. Playwright admin + staff HR specs; update `PHASE_8_11_HR.md` status from “authority migrated” to “product phases HR-1…HR-6 done”.  
5. Cross-link production auth checklist; no Mailpit copy in production hosts.

**Exit:** E2E green; docs updated; localhost demo path documented.

#### HR-6 execution record

| Check | Result |
| --- | --- |
| In-app | Leave submit → managers with `hr.manage`; decision → requester (`type: system`) |
| Email | Durable `communication.email` jobs (same path as identity/Mailpit local) |
| TZ | `src/shared/hr/timezone.ts` — Asia/Kathmandu / UTC+05:45 for clock parse/format |
| E2E | `tests/e2e/staff-hr.spec.ts`, `tests/e2e/admin-hr.spec.ts` |
| Docs | `PHASE_8_11_HR.md` product phases done; cross-link `PHASE_AUTH_7_PRODUCTION.md` |
| `hr:verify-local` | **PASS** (`leaveSubmitNotified`, `leaveDecisionNotified`) |

**Code:** `src/server/services/hr-notifications.ts` wired from `HrService`.

---

## 8. Suggested build order (next actions)

```text
HR-0 baseline verify
HR-1 authz + audit (P0)
HR-2 staff /staff/hr self-service
HR-3 admin console polish (date/filter/export/table)
HR-4 leave balances + attendance sync
HR-5 payroll runs + staff payslip read
HR-6 notifications + E2E + docs
```

Do **not** start HR-5 before HR-1/HR-2 (would polish a calculator while leave E2E remains broken).

---

## 9. File inventory (canonical — reuse these)

| Layer | Path |
| --- | --- |
| Admin UI | `src/views/admin/AdminHRPage.tsx` |
| Admin route | `src/app/(admin)/admin/hr/page.tsx` |
| Staff UI | `src/views/staff/StaffHRPage.tsx` + `src/app/(staff)/staff/hr/` |
| Queries | `src/client/queries/hr.ts` |
| Contracts | `src/shared/contracts/hr.ts` |
| Service | `src/server/services/hr-service.ts` |
| Repository | `src/server/repositories/hr-repository.ts` |
| Routes | `src/app/api/v1/hr/**` |
| Schema | `db/schema.ts` → `attendance`, `leave_requests`, `leave_balances`, `payroll_runs`, `payroll_run_lines`, `users.baseSalary` |
| Verify | `scripts/hr/verify-local.ts` → `npm run hr:verify-local` |
| Migration note | `doc/migration/PHASE_8_11_HR.md` |

---

## 10. Owner checkpoint

| Question | Answer |
| --- | --- |
| Is `/admin/hr` duplicated by `/admin/users` or `/admin/clients`? | **No** — Users = identity; Clients = CRM; HR = attendance/leave/pay for **staff identities** |
| Is staff portal HR done? | **Yes for attendance + leave + payslips** (HR-2/HR-5); notifications still HR-6 |
| Is backend “complete_local”? | **Yes** for Convex→Next authority (`PHASE_8_11_HR.md`) |
| Is product corporate-grade? | **HR product track complete on localhost (HR-0…HR-6)**; further polish optional |
| Risk of wrong work? | Building ATS/careers into HR, or a second leave API — **forbidden** |

---

**Report status:** HR-0…HR-6 executed on localhost. Authority + product upgrade track closed for the audit scope.
