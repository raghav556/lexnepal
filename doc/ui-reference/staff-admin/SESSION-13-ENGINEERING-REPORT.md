# Session 13 engineering report — Premium Staff Clients

Worktree: `D:\lexnepal\.local\worktrees\ui-staff-admin-upgrade`
Branch: `ui/staff-admin-upgrade`
Base HEAD at start: `09128eb25d321559c8997eb4843b61e269313882`
No commit, push, merge, or deploy.

## Changed paths

- `src/app/(staff)/staff/clients/page.tsx` — Staff route now renders the new workspace.
- `src/views/staff/StaffClientsWorkspace.tsx` — new Staff Clients presentation.
- `src/views/staff/staff-clients-model.ts` — list, KPI, CSV, and payload rules.
- `src/index.css` — Staff Clients hero, compact metrics, list, profile, and dialog styles.
- `tests/unit/staff-clients-model.test.ts` — focused model tests.
- `doc/ui-reference/staff-admin/SESSION-13-ENGINEERING-REPORT.md` — this report.

Screenshots are under `.local/qa/session-13/` and are not part of the git tree.

Not changed: `src/views/staff/StaffClientsPage.tsx`, `src/app/(admin)/admin/clients/page.tsx`, Client Portal, database schema, and permission code. The Session 08 report remains the pre-existing line-ending difference only.

## Staff / Admin isolation

Admin and Staff previously shared `StaffClientsPage`. That component is unchanged and `/admin/clients` still imports it. `/staff/clients` imports `StaffClientsWorkspace` only. A mocked browser check of `/admin/clients` found the existing “New client” action and zero `.staff-clients-workspace` nodes. No Admin write was issued.

## API connections

The workspace uses the existing clients, cases, appointments, session, and KYC clients. It does not add endpoints or fields.

- `GET/POST /api/v1/clients` and `PATCH /api/v1/clients/:id` through `useClientCommands` and the shared clients query key.
- `GET /api/v1/cases` through `useCasesQuery`. Matter counts and the practice-area filter use only matters this signed-in user can already list.
- `GET /api/v1/appointments?clientId=` for the next non-cancelled, non-completed appointment on or after today.
- `GET /api/v1/auth/session` for `clients.manage` and `kyc.review`.
- `POST /api/v1/clients/:id/portal-access` only when `clients.manage` is present.
- `GET /api/v1/clients/:id/kyc-files` and `POST /api/v1/clients/:id/kyc-review` only after a user with `kyc.review` opens KYC. National ID numbers are not shown. The list API already strips `kycIdNumber`.

Create and update bodies are checked with `clientCreateSchema` and `clientStaffUpdateSchema` before the request. Empty optional create fields are omitted. An individual update clears company and registration. Failed validation or a failed response keeps the typed values and does not show a success toast. A lock blocks a second create or save while one is in flight.

## Supported reference features

- Existing Staff sidebar and top bar.
- Nepal mountain hero, navy and gold title, compact shared metric cards.
- Add client sits in the list toolbar, under the hero, and opens the real create dialog.
- Search across name, email, phone, address, and company.
- Status chips for all, active, and inactive.
- Filters for individual/corporate, KYC status, portal linkage, and matter practice area.
- Ten clients per page, with numbered pagination.
- Client identity, initials, contact line, type, KYC, portal, visible active-matter count, and active/inactive status.
- View opens a right-hand profile on desktop and a drawer under the top bar on a narrow screen. The mobile bottom navigation stays reachable.
- Edit, deactivate/reactivate, and portal grant or resend require `clients.manage` and confirm destructive or invite actions.
- Linked matters link to `/staff/cases/:id`. Appointments link to `/staff/appointments`.
- CSV export of the filtered rows the user can see. Columns are name, type, email, phone, address, company, registration, KYC, portal linked/none, active matters, and status. It does not include account ids, notes, billing, owners, or activity.

## Omitted reference features

