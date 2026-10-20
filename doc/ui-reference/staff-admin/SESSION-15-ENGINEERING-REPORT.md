# Session 15 — Premium Staff Appointments

Date: 2026-10-20 (Asia/Kathmandu). Ready for Technical Lead visual approval.

Implemented `/staff/appointments` against the approved image: Nepal mountain hero, navy/gold branding, compact KPIs, bounded appointment list, Day/Week/Month calendar, selected appointment details, and working booking actions. Narrow tablets through 1000px and mobile use List / Calendar switching with the existing details dialog. Wider tablets retain two panels; desktop retains three columns. The approved design is preserved.

## Safety

- Verified worktree: `D:\lexnepal\.local\worktrees\ui-staff-admin-upgrade`.
- Branch: `ui/staff-admin-upgrade`.
- Initial and final HEAD: `a453126bdcfe3f377e88c5419c8e61cc527fbce5`.
- Read `AGENTS.md` and the installed Next.js client-component and Link guides before implementation.
- The existing modification to `SESSION-08-ENGINEERING-REPORT.md` was present at entry and left untouched.
- No database data changes, owner-data mutations, deployment changes, commits, pushes, merges, or deployments. Session 16 was not started.

## Exact changed/new paths

Changed:

- `src/views/staff/StaffAppointmentsPage.tsx`
- `src/views/staff/StaffCRMPage.tsx` — switch only the consultation creation hook to authenticated Staff creation.
- `src/client/queries/crm.ts` — authenticated Staff creation hook and optional query enablement; existing public/Client mutations preserved.
- `src/components/crm/MeetingLinkDialog.tsx` — accessible dialog name only.
- `src/index.css` — scoped Staff appointment styling.
- `tests/e2e/staff-appointments.spec.ts` — update the existing heading assertion for the new title.

New:

- `src/views/staff/StaffAppointmentCalendar.tsx`
- `src/views/staff/StaffAppointmentBookingDialog.tsx`
- `src/views/staff/staff-appointments-model.ts`
- `tests/unit/staff-appointments-model.test.ts`
- `tests/staff-appointments/adapters.tsx`
- `tests/staff-appointments/fixture.tsx`
- `scripts/qa/verify-staff-appointments.mjs`
- `doc/ui-reference/staff-admin/SESSION-15-ENGINEERING-REPORT.md`

## Components and behavior

Reused `PortalPageShell`, its `MetricCard` composition, `DashboardSection`, `StatusBadge`, `DashboardButton`, shared Dialog/Select/Input/Label/Textarea primitives, `MeetingLinkDialog`, Lucide icons, the existing Staff shell, Nepal image, dashboard tokens, appointment schemas, date utilities, canonical slots, and query invalidation.

New typed calendar and booking-dialog components isolate scheduling UI. The appointment model handles chronological slot sorting, filtering, KPIs, initials, Monday-based week/month grids, and month-end navigation.

- Listings always request the signed-in staff assignee; requests wait for identity. No All Staff control is exposed.
- Today counts pending/confirmed appointments on the Kathmandu date. Upcoming counts active appointments after today. Pending counts all pending records. Completed this month uses appointment dates because the API has no completion timestamp. Labels explain these rules; failed listings show unavailable metrics.
- Calendar Day shows canonical start slots and actual appointments, including multiple records at a slot. Week shows the complete week agenda and real date counts. Month provides a six-week date grid and selected-day agenda. Dates support arrow keys, Home/End, Enter, Today, and previous/next navigation.
- New Appointment validates with `appointmentCreateSchema`, canonical available slots, required contact/practice fields, and today/future dates. Permitted clients and assigned leads populate real IDs/contact data. The signed-in staff user is the assignee.
- Both Staff creation entry points use `useStaffAppointmentCreate`; a 401 never falls back to `/public/appointments`. Public/Client behavior is unchanged.
- Reschedule uses `appointmentRescheduleSchema`, available slots, a different date/slot, and an explicit review/confirmation step.
- Successful mutations invalidate real CRM queries and retain/select the affected record. Failed requests retain booking input and provide truthful feedback.
- Pending supports Confirm, Reschedule, Add Meeting Link, and Cancel. Confirmed supports Mark Completed, Reschedule, Add Meeting Link when missing, and Cancel. Adding a link follows the existing confirmation workflow. Valid links on active appointments support Copy Link and Join. Completed/cancelled appointments do not expose active actions.
- Open Client appears only for a real `clientId`, using the existing `/staff/clients?client=` route. Deep links to `/staff/appointments?appointment=` select the authorized record and its date; unavailable IDs display an explanatory state.
- List, calendar, and details use internal scrolling. Dialogs support focus trapping, Escape, Back, and focus recovery. Mobile content clears the existing bottom navigation.

