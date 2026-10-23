# Session 17B — Shared premium KPI icons

2026-10-21, Asia/Kathmandu. Owner visually approved the design and authorized a guarded checkpoint after baseline verification. Known failures remain explicitly recorded; no all-green release claim. The status below records the implementation before staging.

## Baseline and scope

Worktree `D:\lexnepal\.local\worktrees\ui-staff-admin-upgrade`, branch `ui/staff-admin-upgrade`. Local and freshly queried origin HEAD: `45419a13c6ffdc3cd7f0dd4cb85665611877d5a4`. Origin `https://github.com/raghav556/lexnepal.git`; Git identity verified before editing. Read AGENTS.md, the installed Next.js client-component guide and the Client source-of-truth Markdown/authoritative DOCX.

Protected Session 08 remains unchanged and unstaged, SHA-256 `1ACEB9535586A43197F561057EEC9DB9409CAB5F12994629C43F86F5FE7BC78E`. Reused localhost:3001. No original-checkout edits, live mutations, dependencies, backend changes, builds, staging, commits, pushes, merges or deployments.

## Staff coverage — 12 applicable routes / 12 audited

Every active destination already uses four shared MetricCards: 48 existing icons. No custom summary badge or new KPI was needed. Navigation, hero chips, button, form and status icons are excluded.

| Route | Existing KPI labels | Shared component / density | Change needed | Result |
| --- | --- | --- | --- | --- |
| `/staff` | Active cases; Hearings this week; Tasks due today; Unread messages | MetricCard / compact | Remove soft square overrides | Circular filled badges verified |
| `/staff/tasks` | Active tasks; Due today; In progress; Done | MetricCard / default | Remove soft square overrides | Verified |
| `/staff/cases` | Total matters; Active; On hold; Closed | MetricCard via cases-workspace / default | Remove soft square overrides | Verified |
| `/staff/hearings` | Today's hearings; Scheduled; Conflicts; Past archive | MetricCard / default | Remove soft square overrides | Verified |
| `/staff/documents` | Documents (In trash in trash view); Awaiting signature; On legal hold; Pending scan | MetricCard / default | Remove soft square overrides | Verified |
| `/staff/research` | Research notes; Linked matters; Research categories; Recent additions | MetricCard / default | Remove soft square overrides | Verified |
| `/staff/crm` | Total leads; New leads; Consultations; Converted | MetricCard / default | Remove soft square overrides | Verified |
| `/staff/clients` | Total clients; Active matters; KYC pending; New this month | MetricCard in active StaffClientsWorkspace / default | Remove soft square overrides | Verified |
| `/staff/messages` | Client conversations; Direct messages; Case teams; Unread | MetricCard / default | Adopt shared geometry | Verified |
| `/staff/appointments` | Today; Upcoming; Pending confirmation; Completed this month | MetricCard / default | Replace soft circular overrides | Verified |
| `/staff/content` | Total content; Drafts; Under review; Published | MetricCard / default | Remove soft square overrides | Verified |
| `/staff/hr` | Hours Today; Days Recorded; Pending Leave; Annual Leave Remaining | MetricCard / compact | Replace local circle sizing | Shared reference pattern verified |

Existing DashboardTone assignments and conditional meanings remain unchanged, including overdue/conflict/hold/scan states. Pending values were not reclassified. The unused older StaffClientsPage is not the active route implementation.

## Shared implementation and portal isolation

- `MetricCard` gains one styling class on its existing `data-slot="metric-card-icon"` span. Its original semantic fill map, shadows, props, ARIA, states, values, handlers and density classes are unchanged. No duplicate component, color map or icon library.
- One Staff/Admin-scoped CSS block supplies 50% radius, nonshrinking equal dimensions and a 50% glyph ratio. Default/compact badges are 44/40px at desktop/tablet and 36/32px below 768px. Existing semantic background and `shadow-sm` utilities supply fill/elevation. Existing panel/canvas tokens provide contrasting light/dark glyph ink; primary retains its semantic foreground token. No hard-coded palette was added.
- Removed 169 competing Staff icon declarations and aligned 24 existing metric grid columns to the shared size variable. Page-specific card layouts, labels, values and spacing otherwise remain intact. No queries, APIs, actions, permissions or module page sources changed.
- Admin's six existing compatible consumers adopt the same scoped pattern: Dashboard (6 icons), Users (4), Appointments (3), HR (4), Analytics (4), Audit (4): 25 icons. Existing Admin tone tokens and card composition remain authoritative.
- Client Home's four compact MetricCards retain the frozen tinted card/square badge design. All 12 width/theme comparisons preserve measured card/icon/glyph sizes and badge paint. Parsed Client/public CSS rules are identical to HEAD; only the inert shared marker reaches Client markup. Extending circular geometry to this frozen Client design requires a separate owner decision.
- Sidebar/rail/drawer, Create, account/profile/session controls, language, public My Portal, positioned Staff main, footer and Top sources were not edited. All 116 route measurements have zero horizontal/body/outer-shell scroll range where applicable. Staff navigation still measures 12 destinations, with no bottom bar.

