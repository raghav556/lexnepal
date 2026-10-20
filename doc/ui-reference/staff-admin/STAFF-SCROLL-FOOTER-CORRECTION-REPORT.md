# Staff scroll and footer correction

Date: 2026-10-20 (Asia/Kathmandu). Uncommitted. The owner-supplied Tasks/Clients defect has now been reproduced during sidebar navigation and corrected with a positioned main scroll owner. See the latest owner-viewport section below; the earlier unreproduced findings are historical.

## Safety and scope

- Worktree: `D:\lexnepal\.local\worktrees\ui-staff-admin-upgrade`.
- Verified branch `ui/staff-admin-upgrade` and HEAD `07945722e8b5207935828fc2032de9e6ce0f0e2a` before editing; HEAD remains unchanged.
- Read `AGENTS.md` and the installed Next.js client-component guide.
- Session 08's pre-existing modification was left untouched. Its modification timestamp predates this task, and Git shows no textual change after ignoring line-ending differences.
- No database writes, seeds, migrations, real message receipts, appointment mutations, commits, pushes, merges, deployment changes, or Session 16 work.
- Reused the healthy Next.js preview on port 3001. No second dev server or production build was started.

## Root cause and measurements before editing

Inspected the live application's actual DOM, computed CSS, bounding rectangles and `#staff-main-canvas` scroll metrics with synthetic authenticated identity and intercepted browser API responses.

- Dashboard: `#staff-main-canvas` was the scroll owner (`overflow-y: auto`, client height 936px). Its footer was inside `main`. The visible Top button computed to `position: static`, with a 44px height and 16px bottom margin. It occupied document flow and was measured below the viewport near the end of scrolling. Rendering it added another 60px of content.
- Empty Tasks: the canvas had client height 944px and scroll height 1040px. Its page already filled the canvas, then an in-flow 40px footer and an always-present 56px `.staff-tasks-scroll-slot` added approximately 96px of unnecessary scrolling, even with no Top button visible.
- The layout's `useFlowFooter` branch mixed two footer/control ownership models. Route-specific Home/Cases/Tasks/Case Detail CSS made the nominally floating shared component static. Other routes already placed their footer outside the canvas.
- Mobile additionally reserved bottom-navigation clearance in the shell and again in several page roots; Research reserved it in its stage too.

Baseline screenshots/measurements: `.local/qa/staff-scroll/before-dashboard.{png,json}` and `before-tasks.{png,json}`.

## Exact changed paths

1. `src/app/(staff)/layout.tsx`
2. `src/index.css`
3. `scripts/qa/verify-staff-scroll.mjs` — new, reproducible live-preview browser checks.
4. `doc/ui-reference/staff-admin/STAFF-SCROLL-FOOTER-CORRECTION-REPORT.md` — this report.

No Staff module page, navigation definition, data hook, API, Admin layout, Client UI, shared `ScrollToTop`, shared `PortalFooter`, or Session 15 report was changed.

## Implementation

- Replaced the route-dependent footer branch with one compact, responsive Staff footer outside the scrolling canvas. Removed the Home/Tasks/Cases/Case Detail flow slots and their layout contribution. The old route-specific static-control selectors no longer match a rendered control.
- A positioned, height-constrained shell canvas contains the existing `main` and the shared Top component as siblings. The Staff control uses `position: absolute` relative to that canvas, so it floats above the footer and never contributes scroll height. Its 44px circular target uses dashboard colors and a visible focus outline.
- Reused the shared 240px threshold and scroll listener, targeting only `mainRef`. Short pages and internally scrolling panes do not force a page control. The component remounts on pathname changes to bind fresh visibility state.
- Clicking returns the actual page canvas to the top. Focus moves to that canvas without causing an extra scroll. Normal motion follows the canvas's smooth policy; reduced motion switches it to `auto` and disables Staff control transitions.
- The footer remains above the mobile navigation because the existing shell reservation is preserved. The floating control sits above the footer. Removed duplicated navigation clearance from mobile page roots and the Research stage, leaving the compact content gutter.
- Open message conversations suppress the page control, preserving history ownership and pinned composers. Modal/alert dialogs hide the control while open. Existing conversation overlays, pane scrolling, input state, and module functionality remain intact.

## QA results

