# Session 17 — Premium Staff navigation

2026-10-20, Asia/Kathmandu. Implementation complete; final QA results below. Awaiting Technical Lead and product-owner visual approval. No Git checkpoint is authorized.

## Safety and scope

Verified authorized worktree `D:\lexnepal\.local\worktrees\ui-staff-admin-upgrade`, branch `ui/staff-admin-upgrade`, HEAD `4c3e3ad82ec1fcc0bfe8a4e9096a91aa8e7500fb`, origin `https://github.com/raghav556/lexnepal.git`, AGENTS.md and initial status. Read the installed Next.js client-component and Link guides. The only entry modification was the unrelated Session 08 report; it remains untouched and unstaged, SHA-256 `1ACEB9535586A43197F561057EEC9DB9409CAB5F12994629C43F86F5FE7BC78E`.

Reused the healthy port-3001 Next.js preview. No second server, dependency change, production build, database operation, auth/permission change, staging, commit, push, merge or deployment. No Session 18 work.

## Root cause and implementation

The existing Staff operational drawer reused a centered Dialog with overlay padding, rounded corners and a viewport-minus-2rem height. At 390×900 the baseline measured approximately x=16.7, y=17.6, height=864.7, radius=12px (entry animation was still settling). The separate Staff bottom bar reserved 72px below the shell; Dashboard had another route-specific reservation. At 768 the existing expanded sidebar occupied 248px and computed to sticky positioning. Baseline screenshots and computed measurements are `before-mobile-drawer.png`, `before-{390,768,1280}.png` and `before.json` under the evidence directory.

- **Desktop ≥1200px:** existing PortalSidebar fixed at left/top/bottom, 100dvh, expanded width from the existing dashboard token. Branding/account regions do not shrink; the central navigation scrolls independently. Main content uses the same width variable as its margin, preserving the topbar/footer boundary.
- **Tablet 768–1199px:** the same sidebar becomes a fixed 76px rail. All twelve existing links retain their translated accessible text. Four separated groups remain in the same DOM. Portaled Staff-only hover/focus hints escape the scrolling rail, support pointer retention and Escape, and remain hidden outside the rail breakpoint. Account/avatar is anchored at the bottom.
- **Mobile <768px:** existing PortalMobileNav and Dialog become a left-docked, square-edged drawer, width `min(20rem, 100vw - 2.75rem)`, height 100dvh. This preserves a usable backdrop strip at 360px. Brand/close control stay at top; the existing complete account controls remain at bottom; only the middle navigation scrolls. Account controls deliberately retain the real existing identity/actions rather than the reference's illustrative compact user.
- Staff drawer opens/closes through the existing state machine and closes on navigation, pathname changes, Escape, backdrop and breakpoint transition. Existing Dialog supplies focus trapping/restoration and body scroll lock. The Staff opt-in also makes the actual internal main canvas inert and locks its overflow while open, restoring both on close. The search shortcut relinquishes drawer focus to the existing search palette.
- Removed the Staff-only bottom bar and its ordinary/Dashboard shell reservations. Footer safe-area padding remains; legitimate form/dialog padding is retained. Removed stale bottom-bar offsets from Staff client profile and message overlays. Tablet message overlays account for the fixed rail. The main retains **relative positioning**, existing bounded overflow, sibling footer and floating Scroll-to-Top.

The 768px boundary matches existing Staff mobile chrome. The rail gives 692px of content at 768 instead of 520px. Expanded navigation returns at 1200px so the 1280px desktop retains room for its existing topbar controls. Browser geometry, rather than compensating negative margins or spacers, verifies these choices.

## Single navigation source and routes

STAFF_NAV remains the only destination configuration used by desktop, rail, drawer and operational search. `isStaffNavActive` matches home exactly and nested routes by segment boundary.

| Group | Destinations |
| --- | --- |
| Overview | Dashboard `/staff`; Tasks `/staff/tasks` |
| Legal Practice | Cases `/staff/cases`; Hearings `/staff/hearings`; Documents `/staff/documents`; Research Vault `/staff/research` |
| Client Relations | CRM `/staff/crm`; Clients `/staff/clients`; Messages `/staff/messages`; Appointments `/staff/appointments` |
| Firm Workspace | Content `/staff/content`; HR `/staff/hr` |