- New Intake. Intake links belong to CRM leads (`/intake/:token`), not to a client record. There is no authorized client-directory intake action, so the button is absent.
- Billing status, payment indicators, and billing fields.
- Percentage trends.
- Relationship owner and assigned-lawyer columns. Clients have no owner field.
- Last-activity sort or timeline. Clients have no activity feed.
- Prospective status. The directory statuses are active/inactive plus KYC `pending`, `submitted`, `verified`, and `rejected`.
- National ID and KYC files for users without `kyc.review`.
- “New this month” is a count of `createdAt` in the current calendar month, not a trend. “KYC pending” counts `kycStatus === "pending"` only. Submitted KYC is a filter and, for reviewers, the Review KYC action.

## Permission checks

- `clients.view_all` is required by the existing list API. The page shows that error and a manual retry.
- `clients.manage` shows Add client, Edit, deactivate/reactivate, and portal grant/resend. The local associate role has this capability and does not have `kyc.review`.
- `kyc.review` shows Review KYC for submitted records and View KYC files for submitted, verified, or rejected records. Partner and senior associate have it in the default matrix. Opening the dialog loads files. Approving or rejecting is a separate confirmed action and was not sent during QA.
- Matter counts can be lower for a user who cannot list every case. The KPI says the count is the visible active matters.

## Final UI corrections

Technical Lead approved the hero, KPIs, list behavior, profile content, and Staff/Admin split. Three presentation fixes followed.

1. Desktop profile. The list column was switching to phone cards whenever it became narrower than 62rem, which happened as soon as the profile opened at 1440px. That container rule is gone. At 1440px and wider the profile stays on the right, the client rows stay in a table, and the filters stay on a compact multi-column grid. Below 1440px the same profile opens as the existing drawer so the list is not squeezed. Profile API behavior is unchanged.
2. Mobile cards. Type, KYC, portal, active matters, and active/inactive status now have visible labels. View, Edit, pagination, and the bottom navigation are unchanged.
3. Add Client dialog. After the open animation settled, computed style was opacity `1`, background `rgb(255, 255, 255)`, and animation `none`. The earlier translucent capture was timing. No further dialog CSS change was made. The settled screenshot keeps the entered name, shows the phone validation message, and shows Cancel and Add client.

Final-review screenshots:

- `.local/qa/session-13/final-review/01-desktop-profile.png`
- `.local/qa/session-13/final-review/02-mobile-list.png`
- `.local/qa/session-13/final-review/03-add-client-dialog.png`

Measured at 1440px with the profile open: table header display `grid`, filter tracks `295.641px 211.172px 211.188px`, profile position `sticky`, horizontal overflow `0`. At 390px the table header is hidden, card labels are visible, the drawer is `fixed`, and horizontal overflow is `0`. An over-long phone still makes no create request. Admin Clients still shows New client, does not render `.staff-clients-workspace`, and issued no writes.

## Verification

- `npx vitest run tests/unit/staff-clients-model.test.ts` — 5 passed, including after the layout correction.
- ESLint on `StaffClientsWorkspace.tsx` after the mobile-label change — exit 0.
- `npx tsc --noEmit` after the layout correction — exit 0.
- Mocked browser QA on the worktree server at port 3001. Writes were intercepted. Results: invalid 51-character phone made 0 create requests and kept the name; a mocked 400 kept the form and did not toast success; one successful create sent `type: "individual"` without a company; one profile save sent the edited phone and `companyName: null`; inactive filter and address search hid non-matches; page 2 showed the later mock clients; KYC files were requested once, only after Review KYC with `kyc.review`; no KYC decision was posted; Admin issued no writes. Horizontal overflow was 0 at 1440, 390, and 360.
- Screenshots: `01-desktop-light.png`, `02-desktop-dark.png`, `03-desktop-profile.png`, `04-mobile-list.png`, `05-mobile-profile.png`, `06-create-client.png`.

Browser mutations were mocked. Live create, edit, deactivate, portal invite, and KYC review were not run against the real API for this checkpoint. The local dev server can stop answering when it reaches the existing 4 GB heap cap; that cap was not raised, and warmup stays skipped. Two unrelated public CMS asset 404s still appear in the dev log and were not investigated.

## Git status

Session 08’s line-ending warning is still the only unrelated dirty file. It was not staged or reset. Original checkout `D:\lexnepal` remains `main`. No commit was created.