Passed:

- Focused ESLint on the changed layout and QA script: exit 0, no warnings/errors.
- `npx tsc --noEmit`: exit 0.
- `npx vitest run tests/unit/portal-footer.test.ts tests/unit/staff-messages-nav.test.ts tests/unit/staff-appointments-model.test.ts --maxWorkers=1`: **3 files, 22 tests passed**.
- `node scripts/qa/verify-staff-scroll.mjs`: **112 route/width/theme checks passed**, zero browser exceptions.
- Additional strengthened checks via `node scripts/qa/verify-staff-scroll.mjs --extras-only`: **9 checks passed**, reusing the completed route matrix without rerunning it. These cover message reading/composer placement at all four widths, empty Tasks, an unsaved Research editor, suppression of an already-visible control during a dialog, normal/reduced motion, and unchanged Admin positioning.
- `git diff --check`: passed.

The browser ran the actual Next.js routes, layouts, components and hooks on the existing dev server. Every browser API request was intercepted with synthetic records. All recorded non-GET requests were automatic `POST /api/v1/messages/read` calls, fulfilled only by the test interceptor. **Real data mutations: zero.** The Research draft was discarded without saving; the appointment dialog was opened and closed without submission.

Every Staff route below was checked at **1440, 768, 390 and 360**, at height 1000, in **light and dark**. Theme classes were applied explicitly. Tests verified hidden-at-top/below-threshold behavior, conditional visibility after meaningful scrolling, correct canvas targeting, unchanged internal pane position, no added control height, compact sibling footer, mobile navigation clearance, and no outer horizontal overflow. Empty Tasks now has **zero footer/control-only overflow**. Footer heights measured about 36px desktop and 33px mobile.

### Route-by-route findings

Overflow values below are the synthetic fixture's page-canvas scroll ranges in pixels, in width order **1440 / 768 / 390 / 360**. They describe actual test content, not empty footer space. A range at or below 240px correctly keeps the control hidden.

| Staff route | Canvas ranges | Result |
| --- | --- | --- |
| Dashboard | 3543 / 4942 / 6246 / 6633 | Floating control, focus, click target and footer clearance pass. |
| Tasks | 860 / 2844 / 3615 / 3851 | Populated list passes; separate empty-state test confirms zero footer-only scroll. |
| Cases | 0 / 367 / 458 / 506 | Hidden on the short desktop page; returns the page canvas to top on narrower layouts. |
| Case Details | 81 / 537 / 798 / 818 | No desktop control forced for short overview; correct floating behavior on narrower layouts. |
| Hearings | 5822 / 7621 / 7646 / 8232 | Existing page scrolling retained; Top correctly targets the canvas. |
| Appointments | 109 / 401 / 398 / 413 | Internal list/calendar scrolling remains separate. No horizontal regression; short desktop canvas stays without a control. |
| CRM | 332 / 2557 / 2608 / 2664 | Page control and end spacing pass; no data actions changed. |
| Clients | 0 / 328 / 323 / 323 | Conditional page control follows actual overflow. |
| Research | 506 / 621 / 641 / 656 | Page scrolling passes; extra editor check preserves internal textarea reading position and draft. |
| Content library | 474 / 2299 / 2348 / 2378 | Page scrolling, footer and width checks pass. |
| Content writer | 6 / 596 / 899 / 999 | No desktop control forced; narrower writer canvases scroll correctly. No saving performed. |
| Messages, open conversation | 118 / 0 / 0 / 0 | Page control suppressed. History reading position and composer/navigation clearance verified at every width. Existing mobile conversation overlay remains intact. |
| Documents | 1814 / 2702 / 3032 / 3063 | Page control/footer pass; no document mutation or download performed. |
| HR | 1440 / 1705 / 1765 / 2345 | Page control/footer pass; no attendance or leave action performed. |

Admin Appointments was also opened with synthetic Admin identity: its original shared control still computes to `position: fixed`, `bottom: 56px`, with no Staff control class. Shared control/footer and Admin source files have no diff.

## Evidence

All artifacts are ignored under `.local/qa/staff-scroll/`:

