# Session 17A — Account, profile and public portal

2026-10-21, Asia/Kathmandu. Implemented for owner/TL review. Nothing staged or committed.

## Safety and baseline

Worktree: `D:\lexnepal\.local\worktrees\ui-staff-admin-upgrade`. Branch: `ui/staff-admin-upgrade`. Local and independently queried origin feature-branch HEAD: `a4a89096df52dcb744d15ed435a23b7bd96d141b`. Origin: `https://github.com/raghav556/lexnepal.git`. Git identity was verified before implementation.

Read AGENTS.md, the installed Next.js client-component guide, and the Client source-of-truth Markdown and authoritative DOCX. The explicit Session 17A account relocation supersedes the older Client topbar-account placement rule; Client Support and its distinct profile overview are retained.

Session 08 remains untouched and unstaged, SHA-256 `1ACEB9535586A43197F561057EEC9DB9409CAB5F12994629C43F86F5FE7BC78E`. Reused localhost:3001. No original-checkout edits, dependencies, database operations, staging, commits, pushes, merges, deployments or production build.

## Delivered work

| Workstream | Result |
| --- | --- |
| A — Account and language | Shared account identity/actions in existing sidebar/drawer footers. Client desktop account moved out of the topbar alongside preserved Client Support. One visible header language control per responsive mode, using existing EN/Nepali state and persistence. |
| B — Profile and settings | Staff/Admin identity hero, Nepal image, real membership/role, existing professional cards, settings navigation and aligned general form. Client account overview retained. Existing password, TOTP, avatar, session and export commands remain connected. |
| C — Public My Portal | Opaque scoped menu, viewport collision handling, role-correct Open Portal, loading/anonymous/authenticated states, sign-out failure/retry and keyboard/outside-click behavior. |

Account menus use existing DropdownMenu, Dialog, DashboardButton, identity hooks and i18n. New keyboard behavior is opt-in: arrows, Home/End, Enter, Escape and focus recovery. Collision positioning reuses `getFloatingPosition`; dashboard menus retain their portal variables when portaled. No Appearance, account switching or additional languages were invented.

Sign out everywhere confirms **other-session revocation followed by sign out here**. The existing self-service DELETE preserves the current session. Revocation failure no longer silently proceeds to local logout. Errors remain visible and actions prevent duplicate submission. Mobile confirmation stays inside its existing drawer rather than introducing a competing nested modal.

The shared auth SDK can return an error without rejecting its promise. A small opt-in `reportErrors` option now lets these interactive account controls retain identity/cache and show retry feedback on that result. Successful logout is unchanged. Existing idle/expiry callers retain their previous behavior; no cookie, endpoint, permission or server authorization changed. The hook type follows the context type. Four focused tests cover these distinctions.

Profile presentation reuses ProfileHero, StaffProfileExtras, AdminProfileExtras, ClientProfileOverview, DashboardSection, existing Tabs/forms, PasswordConfirmDialog, TotpEnrollmentPanel, SessionListPanel, pagination and branding. No parallel profile architecture was created. General save uses the existing Zod contract, preserves failed input and adds busy protection. Avatar feedback now accurately describes JPEG/PNG, 5 MB and scanning; upload intent, storage upload, completion and removal remain the existing flow. Password busy protection now applies to all profile variants.

Session revocations require confirmation, preserve the current session and refresh the existing queries. Staff/Admin audit actions have readable labels; raw action/details/IP require deliberate expansion. Client's existing restricted audit projection is preserved. Pagination remains. JSON export accurately describes the existing profile fields, without a GDPR/full-account-archive claim. Email/role and professional registration remain read-only. No unsupported professional-title editing, registration verification or visibility controls were added. Redundant profile-hero logout buttons were removed after footer account access was verified.

## Measured defects and narrow fixes

