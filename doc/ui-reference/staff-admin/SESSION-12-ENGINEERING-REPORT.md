# Session 12 — Premium Staff CRM

Worktree `.local/worktrees/ui-staff-admin-upgrade`, branch `ui/staff-admin-upgrade`, base HEAD `e2f5e213c49de7fa6a32f0b671f65baec39c467a`. Not committed.

## Changed files

| File | Change |
| --- | --- |
| `src/views/staff/StaffCRMPage.tsx` | Isolated Staff CRM list. No longer renders Admin CRM. |
| `src/views/staff/staff-crm-model.ts` | Lead stage labels, filters, KPI counts, initials, and CSV rows. |
| `src/index.css` | Scoped `.staff-crm-*` layout only. |
| `tests/unit/staff-crm-model.test.ts` | Stage counts, filters, and CSV shape. |
| `doc/ui-reference/staff-admin/SESSION-12-ENGINEERING-REPORT.md` | This report. |

`SESSION-08-ENGINEERING-REPORT.md` remains an unstaged line-ending difference and was not edited. Admin CRM, Client Portal, permissions, schema, and conversion rules were not changed.

## What the page does

Staff CRM is a list. There is no Kanban, board column, drag handle, or board/list switch. Admin CRM still owns those views.

The page reads `GET /api/v1/leads` and `GET /api/v1/appointments`. Search by name, email, and phone uses the existing `q` query. Source and assignee filters use the existing list filters. The server still forces a non-manager to their own assigned leads. Practice area and stage tabs filter that permitted list in the browser.

Stages are the existing lead statuses: New, Contacted, Consultation scheduled, Converted, and Lost. KPIs count those same rows. There are no percentage changes.

View opens a lead read-only. Edit can change stage and notes. A manager can also reassign. Anyone who can open the lead can save notes, copy an intake link, and schedule a consultation through `POST /api/v1/appointments` and `GET /api/v1/appointments/slots`. Linked consultations come from the appointments list for that lead and open `/staff/appointments`. Convert uses `POST /api/v1/leads/:id/convert` and is shown only when the session has `clients.manage`. Export writes the visible lead rows to CSV. Pagination is 8 rows and resets when the filters change.

## Not in the reference image

The approved picture shows All Contacts, Clients, Leads, and Prospects, company names, last-activity text, next follow-up dates, and month-over-month percentages. Those are not lead fields and are not shown. Client records stay on `/staff/clients`. A corporate company name is collected only in the existing convert dialog.

## Design correction

Staff CRM already passed its counts through `PortalPageShell` and the shared `MetricCard`. The cards looked oversized because only Content Studio had the compact horizontal metric rules. Those same rules now also apply to `.staff-crm-metrics`: icon on the left, label, value, and helper in one row, about 106px tall. No second card component was added. Dark mode sets the card background and text from the dashboard panel and foreground tokens. Dialogs use an opaque panel, no entrance animation, and scroll inside the viewport.

The live zero is a real empty list. The local staff account is an associate, and that firm has no lead rows at all, including none assigned to that user and none unassigned. The page does not replace that zero with sample numbers.

A browser pass with intercepted writes checked the list, stage tab, search, create, and the hidden convert/assignee controls when `clients.manage` is absent. Document overflow was 0 at 1440, 768, 390, and 360. `eslint` passed, `tsc --noEmit` passed, and the list-model tests passed, 3/3. Admin CRM was not edited.

Review screenshots:

- `.local/qa/session-12/final-review/01-desktop-light.png`
- `.local/qa/session-12/final-review/02-desktop-dark.png`
- `.local/qa/session-12/final-review/03-mobile-kpis.png`
- `.local/qa/session-12/final-review/04-mobile-rows.png`
- `.local/qa/session-12/final-review/05-lead-details.png`
- `.local/qa/session-12/final-review/06-add-lead.png`

## New Lead form

Focus jumped to Full name because the shared dialog restarted its focus trap whenever the open-change callback identity changed. Typing called `setState`, the effect cleaned up, and the cleanup moved focus back to the first field. The trap still runs when the dialog opens and still handles Tab and Escape. It no longer restarts while the dialog stays open.

Create Lead showed “Request validation failed” because `leadCreateSchema.parse` rejects the body and the handler keeps only that sentence. The schema rejects `assignedTo: "unassigned"`, a source label such as `Walk-in`, a phone longer than 40 characters, and a name longer than 200. The owner’s original request body was not in the logs. The form now checks the payload with that same schema before posting. Unassigned is sent as `null`, Walk-in as `walk_in`, and empty optional fields are omitted. A rejected field is named, for example “Phone must be 40 characters or fewer.” The typed values stay on the form. A second click does not send another POST while the first is in flight.

A browser regression typed the name, pasted the email, phone, notes, and message, and kept focus on each field. One mocked POST used `source: "walk_in"` and `assignedTo: null`, with the line breaks intact. A mocked 400 named Phone and kept the form. A mocked 500 kept the form and did not show success. List-model tests passed, 4/4. `eslint` and `tsc --noEmit` passed.

The shared dialog change is only that the focus trap depends on whether the dialog is open, not on a new callback each render. Escape still closes it, Tab and Shift+Tab stay inside it, and focus returns to the button that opened it. The same behavior held for New Lead, Staff “Add hearing”, and Admin “Invite user”. A native select can swallow one Escape; after focus leaves that select, Escape closes the hearing dialog. Page scroll stays locked while a dialog is open, and the page behind it does not navigate.

The screenshot that showed a Phone error and “Lead created” together was one Sonner toast left on screen from an earlier successful mock in the same page. From a clean page, an over-long phone shows only the Phone error and sends no POST. A mocked 400 sends one POST, keeps the form, and does not show success. A mocked 500 does the same. A mocked 201 sends one POST, shows success, and closes the dialog.

View opens the lead read-only. Edit can change stage and notes; those PATCH bodies are `status` and `notes`. Consultation booking posts the lead id, date, and slot. Intake copy uses the token from the API response. CSV export contains only the visible lead rows. Without `clients.manage`, Convert and assignee controls are absent. With it, Convert is available. Typing and pasting a new lead at 390px kept each value in its field.

The owner confirmed that a real Create Lead now succeeds. After that create, the authorized staff list shows one lead, Niraj Yadav, with status converted. The earlier empty list was the state before that create. Live status updates, notes, consultation booking, intake copy, conversion, and CSV export were not repeated against the live API after that create. Those paths were verified with intercepted writes only.

## Dev server

`TypeError: Failed to fetch` in `fetchServerResponse` / `navigateToUnknownRoute` came from the local webpack dev server, not from a missing CRM route. The process on port 3001 stopped answering `/api/v1/health` and the Staff pages while it sat near its 4 GB heap limit. That process was stopped and one replacement was started with the same webpack command and the same heap limit. Warmup was skipped so the first compile would not fill the heap again. Health, CRM, Clients, and Appointments then returned 200. Signed-in navigation CRM → Clients → Appointments → CRM, plus a refresh, did not raise `Failed to fetch`. One superseded CRM data request was aborted while the next page loaded. The server was using about 3.1 GB afterward and was still answering. The same 4 GB cap can be exhausted again if the dev server compiles too much at once.

During that navigation, two public CMS asset requests returned 404 because those asset objects were not found. They are unrelated to the CRM routes and were not investigated further.

Screenshots: `.local/qa/session-12/form-fix/`.

**Do not commit, push, merge, deploy, or start Session 13.**