- `evidence.json`: 112 measured route results, 9 additional checks, zero browser exceptions, intercepted receipt requests and zero live mutations.
- `browser.log`, `additional-browser.log`, `focused-unit.log`, `eslint.log`, `tsc.log`.
- 39 screenshots, including the two baseline captures and representative desktop/light and phone/dark captures for every module.
- Review examples: `dashboard-1440-light-end.png`, `dashboard-360-dark-end.png`, `hearings-390-dark-end.png`, `appointments-390-dark-end.png`, `messages-390-dark-end.png`, `empty-tasks-no-footer-gap.png`, `dialog-control-suppressed.png`, `admin-shared-control-unchanged.png`.

## Remaining limitations

- An additional broader Client shell contract run found one pre-existing failure in `tests/unit/cui-03-client-shell-contract.test.ts:150`: it expects `onOpenCommandCenter` in the Staff layout. That string is already absent from the committed baseline at `07945722e8b5207935828fc2032de9e6ce0f0e2a`; the previously deleted Staff module was not reintroduced and the unrelated test was not edited. Baseline proof is in `pre-existing-client-contract.json`, and the broader run is in `unit.log`. The focused 22-test set passes.
- QA uses synthetic identity/data on real Next.js pages; real authenticated business operations and external providers were intentionally not exercised. Production build and exhaustive data permutations were not run.
- Mobile conversation overlays continue to cover the underlying shell footer while the composer is active, as before; the composer and bottom navigation remain clear and the page control is suppressed.

## Final Git status

```text
 M doc/ui-reference/staff-admin/SESSION-08-ENGINEERING-REPORT.md
 M src/app/(staff)/layout.tsx
 M src/index.css
?? doc/ui-reference/staff-admin/STAFF-SCROLL-FOOTER-CORRECTION-REPORT.md
?? scripts/qa/verify-staff-scroll.mjs
```

Session 08 is the pre-existing change. All correction changes remain unstaged and uncommitted. Stop for TL visual review.

## Prior footer-blocker investigation — 2026-10-20 (superseded by owner-viewport reproduction)

### Reproduction status and root cause

**The owner-reported blank region below the copyright footer was not reproduced on the current worktree preview at `http://localhost:3001`. No additional production layout/CSS fix is claimed.** The original correction above remains intact. No screenshot of the reported defect or its URL/viewport/view state accompanied this request. The preview URL/port, viewport and active view/filter were requested while testing continued; no answer was available at report time.

Actual Next.js Tasks and Documents routes were opened with intercepted synthetic authentication and records. Inspected `AGENTS.md`, the installed Next.js client-component guide, the existing correction diff/report/script, Staff layout, page roots, relevant scoped CSS, shared footer/control, branding provider and role guard. Both routes use the same current shell structure: top chrome, a flex-growing canvas wrapper, and a non-shrinking sibling footer. The page root has `min-height: 100%` inside the actual canvas; it does not establish a second footer region. No page-specific trailing spacer was demonstrated on either route. It is therefore not established that the owner's two screenshots share a remaining root cause.

The prior QA had a confirmed test blind spot: checking footer presence/height and control clearance did not assert that the footer reached the visible Staff workspace boundary. This investigation corrects that test gap. It does **not** treat a new green run as evidence that an unreproduced owner defect has been fixed.

### Exact changes in this investigation

- `scripts/qa/verify-staff-scroll.mjs`: added `--footer-boundary`, empty/one-record/populated Tasks and Documents fixtures, two viewport heights, explicit shell/footer boundary and trailing-region assertions, full computed geometry, and a deliberately injected 160px-gap negative check. The normal Staff route matrix now also includes 1280px and records/asserts the footer boundary.
- `doc/ui-reference/staff-admin/STAFF-SCROLL-FOOTER-CORRECTION-REPORT.md`: updated status and added this investigation.

The existing uncommitted changes in `src/app/(staff)/layout.tsx` and `src/index.css` were preserved without further production edits. No Tasks/Documents page, shared footer/control, Admin/Client source, API, dependency, business workflow or Session 08 report was changed.

### Measurements and comparable captures

Evidence directory: `.local/qa/staff-scroll/final-footer-fix/`.

Before any current-task source edit, captured the existing correction on Tasks/Documents at widths **1440, 1280, 768, 390 and 360**, height **1000**, light/dark, empty and populated. `before-matrix.json` also includes exploratory short-state entries; its Documents `short` entries still used 14 records and must not be counted as one-record verification. The final reproducible script corrects that fixture and uses exactly one record for both routes' short states.