## QA and failures

Evidence root: `.local/qa/session-17b/`. Chromium `151.0.7922.34`; synthetic identities/API fixtures only. All API writes are intercepted; recorded writes and live mutations are both zero.

| Check | Result |
| --- | --- |
| New icon tests | **15 passed**, `focused-unit.json` / `focused-unit.log` |
| Relevant broader unit run | **90 passed, 2 baseline failures**, 7 files / 92 tests; `unit.log` |
| Actual-route geometry/data/isolation | **116 passed**: all 12 Staff and 6 Admin routes at 360/1440 light/dark, representative intermediate widths, Client at all 6 widths/light/dark |
| Actual-component state/density fixtures | **8 passed**, 384 presentations covering all 6 tones, both densities, default/loading/empty/error, long labels/values, Staff/Admin light/dark at 360/1440 |
| Keyboard interaction | **3 passed**: Staff/Admin/Client dashboard metric Tab/Shift+Tab order, visible focus and Enter navigation to existing cases routes; `interaction-evidence.json` |
| Axe WCAG A/AA | **27 scans: 26 without reported violations, 1 with existing loading-label contrast finding**; all 19 actual-route scans clean |
| Browser exceptions | **0** |
| Focused ESLint / TypeScript | Passed, exit 0; `eslint.log`, `tsc.log` |
| Whitespace | `git diff --check` and explicit new-file whitespace/EOF checks pass |

The browser geometry/state total is **124**, plus three keyboard checks. The main browser command exits **1** because it retains a strict zero-violation accessibility gate; geometry passes do not turn the accessibility finding into a pass.

Failures and independent baseline evidence:

1. `dashboard WCAG contrast contract > client light keeps boundaries, focus, and chart series distinguishable`, `dashboard-contrast.test.ts:122`: `expectPair(theme, "dashboard-border", "dashboard-panel", 3)` fails because existing Client light border `#d7dde6` against white has ratio **1.3658865845479475:1**, below 3:1. Frozen Client tokens are unchanged.
2. `dashboard WCAG contrast contract > rejects pure black and unapproved one-off colors in dashboard UI source`, `dashboard-contrast.test.ts:166`: `expect(source).not.toMatch(rawPalette)` fails on the untouched AdminDashboard's existing `bg-emerald-` class. The committed source and test are unchanged.
3. Axe **`color-contrast`** in the isolated **Admin/light SSR fixture, 1440 × 900, both densities and all six tones** exposes **12 low-contrast label nodes** during the existing whole-card loading pulse. It is an `about:blank` actual-component fixture using Admin styling, not an actual `/admin/hr` route failure; that route supplied the original stylesheet. A representative element is `[data-state="loading"][data-tone="primary"] > .mt-1.text-xs.font-semibold` (the MetricCard label). The original moving-animation scan observed 3.03:1 against the required 4.5:1. The earlier marker-only replay is retained in `loading-baseline-replay.json`. No loading text, animation, colors or state handling was changed to conceal the issue.

`baseline-proof.json` independently compares HEAD inputs, unchanged component behavior and Client/public CSS. No existing test was edited, weakened or skipped. Historical Client Command Center contract failure (`onOpenCommandCenter`) and public logo HTTP 404 remain documented in Session 17A; neither was changed or rerun here. No new authenticated persistence, full-suite or production-build claim.

Commands:

```text
npx vitest run tests/unit/metric-icon-system.test.ts tests/unit/dashboard-color-system.test.ts tests/unit/dashboard-contrast.test.ts tests/unit/cui-04-client-primitives-contract.test.ts tests/unit/cui-05-client-home-contract.test.ts tests/unit/staff-responsive-navigation.test.ts tests/unit/staff-hr-model.test.ts --maxWorkers=1
npx vitest run tests/unit/metric-icon-system.test.ts --reporter=json --outputFile=.local/qa/session-17b/focused-unit.json
npx eslint src/components/dashboard/dashboard-primitives.tsx tests/unit/metric-icon-system.test.ts scripts/qa/verify-kpi-icons.mjs --max-warnings=0
npx tsc --noEmit
node scripts/qa/verify-kpi-icons.mjs
node scripts/qa/verify-kpi-icons.mjs --interaction-only
git diff --check
```