## Reference features intentionally omitted

No invented percentage changes, durations/end times, physical locations, participants, appointment types, matter links, related records, unsupported Edit controls, or fictional statuses. No Staff Team Chat or Command Center was reintroduced. Admin and Client presentation files were not changed.

## Verification

Passed:

- Focused ESLint on all changed/new TypeScript, TSX, and QA JavaScript files: zero errors/warnings.
- `npx tsc --noEmit`: exit 0.
- `npx vitest run tests/unit/staff-appointments-model.test.ts tests/unit/crm-contracts.test.ts tests/unit/cui-12-client-appointments-contract.test.ts tests/unit/client-appointment-booking-auth.test.ts tests/unit/staff-crm-model.test.ts --maxWorkers=1`: **5 files, 33 tests passed**, including 13 appointment model tests after the TL correction.
- `node scripts/qa/verify-staff-appointments.mjs`: **10 grouped browser checks passed**, zero browser exceptions, **17 axe WCAG A/AA scans with zero reported violations** after the TL correction.
- Real component/browser bundle compiled successfully with esbuild and the repository Tailwind/PostCSS pipeline.
- `git diff --check`: passed.

Browser checks used Chromium at **1440, 1280, 768, 390, and 360**, in **light and dark**. They covered search/status/tabs/date filtering; Day/Week/Month controls and keyboard focus; list/calendar selection; details; create; reschedule review; confirm/complete/cancel; meeting URL validation/save/copy/Join target; invalid fields; 401/403/409 handling; retained drafts; missing optional data; deep links; loading/empty/error/retry states; failed slot queries; permitted lead booking; 150-record internal scrolling; horizontal clipping; mobile switching, Escape, and focus recovery. The actual Admin and Client appointment components were also rendered to check composition isolation.

The browser fixture uses the actual Staff layout, production components, appointment hooks, and API client. Identity/routing/idle boundaries are adapted. **Every API request is intercepted**, with synthetic records and mutations stored only in browser-test memory. The recorded 12 mutation attempts include intentional failures; no real appointment was created or changed.

API actions exercised through the real client code with interception:

| Action | Endpoint |
| --- | --- |
| Authorized list/refetch | `GET /api/v1/appointments?assignedLawyerId=…` |
| Availability | `GET /api/v1/appointments/slots` |
| Create | `POST /api/v1/appointments` |
| Confirm/complete/cancel/meeting link | `PATCH /api/v1/appointments/:id/status` |
| Reschedule | `POST /api/v1/appointments/:id/reschedule` |
| Permitted contacts | `GET /api/v1/clients`, `GET /api/v1/leads?assignedTo=…` |

## Screenshots and reproducible evidence

Ignored directory: `.local/qa/session-15/final-review/`.

1. `01-desktop-light-1440.png`
2. `02-desktop-dark-1440.png`
3. `03-selected-appointment-details.png`
4. `04-new-appointment-dialog.png`
5. `05-reschedule-dialog.png`
6. `06a-calendar-week.png` and `06b-calendar-month.png`
7. `07-mobile-list.png`
8. `08-mobile-appointment-details.png`

Additional `responsive-{width}-{theme}.png` captures cover every required width/theme pair. `evidence.json` records checks, intercepted requests, browser errors, and axe results. Original logs are `.local/qa/session-15-browser.log`, `session-15-eslint.log`, `session-15-tsc.log`, and `session-15-unit.log` under `.local/qa/`. The TL correction logs use the `session-15-tl-` prefix.

## TL final correction — checkpoint review

The stale Month details defect was caused by resolving `selectedId` against all loaded appointments. The selected ID could still resolve to Ramesh on Oct 20 after the visible date/list moved to Nabin on Oct 21.

