# CUI-04 Primitive Audit

Implementation evidence only. This document does **not** replace:

`doc/ui-reference/client/LexNepal_Client_UI_Upgrade_Source_of_Truth_v1.0.docx`

The DOCX remains the owner-approved authority. CUI-04 standardizes the reusable Client visual vocabulary. It does not implement Home or later page composition.

Master visual reference: `doc/ui-reference/client/references/01-home.jpg`.

---

## A. Primitive inventory

| Primitive | Current implementation | Current Client usage | Staff usage | Admin usage | Public usage | Reference mismatch | Required Client treatment | Implementation method | Cross-role risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DashboardHero` | `dashboard-primitives.tsx`; `data-slot="dashboard-hero"`; `rounded-2xl`, `shadow-xl`, gradient, blur ornaments, white serif title | Client pages via `PortalPageShell` / `NepalDecoratedHero` | Staff dashboard/tasks banner | Admin dashboard banner | None | References use a light legal panel, not a SaaS gradient | Light panel, measured radius/shadow, hide ornaments, Playfair title only | Option A Client CSS + ornament `data-slot` | Low if Staff/Admin classes untouched |
| `NepalDecoratedHero` | Wraps `DashboardHero` + photo overlay + gold rail / dhaka | Client branded headers | Not used | Not used | None | Gold rail and dark photo wash are not the CUI-04 hero foundation | Keep as Client header host; hide rail/photo wash until CUI-05 | Option A + photo `data-slot` | None — Client-only wrapper |
| `MetricCard` | `rounded-2xl`, `hover:-translate-y-1`, `hover:shadow-lg`, icon scale | Client Home metrics | Staff KPI rows | Admin KPI rows | None | Home metrics are compact, quiet, no lift | Quiet card, no translate/scale, semantic icon, Inter label | Option A | Low |
| `DashboardSection` | `rounded-2xl`, elevated hover shadow, serif `h2` | Most Client pages | Most Staff pages | Most Admin pages | None | Operational Inter titles; subtle border/shadow; no hover lift | Inter section title, measured radius/shadow, transparent header | Option A + header `data-slot`s | Low |
| `DashboardButton` | `rounded-xl`, `h-9`, `shadow-blue-500/20`, `active:scale-[0.98]` | Widespread Client CTAs | Widespread | Widespread | None | Navy pill, no glow | Token navy / outline / ghost / danger; measured heights | Option A + `data-variant`/`data-size` | Low |
| `StatusBadge` | Hard-coded `blue/slate/sky/emerald/amber/rose` Tailwind | Client dashboard, hearings, documents, KYC | Staff statuses | Admin statuses | None | Client chips use semantic navy/green/amber/rose tokens | Override by `data-tone` under Client scope | Option A + `data-tone` | Low — Tailwind classes remain default |
| `DashboardStatusLabel` | Maps domain status → `StatusBadge` tone | Client pages that show case/doc status | Staff | Admin | None | None at primitive layer | Keep mapping; Client CSS restyles badge | No API change | None |
| `EmptyState` | Gradient surface, `rounded-2xl`, icon `hover:scale-110` | Client empty lists | Staff empty lists | Admin empty lists | None | Quiet panel, small icon, no motion | Flat panel, no scale | Option A + icon `data-slot` | Low |
| `ActionPanel` | Semantic tone classes, `hover:shadow-md` | Sparse | Staff help/action | Admin help | None | Soft/attention panels, no shadow growth | Token shadow, no hover growth | Option A + `data-tone` | Low |
| `DashboardFilterBar` | Flex wrap, border, no `data-slot` | Hearings, documents, matters | Staff filters | Admin filters | None | White/neutral toolbar, measured radius | Add `data-slot`, Client CSS | Option B | Low |
| `DashboardListRow` | `rounded-xl`, `hover:-translate-y-0.5`, shadow growth | Most Client lists | Staff lists | Admin lists | None | Quiet row, hover wash only | Kill translate/shadow growth in Client | Option A + `data-slot` | Low |
| `DashboardTable*` | `text-[11px]` headers, `bg-slate-50` hover | Documents/hearings table mode | Operational tables | Operational tables | None | 12px metadata, no slate hardcode on Client | Client CSS on new `data-slot`s | Option A + slots | Low — 11px remains Staff/Admin |
| `DashboardListSkeleton` | Pulse rows | Client loading lists | Shared | Shared | None | Simple, no decoration | Add `data-slot` only | Option B | None |
| `PortalPageShell` | Hard-coded `p-4 sm:p-6` / `space-y-6` | All Client pages | All Staff pages | All Admin pages | None | Client gutter 2rem / compact 1.25rem | Consume geometry tokens | Shared var substitution; base tokens already 1rem/1.5rem/1.5rem | Proven equivalent for Staff/Admin |
| `DashboardSegmentedControl` | Did not exist; pages hand-build Upcoming/Past/All | Hearings, documents view toggles | Occasional local chips | Occasional | None | Neutral track, selected white/navy | New shared primitive, unused by Staff/Admin | Option D inside dashboard system | None until later pages adopt it |
| Generic `Button` | `src/components/ui/button.tsx` | Sparse Client local | Shared | Shared | Public | Do not create a third button system | Leave; Client CTAs already use `DashboardButton` | No change | N/A |
| Chart / visualization | `ChartSurface` + chart tokens | Not a Client body primitive | Staff charts | Admin charts | None | Legitimate visualization | Leave | No change | None |

---

## B. Reference mapping

| Primitive / pattern | Frozen reference | Required trait | Page-level work deferred |
| --- | --- | --- | --- |
| Base panel / metric card | 01 Home | White card, hairline `#d7dde6`, 12px radius, contact shadow | CUI-05 Home composition |
| Matter card | 02 My Matters | Title, type, number, status, advocate, next event, View Matter | CUI-06 |
| Metadata / timeline | 03 Matter Details | Label/value rows, dated updates | CUI-07 |
| Hearing row | 04 Hearings | Date block, matter, court, purpose, status | CUI-08 |
| Action / checklist item | 05 Checklist | Title, matter, due, status, optional action | CUI-09 |
| Document row | 06 Documents | Type icon, name, matter, date, size, status, actions | CUI-10 |
| Notification / status | 11 Notifications | Compact status, readable list | CUI-15 |
| Filter / segmented | 02, 04, 06 | White toolbar, wrap, compact controls | Page phases adopt `ClientFilterBar` / `DashboardSegmentedControl` |