- Public menu before: computed background `rgba(0, 0, 0, 0)` and unset `--dashboard-panel`. Its dashboard surface classes were outside a dashboard root. The new `.public-account-menu` supplies local public surface/border/focus tokens; public pages receive no global dashboard theme.
- Keyboard QA caught insufficient dark public focus contrast: pale text on gold measured 2.41:1. Focus now pairs the existing accent background with `--accent-foreground`. Final scans include both Home/End focus states at 390 and 1440.
- Admin at 768 had a 496px content column with 684px horizontal scroll width. Compact Search and an accessible Live Site icon, flexible breadcrumbs and scoped tablet spacing reduce that header ancestor range to zero. Search callbacks, Create, notifications, Live Site and Command Center wiring remain intact. Desktop full labels/search remain available.
- Session 17 Staff navigation data, mobile drawer, tablet rail, twelve destinations/four groups and the positioned main scroll owner are unchanged. Staff layout only loses account-menu language props.

## API and isolation evidence

Existing commands continue through authenticated `/api/v1/users/me`, avatar intent/completion/removal, user/session DELETE and own-audit routes, plus the existing Better Auth password/TOTP/sign-out methods. `identity-service.ts` retains self/firm scoping and capability checks for other users. No API, contract, service, repository, role guard, schema or permission source changed.

| Area | Verification |
| --- | --- |
| Staff | All responsive account modes, twelve sidebar routes, no bottom bar, main containment, header language; Dashboard/Tasks/Clients/Documents footer and Top checks at 390/768/1440. |
| Admin | All responsive account modes, compact-header ancestor width at every tested size, original navigation/Command Center handlers retained; general save, password, sessions and privacy flows. |
| Client | Support retained, desktop header account removed, existing mobile navigation/More retained; distinct overview, name/phone save, password, sessions and privacy flows. No Client tests edited. |
| Public | All three role destinations across seven widths, actual Open Portal navigation at 1440, anonymous/loading states, logout error/retry, opaque menu, bounds, Escape/outside click and dark keyboard focus. |
| Internal workspaces | Research unsaved editor scroll retained; Messages history reading/composer and suppressed page Top verified at 390/1440. No message sent or draft saved. |

## Initial implementation QA results (before owner-review corrections)

- Focused Vitest: **7 files, 60 tests passed**. Includes 15 new command/auth-error tests and existing cached Client profile/KYC, floating-position, Staff navigation, identity, authentication and authorization coverage.
- Browser evidence: **97 consolidated checks, 22 axe scans with zero reported violations**, zero browser exceptions, **31 intercepted write requests**, zero live mutations. Browser: Chromium 151.0.7922.34.
- Matrix: Staff/Admin/Client × 360/390/768/1024/1280/1440/1704 × light/dark = 42 account/profile cases; short drawer checks use height 640. Other captures use height 900; internal workspace checks use 778.
- Focused ESLint, `npx tsc --noEmit`, and `git diff --check` pass. New files also receive separate trailing-whitespace/EOF checks.
- Independently rerun Client shell contract: **10 passed, 1 pre-existing failure** at line 150, expecting Staff `onOpenCommandCenter`. The committed baseline also lacks it. No assertion was changed, deleted, skipped or weakened. See `client-baseline.log` and `client-baseline-proof.json`.

Reproducible browser command: `node scripts/qa/verify-account-profile.mjs`. Evidence was completed using the matrix, focused workflow and targeted public-focus modes, avoiding unnecessary repeat browser matrices. `matrix.json` holds the 42 matrix cases; `evidence.json` consolidates final results. Logs: `matrix-verified.log`, `admin-matrix-final.log`, `flows-final.log`, `public-focus-final.log`, `unit.log`, `client-baseline.log`, `eslint.log`, `tsc.log`. The final public-focus log records the successful consolidated gate; the earlier workflow log retains the focus-contrast finding it corrected.

Focused unit command:

```text
npx vitest run tests/unit/session-17a-account-profile.test.ts tests/unit/cui-17-cached-profile-kyc.test.ts tests/unit/floating-position.test.ts tests/unit/staff-responsive-navigation.test.ts tests/unit/identity-contracts.test.ts tests/unit/authentication.test.ts tests/unit/authorization.test.ts --maxWorkers=1
```

Harness corrections included auth-shaped error responses, theme application after hydration, selecting the outer dashboard root, and native keyboard activation where the local Next development indicator obscured a footer trigger. No forced clicks or production overlays were hidden. Normal toast overlays were handled with keyboard interaction. These failed harness attempts are not represented as product passes. A separate measured keyboard contrast defect was fixed and rescanned.

