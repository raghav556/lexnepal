# Srimar Law Dashboard Color System

## Scope

Session 03 status: Staff/Admin search and scoped contrast contracts are verified with
isolated component QA. Full authenticated and reference acceptance remain outstanding.
The shared-token table below predates measured Client styling; exact runtime values
come from `src/index.css` and CMS resolution, not from historical table samples.

This contract applies only inside `.dashboard-theme` roots. Portal ownership is declared by one
additional class: `.dashboard-admin`, `.dashboard-staff`, or `.dashboard-client`. Public pages and
ordinary portal CRUD screens retain the existing application theme until they deliberately opt in.

The three dashboard roots are:

- `AdminDashboard`: `.dashboard-theme.dashboard-admin`
- `StaffDashboard`: `.dashboard-theme.dashboard-staff`
- `ClientDashboard`: `.dashboard-theme.dashboard-client`

## Core semantic tokens

Every dashboard color must be consumed through one of these roles. Components must not introduce
raw hex, RGB, HSL, OKLCH, or Tailwind palette colors.

| Token                                | Ownership |     Light value |      Dark value | Required use                     |
| ------------------------------------ | --------- | --------------: | --------------: | -------------------------------- |
| `--dashboard-canvas`                 | shared    |       `#F5F7FC` |       `#0C1222` | Dashboard page canvas            |
| `--dashboard-canvas-elevated`        | shared    |       `#EEF2F9` |       `#101A2C` | Elevated canvas bands            |
| `--dashboard-panel`                  | shared    |       `#FFFFFF` |       `#141D31` | Cards and sections               |
| `--dashboard-panel-hover`            | shared    |       `#F8FAFF` |       `#1B2942` | Hovered panels                   |
| `--dashboard-panel-pressed`          | shared    |       `#EDF2FB` |       `#202F4B` | Pressed panels                   |
| `--dashboard-border`                 | shared    |       `#8794AA` |       `#5D6F90` | Dividers and card borders        |
| `--dashboard-primary`                | portal    | portal-specific | portal-specific | Primary actions and selection    |
| `--dashboard-primary-hover`          | portal    | portal-specific | portal-specific | Primary hover                    |
| `--dashboard-primary-pressed`        | portal    | portal-specific | portal-specific | Primary pressed                  |
| `--dashboard-primary-foreground`     | shared    |       `#FFFFFF` |       `#FFFFFF` | Text/icons on primary            |
| `--dashboard-primary-soft`           | portal    | portal-specific | portal-specific | Selected and tinted surfaces     |
| `--dashboard-accent`                 | portal    | portal-specific | portal-specific | Legal milestone and brand accent |
| `--dashboard-accent-soft`            | portal    | portal-specific | portal-specific | Restrained accent surface        |
| `--dashboard-accent-foreground`      | portal    | portal-specific | portal-specific | Content on accent surfaces       |
| `--dashboard-hero-start`             | portal    | portal-specific | portal-specific | Hero gradient origin             |
| `--dashboard-hero-end`               | portal    | portal-specific | portal-specific | Hero gradient destination        |
| `--dashboard-hero-foreground`        | portal    | portal-specific | portal-specific | Hero title and action content    |
| `--dashboard-hero-muted`             | portal    | portal-specific | portal-specific | Hero supporting copy             |
| `--dashboard-hero-border`            | portal    | portal-specific | portal-specific | Hero boundary                    |
| `--dashboard-secondary`              | portal    | portal-specific | portal-specific | Secondary actions                |
| `--dashboard-secondary-hover`        | portal    | portal-specific | portal-specific | Secondary hover                  |
| `--dashboard-secondary-pressed`      | portal    | portal-specific | portal-specific | Secondary pressed                |
| `--dashboard-secondary-foreground`   | portal    | portal-specific | portal-specific | Secondary action content         |
| `--dashboard-focus`                  | portal    | portal-specific | portal-specific | Keyboard focus ring              |
| `--dashboard-chart-grid`             | shared    |       `#DCE3F0` |       `#2A3854` | Chart gridlines                  |
| `--dashboard-chart-label`            | shared    |       `#64748B` |       `#9EABC1` | Axis, legend and data labels     |
| `--dashboard-tooltip`                | shared    |       `#172033` |       `#F8FAFC` | Chart tooltip surface            |
| `--dashboard-tooltip-foreground`     | shared    |       `#F8FAFC` |       `#172033` | Chart tooltip content            |
| `--dashboard-success`                | semantic  |       `#059669` |       `#34D399` | Positive and completed states    |
| `--dashboard-success-soft`           | semantic  |       `#E7F8F1` |       `#123C35` | Success surface                  |
| `--dashboard-success-foreground`     | semantic  |       `#065F46` |       `#A7F3D0` | Success surface content          |
| `--dashboard-information`            | semantic  |       `#2563EB` |       `#60A5FA` | Informational and active states  |
| `--dashboard-information-soft`       | semantic  |       `#EAF1FF` |       `#172E56` | Information surface              |
| `--dashboard-information-foreground` | semantic  |       `#1E40AF` |       `#BFDBFE` | Information surface content      |
| `--dashboard-warning`                | semantic  |       `#D97706` |       `#FBBF24` | Pending and attention states     |
| `--dashboard-warning-soft`           | semantic  |       `#FFF5DB` |       `#443515` | Warning surface                  |
| `--dashboard-warning-foreground`     | semantic  |       `#92400E` |       `#FDE68A` | Warning surface content          |
| `--dashboard-danger`                 | semantic  |       `#C72C4F` |       `#FB7185` | Error, urgent and destructive    |
| `--dashboard-danger-soft`            | semantic  |       `#FFEDF1` |       `#4B1E2B` | Danger surface                   |
| `--dashboard-danger-foreground`      | semantic  |       `#9F1239` |       `#FECDD3` | Danger surface content           |
| `--dashboard-neutral`                | semantic  |       `#64748B` |       `#94A3B8` | Neutral indicators               |
| `--dashboard-neutral-soft`           | semantic  |       `#EEF2F6` |       `#263247` | Neutral and empty surfaces       |
| `--dashboard-neutral-foreground`     | semantic  |       `#334155` |       `#DBE4F0` | Neutral surface content          |

