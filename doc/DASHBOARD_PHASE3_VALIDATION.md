# Srimar Law Dashboard Phase 3 Validation

> **Historical validation snapshot.** The browser-capture limitation recorded below was resolved by
> later full Playwright coverage. Use the current test suite and local release sign-off for release
> evidence.

## Completion status

The automated color, source-boundary, responsive-code, and runtime route checks are complete.
Authenticated visual capture is **blocked** because no in-app or connected browser session is
available. The screenshot approval gate therefore remains open; screenshots are not simulated or
generated.

## Final portal color matrix

| Region or meaning      | Admin                               | Staff                              | Client                            | Shared accessibility treatment                        |
| ---------------------- | ----------------------------------- | ---------------------------------- | --------------------------------- | ----------------------------------------------------- |
| Canvas                 | Deep navy                           | Deep navy                          | Soft blue-slate                   | Elevated panels and 3:1 panel boundaries              |
| Hero                   | Navy → indigo                       | Navy → cyan                        | Navy → teal                       | AA title and supporting text at both endpoints        |
| Primary action         | Indigo                              | Accessible deep cyan               | Royal blue                        | 4.5:1 labels, hover/pressed roles, visible focus      |
| Brand/milestone accent | Gold                                | Gold, hearings only                | Restrained gold                   | Dark foreground on soft gold surfaces                 |
| Positive               | Emerald                             | Emerald                            | Emerald                           | Label/icon plus semantic badge or progress treatment  |
| Information/active     | Royal blue                          | Cyan/blue                          | Royal blue/teal                   | Label plus selected surface or status rail            |
| Attention              | Amber                               | Amber/coral                        | Amber                             | Label plus panel, date tile, strip, or icon           |
| Danger/risk            | Rose                                | Rose                               | Rose, financial/destructive only  | Label plus icon/rail; never color alone               |
| Neutral                | Slate                               | Slate                              | Soft slate                        | Explicit empty-state copy and dashed boundary         |
| Charts                 | Gold, emerald, indigo, violet, cyan | Cyan, blue, emerald, amber, violet | Blue, teal, gold, emerald, violet | Named series, legends, AA labels/tooltips, 3:1 series |
| Focus                  | Gold in dark mode                   | Cyan                               | Teal                              | Two-pixel ring with canvas offset and ≥3:1 contrast   |

## Automated validation

`tests/unit/dashboard-contrast.test.ts` resolves the real CSS cascade for admin, staff, and client
themes in light and dark modes. It enforces:

- 4.5:1 for primary and secondary button labels in default, hover, and pressed states.
- 4.5:1 for hero title/supporting copy at both gradient endpoints.
- 4.5:1 for chart labels, tooltips, accent content, and semantic badge text.
- 3:1 for panel borders, keyboard focus rings, and each chart series against its panel.

The audit corrected:

- Light panel border `#DCE3F0` → `#8794AA`.
- Dark panel border `#2A3854` → `#5D6F90`.
- Staff light primary action `#0891B2` → `#0E7490` with matching interaction values.
- Staff hero supporting text `#CFFAFE` → `#E6FDFF`.
- Light danger action `#E54864` → `#C72C4F`.
- Low-contrast light gold chart series `#C99523` → `#9A6B00`.
- Dark chart series now receive portal-specific bright variants.
- Dark primary actions use a navy foreground; admin pressed indigo was adjusted to retain AA.

## State and responsive coverage

| State     | Implementation evidence                                                   | Visual approval |
| --------- | ------------------------------------------------------------------------- | --------------- |
| Populated | KPI, chart, hearing, task, workload, matter, and utilization layouts      | Pending browser |
| Empty     | Semantic `EmptyState` panels in all three dashboards                      | Pending browser |
| Loading   | Semantic loading surfaces in admin, staff, and client                     | Pending browser |
| Warning   | Staff urgency/hearings and client action-needed panel                     | Pending browser |
| Error     | Shared error state and danger semantic mapping                            | Pending browser |
| Disabled  | Native disabled plus `aria-disabled` and reduced-opacity state            | Pending browser |
| Long text | Truncation, wrapping, minimum-width protection, responsive stacking       | Pending browser |
| High data | Bounded hearing/task/workload lists, scrollable canvas, responsive charts | Pending browser |

Responsive layouts are implemented for mobile-first content, `sm` card/list transitions, desktop
sidebars, mobile drawers and headers, tablet-safe grids, and mobile bottom navigation.

## Color-blind differentiation

- Task priorities use text labels plus a left strip and tinted panel.
- Urgent hearings use an alert icon and `Urgent` label.
- Utilization uses percentage text, legend labels, and progress length in addition to color.
- Case status uses a labeled badge and a status rail.
- Revenue and practice-area charts include named legends; status is not communicated by hue alone.

## Scope boundary

Dashboard tokens remain scoped beneath `.dashboard-theme` and portal ownership classes. Source
scans found no dashboard token usage in `src/app/(public)` or `src/views/public`, so the public site
does not inherit the dashboard redesign. Shared portal shells opt in deliberately; unrelated CRUD
content retains its existing component theme.

## Required screenshot approval set

When a browser session is connected, capture these authenticated current-state images:

| Portal | 1440×900 | 1024×768 | 390×844 |
| ------ | -------- | -------- | ------- |
| Admin  | Pending  | Pending  | Pending |
| Staff  | Pending  | Pending  | Pending |
| Client | Pending  | Pending  | Pending |

The repository has no pre-Phase-2 screenshot files. A genuine before set can be rendered from commit
`92351c6` in an isolated worktree once browser capture is available; it must not be reconstructed or
generated and presented as evidence.

Manual authenticated checks still required: hover, pressed, selected and keyboard focus appearance;
chart tooltip rendering; mobile drawer and bottom navigation; populated/empty/loading/error fixtures;
long-text and high-data fixtures; and side-by-side role distinction.