## Screenshots

Ignored evidence root: `.local/qa/session-17a/`.

- Preferred final review captures: `final-staff-1440-light-profile.png`, `final-staff-1440-light-account.png`, `final-staff-390-dark-profile.png`, `final-staff-390-dark-account.png`, `final-staff-768-light-account.png`, `final-admin-768-dark-account.png`, `final-client-1440-light-account.png`, `final-client-390-dark-account.png`, `final-public-1440-light-menu.png`, `final-public-390-dark-menu.png`. These were refreshed after the final color correction; `final-captures.json` records their safety results.
- Before: `before-staff-profile.png`, `before-public-menu.png`, `before-public.json`.
- Staff desktop/profile: `staff-1440-light-profile.png`, `staff-1440-dark-profile.png`.
- Staff rail/account: `staff-768-light-account.png`, `staff-1024-dark-account.png`.
- Mobile: `staff-390-light-profile.png`, `staff-390-dark-account.png`, `staff-360-light-account.png`, `staff-390-short-account-confirm.png`.
- Admin: `admin-768-before-account-diagnostic.png`, `admin-768-dark-account.png`, `admin-1440-light-profile.png`.
- Client: `client-1440-light-account.png`, `client-1440-light-profile.png`, `client-390-dark-account.png`.
- Public: `public-1440-menu.png`, `public-390-menu.png`, `public-1440-dark-menu.png`, `public-390-dark-menu.png`, `public-loading.png`, `public-anonymous.png`.
- Functional/scroll: `totp-enrollment-synthetic.png`, `privacy-human-readable.png`, `staff-tasks-footer-390-dark.png`, `messages-390-reading-composer.png`, `research-390-unsaved-draft.png`.

The matching account filenames cover all seven widths and both themes. Screenshots use synthetic identities. Representative Staff desktop/mobile, Admin tablet and public dark captures were visually inspected.

## Limitations and separate logo finding

Real authenticated persistence, external storage promotion/scanning, password changes, MFA activation, revocations and notifications remain **unverified against live services**. All QA writes, including automatic message-read receipts and avatar storage, were intercepted. No full suite or production build is claimed. Axe scans supplement keyboard/visual checks; they do not certify the whole public website or every business workflow. Existing professional-card conditions were preserved, not independently certified against every live team-data permutation.

The configured public CMS logo asset returns HTTP 404. The existing shared branding component already has an error/emblem fallback, but the broken asset remains visible in some SSR captures. No CMS/branding data or logo source was changed. Restoring that asset is separate from the approved menu correction and would need its own authorization. No unrelated branding overhaul was attempted.

## Exact scope and proposed checkpoint allowlist

Only these **17 Session 17A paths** are proposed for a later owner-approved checkpoint; no checkpoint is performed here:

1. `src/app/(admin)/layout.tsx` — remove account language option.
2. `src/app/(client)/layout.tsx` — footer account relocation; retain Support.
3. `src/app/(staff)/layout.tsx` — remove account language option only.
4. `src/client/auth/auth-provider.tsx` — opt-in SDK error propagation.
5. `src/hooks/use-auth.ts` — preserve the context command's type.
6. `src/components/auth/PortalAccountMenu.tsx` — shared menu, confirmation and feedback.
7. `src/components/auth/PublicHeaderAuth.tsx` — scoped collision-aware public menu and logout feedback.
8. `src/components/dashboard/portal-topbar.tsx` — language, measured Admin compact-header fit, and Staff-only shared Create styling/keyboard opt-in.
9. `src/components/ui/dropdown-menu.tsx` — opt-in keyboard/focus behavior; existing primitive reused.
10. `src/index.css` — account/public/profile scopes, narrow Admin header rule and consistent Staff Create states.
11. `src/views/shared/SharedProfilePage.tsx` — shared presentation and preserved command states.
12. `src/views/shared/profile/ProfileHero.tsx` — real identity/brand hero.
13. `tests/unit/session-17a-account-profile.test.ts` — new isolated command/error regressions.
14. `scripts/qa/verify-account-profile.mjs` — new safe actual-route harness.
15. `doc/ui-reference/staff-admin/SESSION-17A-ENGINEERING-REPORT.md` — this report.
16. `src/components/auth/SessionListPanel.tsx` — shared current-session protection and six-other-session display pagination.
17. `tests/unit/session-list-pagination.test.ts` — isolated pagination boundary/render regressions.