To regenerate isolated SSR fixtures, set `KPI_ICON_QA_FIXTURES=1` for the new unit test. Baseline screenshots were captured with `--before` before production edits; do not overwrite them after editing. The actual-route harness reuses the committed Session 17A fixture/interception setup, not a parallel product component. A checked `--resume` mode consolidated route results after correcting harness-only assumptions (Admin Appointments has three KPIs; Next dev installs inline styles). Those attempt logs are retained; no failed product check was marked passed. Final accessibility findings remain in JSON/log output.

## Screenshots

58 actual PNGs under `.local/qa/session-17b/`, including 24 pre-edit captures. Matching before/after screenshots use the same viewport/theme/synthetic data; browser time can affect hero dates.

- Staff Tasks desktop: `before-staff-tasks-1440-light.png` / `after-staff-tasks-1440-light.png`.
- Staff Dashboard mobile: `before-staff-360-dark.png` / `after-staff-360-dark.png`.
- HR reference: `before-staff-hr-1440-light.png` / `after-staff-hr-1440-light.png`, plus matching 360/dark.
- Admin: `before-admin-1440-light.png` / `after-admin-1440-light.png`, plus matching 360/dark.
- Frozen Client comparison: `before-client-1440-light.png` / `after-client-1440-light.png`, plus matching 360/dark and all measured widths in JSON.
- Tablet/intermediate examples: `after-staff-tasks-768-light.png`, `after-staff-hr-768-dark.png`, `after-admin-768-light.png`.
- State/density fixtures: `variants-{staff|admin}-360-{light|dark}.png`.

Representative Tasks desktop, HR mobile, Admin mobile and frozen Client captures were visually inspected. Axe scope is the metrics/state fixtures; it does not certify entire portals. Main route data is synthetic/mostly empty; long values and loading/error/empty presentations are separately checked using actual-component SSR. Exhaustive live-data permutations and unrelated business workflows were not exercised.

## Exact changed files and implementation-time status

Implementation: `src/components/dashboard/dashboard-primitives.tsx`, `src/index.css`.

New: `tests/unit/metric-icon-system.test.ts` (shared component contract/optional SSR evidence), `scripts/qa/verify-kpi-icons.mjs` (intercepted actual-route and state QA), this report. No new production component was necessary.

```text
 M doc/ui-reference/staff-admin/SESSION-08-ENGINEERING-REPORT.md
 M src/components/dashboard/dashboard-primitives.tsx
 M src/index.css
?? doc/ui-reference/staff-admin/SESSION-17B-KPI-ICON-REPORT.md
?? scripts/qa/verify-kpi-icons.mjs
?? tests/unit/metric-icon-system.test.ts
```

Session 08 is the protected pre-existing change. This status was recorded before the separately authorized guarded checkpoint; at that point the index was empty and HEAD/branch unchanged.

## Final guarded checkpoint verification

The owner authorized this five-file checkpoint only after proving the exceptions pre-existing and unchanged. Fresh verification against committed baseline `45419a13c6ffdc3cd7f0dd4cb85665611877d5a4` established:

- The **unchanged contrast test** was executed in an ignored snapshot containing its actual committed source inputs: **15 passed, exactly the same two tests failed**. `committed-baseline-unit.json` / `.log` contain the results. A fresh current run of that test plus the new icon tests produced **30 passed / the same two historical failures**, with all 15 new tests passing (`checkpoint-unit.json` / `.log`). Source/token comparisons establish identical failing inputs, not merely matching failure counts. The earlier broader result remains 90 passed / 2 failed.
- Baseline and current CSS were independently compiled from their full source using the installed project PostCSS/Tailwind configuration, without changing either checkout or starting a server/build. The baseline component is byte-identical to the current component after removing the one new marker, so the SSR baseline markup is exact. At the same pulse midpoint (**1000ms, opacity 0.5**), baseline/current label styles and all 12 axe findings match exactly: **2.27:1** in both, versus 4.5:1 required. This differs from the moving-animation observation because the phase is fixed. Evidence: `checkpoint-css-proof.json`, `committed-baseline-axe.json` / `.log`; isolated probe source retained alongside it. No network request was permitted in this paired probe.
- All **100 changed CSS rule groups** were checked property-by-property: only badge styling, shared badge variables and associated metric grid columns differ. Client/public rules and existing test source remain unchanged (`checkpoint-scope.json`). Scope remains exactly the five approved paths; Session 08 is excluded.
- Fresh focused ESLint passes (`checkpoint-eslint.log`); TypeScript's prior successful result remains applicable because no executable source has changed since that run. Final whitespace and staged-scope verification are required before commit. Historical Client Command Center and public logo limitations remain unchanged.

**Disposition:** the guarded Session 17B checkpoint accepts these verified historical exceptions as known limitations for separately authorized Session 18 work. **26/27 scans are clean; one remains classified, not passed or suppressed.** The strict browser command still exits 1 for that finding. Live persistence, production builds and full-suite coverage remain unverified. No pagination or Session 18 implementation is part of this checkpoint.