Exactly twelve primary links, four headings, no duplicate destinations. Profile remains an account/search destination. Case Details and Content Editor select their owning modules. Legacy Team Chat redirect source is unchanged; Staff Team Chat/Command Center navigation was not restored. Admin Command Center and Client navigation configuration are unchanged.

## Reuse and exact files

Reused PortalSidebar, PortalSidebarGroup/Item, PortalMobileNav, Dialog, PortalFirmBrand, PortalAccountMenu, StaffCaseTopbar, PortalFooter, ScrollToTop, localization, existing role guard and global search. No parallel drawer, navigation dataset or new UI package.

Changed:

1. `src/app/(staff)/layout.tsx` — Staff fixed-sidebar classes, small inline rail-hint helper, docked brand opt-in, removal of bottom-bar markup; same main/footer and business boundaries.
2. `src/lib/operational-navigation.ts` — four Staff groups/order and shared Staff active-route helper; Admin tree unchanged.
3. `src/components/dashboard/portal-mobile-nav.tsx` — minimal optional `operationalDrawerBrand` integration. The existing component could not place fixed branding outside its scrolling region or lock an internally scrolling Staff canvas. The new behavior is opt-in and is unused by Admin/Client; their rendering branches remain unchanged.
4. `src/index.css` — Staff-scoped responsive navigation, rail hints, safe areas and removal of obsolete Staff spacing.
5. `tests/unit/cui-03-client-shell-contract.test.ts` — only its Staff bottom-bar assertion now rejects the retired Staff bar. Client More/engine assertions remain; the unrelated Command Center assertion is untouched. This updates the Staff navigation contract to the approved requirement, not a Client presentation change.

New:

6. `tests/unit/staff-responsive-navigation.test.ts` — exact groups/routes/search preservation, route existence, nested active-state uniqueness and prefix exclusion.
7. `scripts/qa/verify-staff-navigation.mjs` — lightweight actual-route QA, synthetic fixtures, every API request intercepted, evidence output only under ignored `.local`.
8. `doc/ui-reference/staff-admin/SESSION-17-ENGINEERING-REPORT.md` — this report.

## QA and evidence

Evidence directory: `.local/qa/session-17/`.

- Relevant Vitest: `npx vitest run tests/unit/staff-responsive-navigation.test.ts tests/unit/operational-search-navigation.test.ts tests/unit/staff-messages-nav.test.ts tests/unit/portal-footer.test.ts tests/unit/staff-hr-model.test.ts tests/unit/staff-appointments-model.test.ts --maxWorkers=1` — **six files, 64 tests passed**; `unit.log`.
- Focused ESLint on layout/config/shared opt-in, affected tests and QA script: exit 0; `eslint.log`.
- `npx tsc --noEmit`: exit 0; `tsc.log`.
- Broader Client shell contract: **10 passed, one documented pre-existing failure** at line 150 requiring `onOpenCommandCenter` in Staff layout. That string is absent from committed baseline HEAD too. No expectation was weakened to conceal it. `client-baseline.log`.
- `node scripts/qa/verify-staff-navigation.mjs --flows-only`: **103 completed navigation/regression checks, 16 axe WCAG A/AA scans with zero violations, zero browser exceptions and zero live mutations**; `browser.log`, `evidence.json`. This final run reuses the already successful sixteen-width/theme matrix and reruns all flows after the harness corrections. All six intercepted writes were automatic `POST /api/v1/messages/read` receipts fulfilled in memory. No business mutation reached the server.
- Supplemental review capture probe: **nine checks passed**, zero exceptions/live writes. Eight capture the natural scroll end on Dashboard/Tasks/Clients/Documents at 1440/light and 390/dark. The ninth opens/closes the unchanged actual Client More drawer with Escape. Evidence: `review-evidence.json`, `review-captures.log`; the ignored probe reuses the main harness's fixtures, interception and geometry assertions.
- `git diff --check`: passed; existing line-ending notices are informational.