| State at 1440 × 1000, light | Before footer bottom | Visible workspace bottom | Space below footer | Canvas scroll range |
| --- | ---: | ---: | ---: | ---: |
| Tasks, empty | 1000px | 1000px | 0px | 0px |
| Documents, empty | 1000px | 1000px | 0px | 0px |
| Tasks, populated | 1000px | 1000px | 0px | 860px |
| Documents, populated | 1000px | 1000px | 0px | 1814px |

The complete pre-edit empty/populated matrix measured **0px below-footer space** and **0px outer document scroll range**. At desktop the footer is about 36.33px high. At 390/360 it ends at y=928px, directly above the existing 72px navigation reservation, rather than leaving an uncovered gap. The mobile reservation contains the visible bottom navigation; it is not blank workspace.

Full measurements include html/body, outer Staff root, shell content, canvas wrapper, main and its page root, footer bounds; `height`, `min-height`, flex, padding, margin, transform, overflow, pseudo-element content, `clientHeight`, `scrollHeight` and `scrollTop`. Natural-end assertions distinguish long-content scrolling from trailing space. A separate paint/hit-test probe (`paint-probe.png`) confirmed that the copyright footer is painted/hit-testable at the measured bottom boundary. `tasks-before-measurements.json` and `documents-before-measurements.json` contain the initial detailed populated DOM measurements.

Comparable captures use the same **1000px height, 1× viewport scale**, route, theme and synthetic empty/populated state:

- `before-{tasks|documents}-{width}-{theme}-{empty|populated}.png`
- `review-{tasks|documents}-{width}-1000-{theme}-{empty|populated}-end.png`
- Representative top-of-page captures also use the `review-` prefix and `-top.png` suffix.

`review-` means verification of the preserved production implementation, **not an after-fix image**. There is no honest before/after defect-resolution pair because the supplied state already measured a zero gap. No negative margin, overlay footer, spacer, hard-coded offset or speculative CSS adjustment was added.

### Final verification results

- `node scripts/qa/verify-staff-scroll.mjs --footer-boundary`: **120 Tasks/Documents cases passed** (2 routes × 5 widths × 2 heights × 2 themes × 3 data states), plus **10 additional checks**, zero browser exceptions, zero real mutations. All cases measured **0px below-footer gap** and **0px body scroll range** at both top and natural canvas end. Includes a negative test that rejects an injected 160px gap, then passes after removing it. Evidence: `final-footer-fix/evidence.json`; output: `final-footer-fix/browser.log`.
- `node scripts/qa/verify-staff-scroll.mjs`: **140 route checks passed**, plus **9 additional checks**, zero browser exceptions and zero real mutations. Evidence copied to `final-footer-fix/staff-regression-evidence.json`; output: `final-footer-fix/staff-regression.log`. The expanded boundary assertion passes for every route at 1440/1280/768/390/360 in light/dark, height 1000.
- `npx eslint 'src/app/(staff)/layout.tsx' scripts/qa/verify-staff-scroll.mjs --max-warnings=0`: passed. `final-footer-fix/eslint.log` is empty.
- `npx tsc --noEmit`: exit 0. `final-footer-fix/tsc.log` is empty.
- `npx vitest run tests/unit/portal-footer.test.ts tests/unit/staff-messages-nav.test.ts tests/unit/staff-appointments-model.test.ts --maxWorkers=1`: **3 files, 22 tests passed**. `final-footer-fix/unit.log`.
- `npx vitest run tests/unit/cui-03-client-shell-contract.test.ts --maxWorkers=1`: **10 passed, 1 pre-existing failure**, at line 150 expecting `onOpenCommandCenter` in Staff layout. The committed baseline also lacks that string. No expectation/source change made to conceal it. `final-footer-fix/client-baseline.log` and `client-baseline-proof.json`.
- `git diff --check`: passed. Git emits existing CRLF normalization notices for Session 08 and index.css; no whitespace errors. No production build, dependency installation/change, or database operation was performed.