No existing test file, navigation configuration, shared mobile navigation, other module, backend or dependency file changed. The two small auth-context/type changes are necessary for accurate interactive failure feedback while retaining idle/expiry behavior.

Tracked diff after owner-review corrections and Create audit: **13 files, 842 insertions / 490 deletions**. The four new QA/test/report files are excluded from that tracked statistic. Session 08 has no textual diff ignoring line endings.

Final `git status --short`:

```text
 M doc/ui-reference/staff-admin/SESSION-08-ENGINEERING-REPORT.md
 M src/app/(admin)/layout.tsx
 M src/app/(client)/layout.tsx
 M src/app/(staff)/layout.tsx
 M src/client/auth/auth-provider.tsx
 M src/components/auth/PortalAccountMenu.tsx
 M src/components/auth/PublicHeaderAuth.tsx
 M src/components/auth/SessionListPanel.tsx
 M src/components/dashboard/portal-topbar.tsx
 M src/components/ui/dropdown-menu.tsx
 M src/hooks/use-auth.ts
 M src/index.css
 M src/views/shared/SharedProfilePage.tsx
 M src/views/shared/profile/ProfileHero.tsx
?? doc/ui-reference/staff-admin/SESSION-17A-ENGINEERING-REPORT.md
?? scripts/qa/verify-account-profile.mjs
?? tests/unit/session-17a-account-profile.test.ts
?? tests/unit/session-list-pagination.test.ts
```

Session 08 is the protected pre-existing change. Nothing staged. HEAD remains unchanged. **Stop for owner/TL visual and functional review; no commit, push, merge, deployment or next session.**

## Owner-review corrections — 2026-10-21

**Implemented for review; owner approval remains pending.** These results supersede the initial account presentation and unpaginated sessions behavior above.

### Account menu and Appearance audit

The original 18rem menu had a generic uppercase identity label, plain text and uniform actions. The existing shared menu now uses a compact 17rem collision-aware surface, real avatar/name/email and available role, the existing Nepal image with a contrast overlay, a security separator, and semantic danger colors for Sign Out. Staff/Admin/Client retain their portal tokens and existing commands. Mobile account sections remain scrollable. No header avatar or second trigger was added. Cancel now restores focus after the mobile trigger remounts, correcting a confirmed keyboard defect.

**Appearance is unsupported and requires separate authorization.** `src/app/theme-engine.tsx` controls CMS branding colors/favicon, not a user theme preference. `PortalBrandingProvider` accepts light/dark palette inputs; layouts currently pin their appearance and Client retains its palette ownership. There is no existing persisted Light/Dark/System controller or corresponding user-preference contract. No placeholder, branding override or new API was added. Separate owner authorization is requested to define and implement that capability.

### Active Sessions

The defect was the shared `sessions.map` rendering every record. `SessionListPanel` now keeps returned current sessions above the paginated list, preserves the API order of other sessions, and reuses `usePagination`/`Pagination` for at most six other sessions per page. It shows accurate ranges/counts/pages, with named numbered/Previous/Next navigation only for multiple pages. Current sessions have no Revoke control. Stored page state reconciles after record-count changes: removing the last two of 50 other sessions clamps page 9 to page 8, and Previous correctly reaches page 7. Bulk revocation retains the current session and removes pagination. Missing query data is not represented as a known empty list.

Existing confirmation, authenticated commands and cache invalidation remain. A synchronous lock now protects both individual and bulk revocation against duplicate submission. Failure retains the dialog/records for retry. Activity Log pagination remains independent. Its regression check exposed an existing Admin 768px event label squeezed to 0px by the timestamp; stacking audit rows until 1024px fixes the presentation without changing audit data or pagination. The current-session badge received readable light/dark text after its old light-mode contrast failed scanning.