The viewport matrix checks 360/390/768/900/1024/1280/1440/1704 at height 900, both themes. Link flows click every primary destination at 1440/900/390, check active uniqueness and nested cases/content routes, and exercise back/forward. Short-height checks use 500px at mobile/rail/desktop. The harness checks footer/shell/body bounds, actual header control overlap, horizontal overflow, drawer focus/Escape/backdrop, locked canvas, tooltip focus/hover, localization, real search/Create/Messages/notifications/profile entry points and reduced motion. Separate regressions visit all fourteen Staff page variants at desktop/mobile height 778, including message history/composer and an unsaved Research draft. Empty Tasks/Documents, short Clients (one synthetic record), and emulated 24px top / 20px bottom safe areas pass. All mutations, including automatic message-read receipts, stay within the interceptor.

Final count breakdown: 16 responsive configurations, 36 primary-link clicks, 6 nested selections, history/breakpoint recovery, 3 short-height cases, combined account/chrome/search controls, 3 legacy redirects, 28 cross-module scroll/footer cases, independent-pane reading, 6 empty/short footer cases, safe areas, and protected-portal isolation. All recorded footer gaps, outer-shell ranges and body overflow ranges are **0px**. Drawer geometry is flush at x=0/y=0, full viewport height, radius=0; mobile drawer/menu touch targets retain at least 44px. Tablet rail width is 76px and stays fixed independently of main scrolling.

Screenshot names:

- `closed-1440-light.png`, `closed-1440-dark.png`, `closed-1280-light.png` — expanded desktop.
- `closed-768-light.png`, `closed-900-light.png`, `closed-900-dark.png` — fixed rail.
- `closed-{390,360}-{light,dark}.png`, `drawer-{390,360}-{light,dark}.png` — mobile closed/open.
- `short-scrolled-360.png`, `short-scrolled-900.png`, `short-scrolled-1440.png` — internal navigation scrolling.
- `tablet-account-menu.png`, `mobile-safe-area-drawer.png` — account and safe-area states.
- `regression-{dashboard,tasks,clients,documents,research,messages}-{1440,390}.png` — footer/scroll comparisons; baseline captures are preserved separately.
- `natural-end-{dashboard,tasks,clients,documents}-{1440,390}.png` — natural-end footer screenshots before invoking Scroll-to-Top.
- `admin-drawer-unchanged.png`, `client-shell-unchanged.png`, `client-more-drawer-unchanged.png` — protected portal checks.

The initial harness attempts are retained: cold development route compilation exceeded the original five-second URL wait; the correct configured expect instance now allows thirty seconds. A notification selector was corrected to the actual accessible label. These are harness corrections, with no forced clicks or weakened product checks. The successful viewport matrix can be reused by `--flows-only`; that mode requires sixteen passing matrix entries and sixteen clean axe scans. Final evidence must contain the complete successful flow results.

## Limits and stopping point

Browser identity/data are synthetic on the real Next.js preview. This does not establish real authenticated persistence, notification delivery, external integrations or production E2E. No live business mutation, full-suite pass or production build is claimed. Axe scans supplement keyboard/visual checks and are scoped to navigation. Safe-area emulation is not a physical-device certification. Existing module business logic and permissions were not changed.

The ignored directory contains **52 PNG captures**, including four original baseline captures. Actual Admin drawer checks retain its centered inset presentation; Client shell retains its existing bottom navigation with no Staff drawer class. The actual Client More drawer and Escape were also verified in the supplemental probe. Client business workflows were not exhaustively rerun. The reference's fictional data/widgets were not copied into production.

Final tracked diff is five files, 137 additions / 75 deletions; the new test, QA script and this report are untracked and excluded from that statistic. HEAD and branch remain unchanged; the index is empty. Final `git status --short`:

```text
 M doc/ui-reference/staff-admin/SESSION-08-ENGINEERING-REPORT.md
 M src/app/(staff)/layout.tsx
 M src/components/dashboard/portal-mobile-nav.tsx
 M src/index.css
 M src/lib/operational-navigation.ts
 M tests/unit/cui-03-client-shell-contract.test.ts
?? doc/ui-reference/staff-admin/SESSION-17-ENGINEERING-REPORT.md
?? scripts/qa/verify-staff-navigation.mjs
?? tests/unit/staff-responsive-navigation.test.ts
```

Session 08's hash remains unchanged. No remaining product blocker was found within the measured synthetic states; the known unrelated Command Center contract failure remains explicit above. Stop for TL/owner visual review; do not stage, commit or push.