## Portal ownership

The Staff/Admin values below reflect source at Session 03. CMS primary overrides are
resolved by `portal-branding.ts`; Client disables that palette application. Alpha
text must be composited against its actual surface before calculating contrast.

### Admin — navy, blue, violet, gold

| Role               | Light                                   | Dark                                |
| ------------------ | --------------------------------------- | ----------------------------------- |
| Primary            | `#2563EB`                               | `#8C8DFF`                           |
| Primary hover      | `#1D4ED8`                               | `#8C8DFF`                           |
| Primary pressed    | `#4536B6`                               | `#6F70EF`                           |
| Primary foreground | `#FFFFFF`                               | `#0C1222`                           |
| Primary soft       | `#E4F1FF`                               | `#292852`                           |
| Focus              | `#487FFF`                               | `#D6AB42`                           |
| Border             | `#8390A2`                               | `#5D6F90`                           |
| Chart 1–5          | blue, green, brown-orange, violet, teal | gold, emerald, indigo, violet, cyan |

Session 03 darkens the light action, hero endpoint and two chart tokens to retain
AA text / 3:1 meaningful graphics contrast. Decorative metric tints remain separate.
The always-dark sidebar uses `#0F172A`–`#090E17`, `#F8FAFC` text and `#94A3B8`
muted/headings. Active blue is RGBA composited over this surface, not a hex color.
Section rails and brand frames are decorative; focus is tested against both sidebar
endpoints and active surfaces at 3:1. The dark legacy CRUD bridge remains role-owned.

### Staff — navy, violet, gold

| Role               | Light                              | Dark                              |
| ------------------ | ---------------------------------- | --------------------------------- |
| Primary            | `#6D28D9`                          | `#8554EA`                         |
| Primary hover      | `#5B21B6`                          | `#8757EC`                         |
| Primary pressed    | `#4C1D95`                          | `#7C3AED`                         |
| Primary foreground | `#FFFFFF`                          | `#FFFFFF`                         |
| Primary soft       | `#F5F3FF`                          | `#231B42`                         |
| Focus              | `#6D28D9`                          | `#8B5CF6`                         |
| Chart 1–5          | violet, emerald, blue, amber, teal | violet, sky, emerald, amber, rose |

The Staff sidebar stays navy with a gold focus token in both modes. The legacy dark
CRUD bridge uses the existing violet action tokens. Sessions 01/02 control borders
use neutral tokens; dark selected text is lightened for AA. No cyan palette is
introduced by the Staff/Admin upgrade.

### Client — historical generic palette (not the frozen reference contract)

The table below is retained as historical documentation. Client rendering is controlled
by `doc/ui-reference/client/LexNepal_Client_UI_Upgrade_Source_of_Truth_v1.0.docx`, its
measured token audit and existing scoped styles. It must not be changed to fit this table.

| Role                 |                                   Light |           Dark fallback |
| -------------------- | --------------------------------------: | ----------------------: |
| Primary              |                               `#3157D5` |               `#60A5FA` |
| Primary hover        |                               `#294BC0` |               `#7DB6FB` |
| Primary pressed      |                               `#223FA6` |               `#3B82F6` |
| Primary soft         |                               `#E9EFFF` |               `#172E56` |
| Secondary            |                               `#E4F3F1` |               `#173B3A` |
| Secondary hover      |                               `#D5EAE7` |               `#1C4A48` |
| Secondary pressed    |                               `#C4DEDA` |               `#205653` |
| Secondary foreground |                               `#134E4A` |               `#CCFBF1` |
| Focus                |                               `#0F766E` |               `#2DD4BF` |
| Chart 1–5            | royal blue, teal, gold, emerald, violet | same semantic ownership |