### Targeted correction QA

- `npx vitest run tests/unit/session-list-pagination.test.ts tests/unit/session-17a-account-profile.test.ts tests/unit/cui-17-cached-profile-kyc.test.ts --maxWorkers=1`: **3 files, 47 tests passed**, including 12 new pagination tests. Boundaries cover 0/1/6/7/13/51 records, absent current/query data, protected current session, API order, page clamping, bulk-empty and busy states. Final ordering assertions also pass in `correction-pagination-final.log`.
- `node scripts/qa/verify-account-profile.mjs --corrections-only`: **30 checks, 15 axe WCAG A/AA scans with zero reported violations, zero browser exceptions, 12 intercepted mutation attempts, zero live mutations**. Evidence: `correction-evidence.json`; output: `correction-browser.log`. This fresh targeted run is separate from the initial 97-check evidence.
- All three portals: account menus at 1440/light, 768/dark, 390/light and 360/dark; short confirmations at 360×640. Active Sessions uses 0/1/7/51-record fixtures at Staff 1440, Admin 768 and Client 390. Checks cover page changes, current-session protection, denial/retry, busy controls, one request per action, cache refresh, clamping, independent Activity Log pagination, keyboard/focus/Escape, viewport bounds and horizontal overflow.
- Focused ESLint and `npx tsc --noEmit` both exit 0 with no diagnostics (`correction-eslint.log`, `correction-tsc.log`). `git diff --check` and separate untracked-file trailing-whitespace/EOF checks pass. No full suite, full browser-matrix replay or production build is claimed.

Earlier failed attempts remain diagnostic evidence: the confirmed Cancel-focus, badge-contrast and audit-width defects; one development-load timeout; and a bounds assertion that needed to scroll the existing Admin/Client drawer container first. They are not counted as successful checks. The initial matrix is preserved as a projection of the original consolidated evidence. Correction-only mode writes separate evidence without overwriting that matrix.

### Review screenshots and scope

Paths below are relative to ignored `.local/qa/session-17a/`:

- Matched desktop comparison: `correction-before-staff-1440-account.png` → `correction-after-staff-1440-light-account.png`.
- Tablet: `correction-after-staff-768-dark-account.png`, `correction-after-admin-768-dark-account.png`.
- Mobile: `correction-after-staff-360-dark-account.png`, `correction-after-client-390-light-account.png`, `correction-after-admin-390-light-account.png`.
- 51-session lists with current session and page 9: `correction-staff-51-sessions-page-9.png`, `correction-admin-51-sessions-page-9.png`, `correction-client-51-sessions-page-9.png`.
- Short confirmations: `correction-{staff|admin|client}-360-short-confirm.png`.

Only seven paths changed in this correction pass: `src/components/auth/PortalAccountMenu.tsx`, `src/components/auth/SessionListPanel.tsx`, `src/views/shared/SharedProfilePage.tsx`, `src/index.css`, `tests/unit/session-list-pagination.test.ts`, `scripts/qa/verify-account-profile.mjs`, and this report. The new test file isolates pagination render/boundary checks; no new runtime file was necessary. The complete Session 17A scope is the 17-file proposed allowlist above. All remaining work is preserved. No navigation, public My Portal source, Client Support, password/TOTP command, API, auth contract, permission or existing test changed during this correction.

Live authentication persistence/revocations remain unverified; all correction writes were intercepted. The historical Client Command Center contract failure remains unchanged and documented above. Appearance requires separate authorization. Stop for owner/TL visual approval; nothing staged, committed, pushed, merged or deployed.

## Final Staff header Create audit — 2026-10-21

**Reproduced and corrected.** The existing Staff layout delegates to `StaffCaseTopbar`, which uses the same `PortalTopbar` Create dropdown on every Staff route; its detail branch only supplies a cached case label. The mismatch was CSS, not separate Create components or a theme preference. Two earlier route-specific selectors, `:has(.staff-dashboard-home)` and `:has(.staff-cases-workspace)`, targeted `button.bg-dashboard-primary` and forced the sidebar navy color and 42px minimum height. Tasks inherited the shared purple primary button at 28px. Both routes had the same primary/hover/pressed tokens in the same browser session.