- Selection now resolves strictly within filtered list results. Valid selections are retained; invalid selections choose an active visible record (or another visible record) and empty results clear selection/actions. The stored ID is reconciled too, so removing a filter cannot resurrect an old hidden selection.
- Automatically selected records and explicit list/calendar selections align the calendar date to the actual appointment date. Calendar event selection switches to that date's list. Search, status, and history/upcoming filters also constrain calendar records and counts.
- Day/Week/Month view changes preserve a valid selection. Date controls select the requested day's results. Deep-link parameter changes reset conflicting filters and navigate to the authorized record's actual date; removing and restoring the same parameter works as well. Unchanged deep links do not override subsequent manual filtering.
- At 768–1000px, the existing accessible List / Calendar switcher shows one full-width panel at a time. The details dialog remains available from both panels. Wider layouts and mobile styling are preserved.

Correction-only paths: `src/views/staff/StaffAppointmentsPage.tsx`, `src/views/staff/StaffAppointmentCalendar.tsx`, `src/views/staff/staff-appointments-model.ts`, `src/index.css`, `tests/unit/staff-appointments-model.test.ts`, `scripts/qa/verify-staff-appointments.mjs`, and this report. No Admin/Client UI or Session 08 report edits were made for this correction.

Four added unit regressions cover date/empty-day selection, valid selection across view changes, search/status/tab exclusion, and authorized deep-link selection including completed/cancelled records. Browser regressions verify the actual state transitions, disappearance of stale actions, preserved valid selections, cross-day Week event selection, repeated/in-place deep links, and both tablet panels/details access. All mutations remain intercepted synthetic requests.

Required correction captures, under `.local/qa/session-15/final-review/`:

1. `tl-01-desktop-month-oct21-synchronized.png` — Oct 21, Nabin selected in calendar/list/details.
2. `tl-02-desktop-deep-link-selection.png` — authorized deep link selects Nabin and Oct 21.
3. `tl-03-tablet-list-768.png` — full-width appointment list with switcher.
4. `tl-04-tablet-calendar-768.png` — full-width calendar with switcher.

The original `06b-calendar-month.png` was also regenerated with matching list/details selection. Correction logs: `.local/qa/session-15-tl-unit.log`, `.local/qa/session-15-tl-browser.log`, `.local/qa/session-15-tl-eslint.log`, `.local/qa/session-15-tl-tsc.log`. No production build or live appointment mutation was performed. Stop for TL checkpoint review.

## Limitations and approval boundary

- Browser QA is an isolated actual-component fixture, not a live authenticated Next.js session. The dev preview was subsequently started on port 3001 and is left available. The existing Staff login E2E and seeded Client E2E were not executed against real auth/data: the Client suite contains an unmocked booking mutation. Their contract/unit coverage passed; the Staff E2E title assertion was updated during the initial implementation.
- No Next.js production build was run, consistent with the memory constraints and avoiding an unnecessary build. TypeScript and the browser component/CSS bundle passed.
- Axe scans supplement the manual visual/keyboard checks; they are not a blanket accessibility certification.
- Server persistence, notification delivery, and a real external meeting provider were not exercised. Join URL/target and clipboard copying were verified locally.
- Technical Lead visual approval remains outstanding. Stop here; do not commit or begin Session 16.

## Final Git status

```text
 M doc/ui-reference/staff-admin/SESSION-08-ENGINEERING-REPORT.md
 M src/client/queries/crm.ts
 M src/components/crm/MeetingLinkDialog.tsx
 M src/index.css
 M src/views/staff/StaffAppointmentsPage.tsx
 M src/views/staff/StaffCRMPage.tsx
 M tests/e2e/staff-appointments.spec.ts
?? doc/ui-reference/staff-admin/SESSION-15-ENGINEERING-REPORT.md
?? scripts/qa/verify-staff-appointments.mjs
?? src/views/staff/StaffAppointmentBookingDialog.tsx
?? src/views/staff/StaffAppointmentCalendar.tsx
?? src/views/staff/staff-appointments-model.ts
?? tests/staff-appointments/
?? tests/unit/staff-appointments-model.test.ts
```

Session 08 is the pre-existing change. All Session 15 changes remain uncommitted.