| Regression routes | Result |
| --- | --- |
| Dashboard, Tasks, Cases, Case Details, Hearings | All 10 width/theme combinations per route pass canvas/control and visible footer boundary checks. |
| Documents, CRM, Clients, Research, Content library, Content writer, HR | All 10 combinations per route pass. Internal Research editor scroll and unsaved draft remain unchanged by page Top. |
| Appointments | All 10 combinations pass; bounded internal panes remain separate, no horizontal overflow; dialog suppresses the control. |
| Messages | All 10 combinations pass; open-conversation page control stays suppressed. Four additional width checks preserve history reading position and composer/navigation clearance. |
| Admin | Existing shared control still computes to fixed positioning with bottom 56px; no Staff class. Shared component/Admin source untouched. |
| Client | Shared footer unit coverage passes, Client source untouched. Broader shell contract has the separately documented baseline failure above. No claim of a new live Client browser run. |

Useful TL captures in `final-footer-fix/`:

1. `before-tasks-1440-light-empty.png` / `review-tasks-1440-1000-light-empty-end.png`.
2. `before-documents-1440-light-empty.png` / `review-documents-1440-1000-light-empty-end.png`.
3. `before-tasks-1440-light-populated.png` / `review-tasks-1440-1000-light-populated-end.png`.
4. `before-documents-1440-light-populated.png` / `review-documents-1440-1000-light-populated-end.png`.
5. `review-tasks-390-1000-dark-populated-end.png` and `review-documents-390-1000-dark-populated-end.png` show footer/navigation clearance.
6. Matching 1280/768/360 and light/dark captures follow the same naming convention. The two-height matrix's JSON covers 740px height as well; screenshots are at 1000px for direct comparison.

### Outstanding blocker and stopping point

**The owner's reported visual defect remains open until reproduced in the affected state.** Both routes currently reach the visible workspace bottom under the measured states, so no new root cause or production fix can truthfully be reported. The owner/TL should compare the supplied evidence with the affected preview URL/port, viewport size/zoom, route view/filter and screenshot. Authentication/data are synthetic on actual Next.js routes; these results do not supersede a different live state. Before/after defect-resolution screenshots cannot be supplied without first reproducing that defect. Existing generic dialog/control, mobile navigation and pane checks pass; this was not exhaustive coverage of every module dialog or data permutation.

No further production edits were made in this investigation. The previous correction remains uncommitted, unstaged and preserved. Session 08's SHA-256 remains `1ACEB9535586A43197F561057EEC9DB9409CAB5F12994629C43F86F5FE7BC78E`.

Final HEAD: `07945722e8b5207935828fc2032de9e6ce0f0e2a`, branch `ui/staff-admin-upgrade`.

Final `git status --short`:

```text
 M doc/ui-reference/staff-admin/SESSION-08-ENGINEERING-REPORT.md
 M src/app/(staff)/layout.tsx
 M src/index.css
?? doc/ui-reference/staff-admin/STAFF-SCROLL-FOOTER-CORRECTION-REPORT.md
?? scripts/qa/verify-staff-scroll.mjs
```

Tracked diff summary remains exactly **2 files, 49 insertions, 55 deletions**: Staff layout (26 additions/55 deletions) and scoped CSS (23 additions), all from the preserved correction. Git's tracked diff summary excludes the untracked QA script/report. Session 08 has no textual diff ignoring end-of-line whitespace. No staged files. No commit, push, merge, deploy or Session 16. Stop for TL review of the evidence and the missing reproduction context.

## Final owner-viewport Tasks and Clients correction — 2026-10-20

**Reproduced and corrected.** This section supersedes the earlier unresolved-blocker status. The supplied Chrome screenshots correctly identified Tasks and Clients. The decisive missing condition was **client-side sidebar navigation from a scrolled Dashboard**, rather than loading each destination with `page.goto()`.

### Measured root cause

At 1704 × 778 CSS pixels, light theme, natural scroll end, before the production edit:

| Route | Footer bottom | Visible workspace bottom | Unwanted gap | Outer shell scrollTop |
| --- | ---: | ---: | ---: | ---: |
| Dashboard | 778px | 778px | 0px | 0px |
| Tasks | 722px | 778px | 56px | 56px |
| Clients (four records) | 730px | 778px | 48px | 48px |