---

## C. Current defects (verified in source before CUI-04)

1. `DashboardHero` forced gradient, blur circles, `shadow-xl`, `rounded-2xl`, white title even when Client hero tokens are light.
2. `MetricCard` hover lift, shadow growth, icon zoom, bouncing chevron.
3. `DashboardSection` hover elevation and Playfair/serif operational titles.
4. `StatusBadge` hard-coded Tailwind palettes, no `data-tone`.
5. `EmptyState` gradient and icon scale.
6. `PortalPageShell` hard-coded gutters instead of CUI-02 tokens.
7. `DashboardListRow` hover translate.
8. Table headers `text-[11px]` and `slate-*` on Client.
9. Repeated local filter/segmented/status strings on Client pages (not rewritten in CUI-04).
10. No reusable Matter/Hearing/Document/Action/Timeline/Metadata presentational primitives.

---

## D. Implementation strategy

Preferred order used:

1. **Option A** — Client-scoped CSS under `.dashboard-theme.dashboard-client [data-slot=…]`.
2. **Option B** — Additive `data-slot` / `data-tone` / `data-variant` / `data-size` where hooks were missing.
3. **Option D** — `src/components/dashboard/client-primitives.tsx` for legal domain patterns, exported from the existing dashboard barrel.

No `isClient` / `premium` / `newStyle` props. No second design-system directory.

---

## E. Cross-role isolation strategy

- Default Tailwind classes on shared primitives remain Staff/Admin appearance.
- Client overrides are descendant selectors of `.dashboard-theme.dashboard-client` only.
- `PortalPageShell` token substitution is role-safe because base tokens already equal `p-4` / `sm:p-6` / `space-y-6` (`1rem` / `1.5rem` / `1.5rem`). Client tokens then apply 2rem / 1.25rem / 1.5rem.
- `NepalDecoratedHero` remains Client-only.
- New `DashboardSegmentedControl` is unused by Staff/Admin.
- Protected dirty files were not edited.

---

## F. New / modified primitive API

| API | Change | Default behavior |
| --- | --- | --- |
| `StatusBadge` | Adds `data-tone` | Same Tailwind classes |
| `DashboardButton` | Adds `data-variant`, `data-size` | Same classes |
| `DashboardHero` | Ornament/icon slots | Same markup/classes |
| `MetricCard` | Icon/value/label slots | Same classes |
| `DashboardSection` | Header/title/description/actions slots | Same classes |
| `EmptyState` | Icon slot | Same classes |
| `ActionPanel` | `data-tone` | Same classes |
| `DashboardFilterBar` / `DashboardListRow` / table parts | `data-slot` | Same classes |
| `PortalPageShell` | Geometry tokens + `data-slot` / `data-portal` | Staff/Admin computed padding unchanged |
| `DashboardSegmentedControl` | New, role-neutral | Quiet default chrome |
| `DashboardListSkeleton` | `data-slot` | Same |

---

## G. Client domain presentational components

File: `src/components/dashboard/client-primitives.tsx`

| Component | Props model | Data fetching | Mutations |
| --- | --- | --- | --- |
| `ClientPanel` / `ClientSoftPanel` / `ClientAttentionPanel` | variant, tone, children | NO | NO |
| `ClientFilterBar` | children | NO | NO |
| `ClientSegmentedControl` | items, value, onChange | NO | NO |
| `ClientMatterSummary` | title, type, number, status, advocate, next event, last update, action node | NO | NO |
| `ClientHearingSummary` | date, time, matter, court, purpose, status, action node | NO | NO |
| `ClientDocumentItem` | name, type, matter, date, size, status, icon, action node | NO | NO |
| `ClientActionItem` | title, matter, due, status, action node | NO | NO |
| `ClientTimelineItem` | title, date, category, description, matter, icon, action node | NO | NO |
| `ClientMetadataRow` | label, value | NO | NO |
| `ClientStatePanel` | loading / empty / error + EmptyState | NO | NO |