## Interaction states

All reusable dashboard primitives accept the same state vocabulary.

| State      | Visual contract                                     | Accessibility contract                                       |
| ---------- | --------------------------------------------------- | ------------------------------------------------------------ |
| `default`  | Base portal surface                                 | Normal semantic markup                                       |
| `hover`    | `panel-hover` or variant hover token                | Never required to reveal essential content                   |
| `pressed`  | `panel-pressed`, one-pixel motion where appropriate | Mirrors native active state                                  |
| `focus`    | Two-pixel portal focus ring plus canvas offset      | Must remain visible at 200% zoom                             |
| `selected` | Primary-soft surface plus primary border            | Pair with `aria-current`, `aria-selected`, or checked state  |
| `loading`  | Semantic pulse without layout shift                 | `aria-busy="true"`; controls disabled                        |
| `empty`    | Neutral-soft dashed surface                         | Explains the absence and offers a next action where possible |
| `disabled` | Reduced opacity and interaction lock                | Native `disabled` or `aria-disabled` required                |
| `warning`  | Warning-soft surface and warning border             | Include warning label/icon                                   |
| `error`    | Danger-soft surface and danger border               | Include error text/icon; never color alone                   |
| `success`  | Success-soft surface and success border             | Include confirmation text/icon                               |

## Reusable dashboard primitives

The dashboard-only component entry point is `@/components/dashboard`.

- `DashboardHero`: page identity, summary and primary actions.
- `MetricCard`: KPI value, semantic icon, trend and helper text.
- `DashboardSection`: titled content panel with optional actions.
- `StatusBadge`: normalized semantic status label.
- `ActionPanel`: information, warning, success or danger callout.
- `ChartSurface`: section shell with chart variables and legend region.
- `EmptyState`: explicit, accessible no-data presentation.
- `DashboardButton`: primary, secondary, outline, ghost and destructive actions.

Status-to-tone and chart mappings live in `src/lib/dashboard-semantics.ts`. New dashboard
statuses must be registered there rather than styled at the call site.

## Chart contract

Recharts must use `DASHBOARD_CHART_COLORS` and `DASHBOARD_CHART_THEME`. Embedded hex, RGB, HSL,
OKLCH, or Tailwind palette colors are prohibited in dashboard chart configuration.

- Axis and legend labels use `--dashboard-chart-label`.
- Gridlines use `--dashboard-chart-grid`.
- Tooltip surface, foreground and border use the three tooltip tokens.
- Series use the five portal-owned chart variables in stable order.
- Color is reinforced by labels, legend text, values, or line/bar shapes.

## Contrast and validation requirements

- Normal text and icon-label pairs: at least **4.5:1** against their surface.
- Large text at least 24px regular or 18.66px bold: at least **3:1**.
- UI boundaries, focus indicators and meaningful graphics: at least **3:1** against adjacent colors.
- Focus must be visible for keyboard navigation and may not rely on browser defaults alone.
- Tooltip text, chart axes and chart legends must meet the same text contrast requirements.
- Success, information, warning, danger and neutral states require a text label or icon in addition
  to color.
- Disabled controls must remain legible and must expose a disabled semantic state.
- Validation covers desktop, tablet and mobile, plus loading, empty, error and high-data states.

## Phase 1 acceptance checklist

- [x] Core canvas, surface, action, focus, chart and semantic tokens exist.
- [x] Admin, staff and client portal ownership is explicit.
- [x] Light and dark values are defined.
- [x] All eight reusable dashboard primitives exist with shared state variants.
- [x] The three dashboard roots are scoped without changing public pages.
- [x] Dashboard KPI, status, priority, utilization and chart colors use semantic mappings.
- [x] Recharts consumes shared CSS variables instead of embedded colors.
- [x] WCAG AA, focus and chart readability requirements are documented.

## Historical Phase 2 implementation checklist

These earlier implementation claims are not current acceptance evidence. Raw page
colors and frozen Client boundary-contract debt remain; see the Session 03 report.

- [x] Admin uses a navy/indigo executive canvas, gold/emerald revenue chart, multi-series practice chart, and semantic utilization states.
- [ ] Staff uses a navy/cyan workspace, priority task strips, hearing milestones, workload progress, and overdue danger states.
- [x] Client uses a soft slate canvas, navy/teal welcome hero, amber action panel, reassuring elevated cards, and semantic matter rails.
- [x] Desktop sidebars, mobile headers, drawers, and bottom navigation inherit their portal-owned tokens.
- [ ] Dashboard cards, buttons, badges, charts, progress indicators, loading, empty, hover, pressed, and focus states use named roles.