At 1704 × 740, both Tasks and Clients reproduced a 56px gap. Both also reproduced 56px at the supplementary 1534 × 692 CSS viewport. Dashboard remained flush at every measured size.

The shell's dimensions were correct: the outer fixed Staff root and `.staff-shell-content` both ended at the viewport bottom. Body scroll range and bottom padding were zero. The footer's margin was zero and its height was unchanged (36.33px). This was not a desktop navigation reservation, footer margin, viewport-height calculation, breakpoint above 1536px or an extra spacer.

`#staff-main-canvas` was **position: static**, while its `.staff-shell-canvas` wrapper was positioned. Absolutely positioned accessibility elements inside page content therefore used the wrapper as their containing block, outside the main scrollport. The Tasks diagnostic identified `.staff-task-mobile-label` and pagination `.sr-only` spans whose `offsetParent` was that wrapper. The Clients diagnostic identified the equivalent `.staff-clients-field-label` spans (Type, KYC, Portal, Active matters and Status). Their overflow propagated into `.staff-shell-content`: Tasks shell `scrollHeight=1753`, `clientHeight=778`; Clients shell `scrollHeight=826`, `clientHeight=778`.

Although `.staff-shell-content` uses `overflow: hidden`, it remains programmatically scrollable. Next.js Link navigation uses scroll-into-view handling (verified in the installed `layout-router.js`). Navigating into these pages scrolled the outer shell by 56px, or the available 48px on the shorter Clients fixture. The sticky topbar remained visible, while the footer moved upward. **The exposed strip was the transparent shell-content area revealing its parent flex row's `bg-dashboard-canvas` background, `rgb(248, 250, 252)` in light mode.** Dashboard had no corresponding outer overflow, so it stayed correct. The same shared containment cause affected both routes. The explicit shell inspection also records sidebar height 778px on all three routes, and the existing sticky topbar heights of 64px on Dashboard and 56px on Tasks/Clients.

### Smallest production fix

Added **`relative` to `#staff-main-canvas`** in `src/app/(staff)/layout.tsx`. This makes the actual scroll owner the containing block for its absolute descendants. Their geometry stays inside that scrollport; the outer shell loses its accidental scroll range and its scrollTop returns to zero. Normal flex layout then places the footer at the intended boundary.

Diagnostic application of this single positioning rule reduced Tasks shell range from 975px to 0px and the footer gap from 56px to 0px. It also kept the gap at zero through subsequent Clients → Dashboard → Tasks navigations. Main scrolling and the floating sibling Top control remain separate. No fixed footer, compensating offset, negative margin, additional clipping rule, spacer, CSS `!important`, navigation change or business-logic change was introduced.

Changes made specifically for this final owner pass:

1. `src/app/(staff)/layout.tsx` — one additional utility class on main; preserves the entire earlier uncommitted correction.
2. `scripts/qa/verify-staff-scroll.mjs` — added owner-viewport and lightweight navigation-regression modes, real Link/drawer navigation, empty/one-record/four-client fixtures, outer-shell overflow assertions, viewport/DPR metadata and installed Chrome coverage.
3. `doc/ui-reference/staff-admin/STAFF-SCROLL-FOOTER-CORRECTION-REPORT.md` — this update and superseded-status labels.

`src/index.css` was **not changed further** in this pass. Shared footer/control, Tasks and Clients page sources, all business APIs, Admin/Client portal sources and Session 08 remain untouched.

### Why earlier QA missed it

The previous test helper called `page.goto()` for each route. A fresh document reset `.staff-shell-content.scrollTop` to zero, so its footer was flush even though the latent ancestor overflow existed. The earlier boundary assertions could only describe that fresh-load state. The owner's shorter desktop viewport also made the four-client page overflow, exposing the problem which its one-client/1000px-high fixture had avoided.

The new checks leave the previous page scrolled, click actual Staff Links (or the mobile navigation drawer), and assert both the footer boundary **and zero outer-shell scroll range** at top and natural main-scroll end. They test Tasks **and Clients**, alongside Dashboard, using empty, one-record and populated states.

### Evidence and viewport interpretation

All new captures, DOM measurements and logs are under `.local/qa/staff-scroll/final-owner-viewport/` and remain ignored by Git. API responses and authentication are synthetic on the actual Next.js preview at port 3001. Every mutation request is intercepted. Owner names, emails and phone numbers from the supplied screenshots were not copied into source or fixtures.