Measured before at 1440×900/light, Chromium 151.0.7922.34:

| Route | Background before | Height before | Background after | Height after |
| --- | --- | ---: | --- | ---: |
| `/staff` | `rgb(16, 35, 63)` | 42px | `rgb(109, 40, 217)` | 44px |
| `/staff/tasks` | `rgb(109, 40, 217)` | 28px | `rgb(109, 40, 217)` | 44px |
| `/staff/cases` | `rgb(16, 35, 63)` | 42px | `rgb(109, 40, 217)` | 44px |

Removed only those two Create overrides. A Staff-only class on the existing shared button now uses the existing primary/foreground, hover, pressed and control-radius tokens, with a consistent 44px minimum target and padding. The shared 12px/600 typography and 8px radius remain. Pressing or opening the menu uses the pressed token; keyboard focus retains the existing focus ring. The existing dropdown's keyboard support is enabled only for Staff, with an explicit Create accessible name. No Create link, handler, permission or business action changed. Admin retains its prior 28px blue Create button; Client still has no header Create button. Staff navigation, language, mobile chrome, footer and positioned main remain intact. Appearance remains excluded.

Changed in this audit only: `src/components/dashboard/portal-topbar.tsx`, `src/index.css`, `scripts/qa/verify-account-profile.mjs`, and this report. No new file or test modification was necessary. Entry SHA-256 hashes in `create-audit-entry-hashes.json` verify preservation of all other existing Session 17A files, including the protected Session 08 change.

QA:

- `node scripts/qa/verify-account-profile.mjs --create-audit-only`: **55 checks, 6 axe WCAG A/AA scans with zero reported violations, zero browser exceptions, zero mutation requests and zero live writes**. `create-evidence.json` records actual style signatures, token-resolved colors and geometry; `create-browser.log` records the completed gate. Existing account/pagination/public evidence was preserved separately.
- Dashboard → Tasks → Cases in the same browser session at 768/1024/1280/1440, light/dark: exact matching normal, hover, active, expanded and keyboard-focus signatures; unchanged four Create destinations; Home/End/Escape/focus restoration; header bounds, twelve navigation links, zero horizontal/outer-shell overflow and main containment. Normal styling is also checked on every other primary Staff destination, Profile, Case Details and Content Editor in both themes. Mobile 360/390 retains its existing hidden desktop Create/header and one visible language control.
- Admin/Client before/after computed comparison passes at 1440/light (`create-isolation-before.json` and final evidence). Actual keyboard activation of New Task still navigates to `/staff/tasks`; the other three hrefs remain `/staff/cases`, `/staff/hearings`, `/staff/clients`. No creation form was submitted and no persistence claim is made.
- `npx vitest run tests/unit/staff-responsive-navigation.test.ts tests/unit/floating-position.test.ts tests/unit/session-17a-account-profile.test.ts --maxWorkers=1`: **3 files, 25 tests passed**, `create-unit.log`. Focused ESLint and `npx tsc --noEmit` exit 0 with no diagnostics (`create-eslint.log`, `create-tsc.log`). `git diff --check` and separate untracked trailing-whitespace/EOF checks pass.

Matched before/after screenshots in ignored `.local/qa/session-17a/`:

- `create-before-dashboard-1440-light.png` / `create-after-dashboard-1440-light.png`.
- `create-before-tasks-1440-light.png` / `create-after-tasks-1440-light.png`.
- `create-before-cases-1440-light.png` / `create-after-cases-1440-light.png`.
- After captures also cover Dashboard/Tasks/Cases at 768 and 1440 in light/dark, using `create-after-{dashboard|tasks|cases}-{width}-{theme}.png`. Representative tablet/desktop captures were visually inspected. `create-before.json` records the matched pre-edit computed measurements and return-to-Dashboard check.

All preceding account, profile, session pagination and public-menu corrections are preserved. The historical Client Command Center test limitation remains documented; no related assertion changed or new full Client/Admin workflow run is claimed. No full suite or production build. Nothing staged; HEAD/branch and the complete status listed above remain unchanged. Stop for owner/TL review; no commit, push, merge or deployment.