Callers own queries, downloads, calendar, and task mutation.

---

## H. Accessibility rules

- Interactive primitives keep button/link semantics from the existing dashboard system.
- Segmented control uses `tablist` / `tab` / `aria-selected` and visible focus rings.
- Loading surfaces expose `aria-busy`.
- Status always includes a textual label; color is not the only channel.
- Operational metadata floor is 12px (`--dashboard-text-meta-size`).
- Focus rings use `--dashboard-focus`.
- `prefers-reduced-motion` collapses Client duration tokens and remaining transitions.
- Domain primitives accept long wrapping titles/values.

---

## I. Before / after evidence

| Primitive | Reference | Before | After | Result | Remaining page-level work |
| --- | --- | --- | --- | --- | --- |
| Surfaces / cards | 01 | SaaS lift, 16px+ radius, heavy shadow | Measured 12px, contact shadow | Primitive PASS | CUI-05 layout |
| MetricCard | 01 | Hover jump, icon zoom | Static compact KPI | Primitive PASS | CUI-05 four-card composition |
| DashboardSection | 01–06 | Serif title, hover elevation | Inter 18px, quiet chrome | Primitive PASS | Page titles/copy |
| DashboardButton | 01 | Blue glow, 36px | Navy pill, 40px/32px | Primitive PASS | Page CTA placement |
| StatusBadge | 02–06, 11 | Tailwind rainbow | Semantic tokens | Primitive PASS | Domain label copy |
| Filter / segmented | 02, 04, 06 | Local strings | Shared primitive + CSS | Primitive available | Pages adopt in CUI-06/08/10 |
| List row | 04–06, 11 | Translate on hover | Wash only | Primitive PASS | Row content |
| Table | 04, 06 | 11px slate header | 12px token header | Primitive PASS | Responsive tables CUI-18 |
| Empty / loading | all | Gradient + scale | Quiet panel | Primitive PASS | Page empty copy |
| Hero foundation | 01 | Dark gradient + blur | Light legal panel | Foundation PASS | CUI-05 photo/greeting |
| Matter / hearing / document / action / timeline / metadata | 02–06 | Missing | Presentational primitives | Available, unused by pages | CUI-06–10 |

Staff/Admin screenshots: `.local/qa/cui-04/before` vs `.local/qa/cui-04/after`.

---

## J. Staff / Admin non-regression

Expected: no CUI-04-caused visual drift on `/staff`, `/staff/tasks`, `/admin`, `/admin/users` at 1440×900.

Method:

- Capture before from HEAD `a001bdf` while primitives still had default classes.
- After applies only Client-scoped CSS plus additive data attributes and token-equivalent PageShell geometry.

Known pre-existing exceptions remain out of scope:

- Repo-wide prettier on five baseline files
- `dashboard-color-system.test.ts` Admin sidebar-heading contrast

---

## K. Deferred page-specific work

| Phase | Work not done in CUI-04 |
| --- | --- |
| CUI-05 Home | Greeting, photograph hero, four metric composition, Your Matters / Upcoming Hearing bodies |
| CUI-06 My Matters | Matter list/card composition; do not edit protected `ClientCasesPage` |
| CUI-07 Matter Details | Detail sections/timeline; do not edit protected `ClientCaseDetailPage` |
| CUI-08 Hearings | Calendar/list composition using hearing primitive |
| CUI-09 Checklist | Action list composition |
| CUI-10 Documents | Document toolbar/list/table composition |
| CUI-11 Messages | Thread chrome |
| CUI-12 Appointments | Booking composition |
| CUI-13 Identity | KYC wizard chrome |
| CUI-14 Sign Documents | Signing list composition |
| CUI-15 Notifications | Notification list composition |
| CUI-16 Profile | Profile form composition |
| CUI-18 | Full a11y/responsive sign-off |

CUI-04 does not rewrite those page bodies to consume the new domain primitives.

---

## 10px / hard-coded color classification

| Finding | Class | Action |
| --- | --- | --- |
| `StatusBadge` blue/slate/sky/emerald/amber/rose | 1 Client primitive hardcode | Overridden in Client CSS; Staff/Admin keep classes |
| `DashboardButton` `shadow-blue-500/20` | 1 | Client CSS `box-shadow: none` |
| Table `bg-slate-50` / `text-[11px]` | 1 on Client, 2 on Staff/Admin | Client CSS only |
| Chart colors | 3 visualization | Unchanged |
| Protected Client case pages local pills | 4 page work | Deferred; files protected |
| `text-[10px]` in Client shared primitives | none found | — |
| `text-[11px]` table headers | operational metadata | Client floor 12px via CSS |