Browser outer-window pixels include tabs/address/bookmark chrome and may include OS scaling; they are not `innerWidth/innerHeight`. The screenshots did not provide an exact numeric CSS viewport/DPR reading. The reproduced acceptance viewport is **1704 × 778 CSS pixels, scale 1, DPR 1**; 778px is within the requested owner-visible range. Tests also cover 1680 and 1440 widths at heights 740/778/1000, and 1280/768/390/360 at height 778. Actual viewport, outer-window dimensions, scale, DPR and computed height/min-height/max-height are recorded, rather than equating the roughly 1704 × 864 outer screenshot with page content height.

The owner matrix uses installed **Google Chrome 148.0.7778.168** in headless mode. The pre-edit reproduction and matched post-edit comparison use the same bundled Chromium executable (151.0.7922.34), dimensions, theme, scale, synthetic records and natural-end scroll sequence. This provides a consistent before/after pair as well as installed-Chrome verification. The existing interactive Chrome session has no remote debugging port, so its authenticated DOM was not attached to; no credentials/cookies were requested or extracted. The owner's real screenshots remain the live-session reference.

### Final measured acceptance and screenshots

Matched pre-edit/post-edit measurements (`owner-comparison.json`):

| Route | CSS viewport, light, DPR 1 | Gap before | Gap after | Result |
| --- | --- | ---: | ---: | --- |
| Dashboard | 1704 × 778 | 0px | 0px | Reference preserved; before/after PNG bytes are identical. |
| Tasks | 1704 × 778 | 56px | 0px | Footer bottom now 778px; outer shell scrollTop/range zero. |
| Clients | 1704 × 778 | 48px | 0px | Footer bottom now 778px; outer shell scrollTop/range zero. |

The same matched navigation probe produced **30 post-fix measurements with zero gap** across 1704×778, 1680×778, 1704×740, 1704×1000 and 1534×692. All compared images include the footer and viewport bottom in the same frame. Main content ends above the sibling footer; no rows are hidden behind it. Natural main scrolling is preserved.

Exact comparable images under `.local/qa/staff-scroll/final-owner-viewport/`:

| Route | Before | After |
| --- | --- | --- |
| Dashboard | `before--staff-1704x778-1.png` | `after-matched--staff-1704x778-1.png` |
| Tasks | `before--staff-tasks-1704x778-2.png` | `after-matched--staff-tasks-1704x778-2.png` |
| Clients | `before--staff-clients-1704x778-3.png` | `after-matched--staff-clients-1704x778-3.png` |

Installed-Chrome review images use `after-{dashboard|tasks|clients}-{width}x{height}-{light|dark}-{empty|populated}-end.png`. Required additional sizes have both Tasks/Clients captures at **1440×778, 1280×778, 768×778, 390×778 and 360×778**, in light and dark. Owner-sized 1704/1680 captures include heights 740/778/1000. The one-record states are fully measured in JSON even where an additional screenshot was unnecessary.

Other reproducible evidence:

- `before-navigation-probe.json` / `after-matched-navigation-probe.json`: original and matched post-fix navigation DOM/scroll measurements, including DPR and bottom hit-test targets.
- `owner-comparison.json`, `dashboard-pixel-equality.json`, `matched-browser-version.json`: direct comparison and identical Dashboard image proof.
- `shell-inspection.json`: installed-Chrome topbar/sidebar/shell/main/footer geometry and paint colors.
- `diagnose-relative.log`: Tasks containing-block diagnosis. `clients-containing-block-replay.json`: a browser-only removal/restoration of the new main class reproduces 48px → 0px and identifies escaped Clients field labels; no checkout change or source revert.
- `evidence.json` / `browser.log`: final installed-Chrome owner matrix.
- `staff-regression/evidence.json` / `staff-regression/browser.log`: final cross-module results.

### Final checks and remaining limits

Passed:

- `node scripts/qa/verify-staff-scroll.mjs --owner-viewport`: **234 cases + 9 additional checks**, installed Chrome 148.0.7778.168. Three routes × 13 sizes × two themes × three data states. **Maximum before/after navigation end gap after the fix: 0px; maximum outer-shell scroll range: 0px.** Top and natural-end boundaries, meaningful main scroll, Top click/focus, footer clearance, no trailing page region and no horizontal overflow pass.
- `node scripts/qa/verify-staff-scroll.mjs --navigation-regression`: **28 checks + 9 additional checks**. All 14 Staff routes at 1440×778/light and 390×778/dark pass. Uses actual sidebar/drawer links for the 11 primary modules; Case Details, Content writer and the Messages `?caseId=` deep link load directly. Additional checks cover message history/composer at four widths, unsaved Research editor, empty Tasks, accessible dialog suppression, reduced motion and unchanged Admin fixed/bottom-56px control.
- `npx eslint 'src/app/(staff)/layout.tsx' scripts/qa/verify-staff-scroll.mjs --max-warnings=0`: exit 0, no warnings/errors; `eslint.log`.
- `npx tsc --noEmit`: exit 0; `tsc.log`.
- `npx vitest run tests/unit/portal-footer.test.ts tests/unit/staff-messages-nav.test.ts tests/unit/staff-appointments-model.test.ts --maxWorkers=1`: **22 tests passed**, three files; `unit.log`.
- `git diff --check`: passed. New/untracked QA and report files were also checked for trailing whitespace.

Both final browser runs have **zero browser exceptions and zero live mutations**. Every API request was intercepted; automatic message-read receipts were fulfilled in browser-test memory. No actual appointment/client/task/document update, database operation, upload, production build, dependency change or second dev server was performed. The existing preview remains on port 3001.

Two initial navigation-regression attempts hit harness/environment obstructions, retained as `staff-regression/first-harness-attempt.log` and `dev-overlay-attempt.log`: a sidebar URL did not include the Messages query string, and Next.js's development portal intercepted a fixed mobile-navigation click after other modules had been visited. The helper now loads that deep link directly and uses the existing mobile drawer for the cross-module pass. No product errors were hidden, no forced clicks or production changes were used to bypass the overlay. The installed-Chrome owner matrix independently passed the ordinary mobile navigation path. The final rerun is the successful 28-check evidence above.

The broader Client contract was rerun unchanged: `npx vitest run tests/unit/cui-03-client-shell-contract.test.ts --maxWorkers=1` still yields **10 passed, one baseline failure** at line 150 expecting the removed `onOpenCommandCenter` string. This is also absent at committed HEAD; no expectation was weakened and no removed module was restored. See `client-baseline.log` and the earlier baseline proof. Shared Client footer unit coverage passes; Admin browser behavior passes. No new live Client portal browser run is claimed.

Limits: actual authenticated owner data/session was not automated; the reproduced defect and final screenshots use actual routes with synthetic data. Headless screenshots exclude browser chrome. A production build and exhaustive business-workflow checks were not needed for the one-class layout correction. Technical Lead/owner visual approval remains required; no Git checkpoint is authorized.

### Final Git safety checkpoint

Authorized worktree only: `D:\lexnepal\.local\worktrees\ui-staff-admin-upgrade`.

HEAD and branch remain **`07945722e8b5207935828fc2032de9e6ce0f0e2a`**, **`ui/staff-admin-upgrade`**. Read-only `git ls-remote --heads origin ui/staff-admin-upgrade` returned that same SHA before editing. No intervening checkpoint commit/push existed. The original checkout was not modified.

Final `git status --short`:

```text
 M doc/ui-reference/staff-admin/SESSION-08-ENGINEERING-REPORT.md
 M src/app/(staff)/layout.tsx
 M src/index.css
?? doc/ui-reference/staff-admin/STAFF-SCROLL-FOOTER-CORRECTION-REPORT.md
?? scripts/qa/verify-staff-scroll.mjs
```

Tracked diff remains two files, **49 additions / 55 deletions** against committed HEAD (the one-class fix is inside the prior layout addition). The QA script/report are untracked and excluded from that tracked diff summary. The earlier CSS correction is preserved without additional changes. Session 08 remains untouched and unstaged, with SHA-256 `1ACEB9535586A43197F561057EEC9DB9409CAB5F12994629C43F86F5FE7BC78E`. No staged files, commits, pushes, merges, deployments, GitHub Staff audit or Session 16. **Stop for Technical Lead and owner visual review.**
