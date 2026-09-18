# CUI-02 Measured Client Design Tokens

Implementation evidence only. This document does **not** replace or revise:

`doc/ui-reference/client/LexNepal_Client_UI_Upgrade_Source_of_Truth_v1.0.docx`

The DOCX remains the owner-approved authority. These measurements convert the frozen JPEG pack into Client-scoped CSS tokens.

Measurement method:

- Pillow 12.3.0, RGB, interior patches away from edges where possible.
- JPEG compression noise handled with median RGB plus 4-bit/8-bit quantized mode.
- Geometry taken from `01-home.jpg` (1400×876), then scaled to the Source-of-Truth 1536×961 source (`1400/1536 = 876/961 = 0.911458`).
- Light/white sidebars in supporting screenshots are recorded and **rejected**. Home dark navy wins.

Reference SHA-256 (unchanged during CUI-02):

| File | Pixels | SHA-256 |
| --- | --- | --- |
| `01-home.jpg` | 1400×876 | `C8BA89F9F2E6206DB349E74962D25E0039A04C4DA87EEF8F8ECA93986493CB5E` |
| `02-my-matters.jpg` | 1400×876 | `6CCAD951904A144BB0A2E6C6F955EBAAE7B11E0F6F06B77654E0748996766B22` |
| `03-matter-details.jpg` | 1400×933 | `DE97A61DF58848A67CB4BF70C6B4A37DC01A2B41FE8FACE73C0D3CAD8CA8F335` |
| `04-hearings.jpg` | 1400×933 | `8B87859A463E4FBA687C937DC76C552AA189CA3A5B1306B62DB5FDBEF790DEAF` |
| `05-checklist.jpg` | 1400×933 | `77E9D05F8B9995EF2B2C65BD0B63C2FA41370AC2D2A0231C3A508112C3A8FC2E` |
| `06-documents.jpg` | 1400×876 | `E1E4C42E95296DE30187D6B6D358D32B5C67459EE321750AEBFA7705939ADE32` |
| `07-messages.jpg` | 1400×876 | `C45617D69B6E9051BF2C9A38935688F1A30531D0A71A02247E8EA3DC3B009D83` |
| `08-appointments.jpg` | 1400×876 | `6953371FB141BF2E52CAA9065E29FAD34142B7802F50996431007A067271C88E` |
| `09-identity-verification.jpg` | 1400×876 | `186DB03D13892ED6C703C425A47BC5B4FCED9E68AABFD5995D1D7257D1AFB19E` |
| `10-sign-documents.jpg` | 1400×876 | `6A970FFDF49F6798C4207EC2AEF35D8BDAF57E54650E5AAF18EB8F2AEE123A86` |
| `11-notifications.jpg` | 1400×876 | `D2480F975252F252E50538914863A6C666000711BA4F535BC1E107F68DFB7B4A` |
| `12-profile.jpg` | 1400×876 | `588856DF7C60266141222C8A4BBCC123CC4BDF728570C251BE7B380CDED2AA2F` |

---

## A. SOURCE REFERENCES

| Role | File | Use |
| --- | --- | --- |
| **Master / global shell** | `01-home.jpg` | Dark sidebar, topbar, canvas, palette, cards, primary/secondary actions, spacing, support/footer, typography character |
| Supporting body (dark-or-mixed shell; **light sidebar rejected**) | `02-my-matters.jpg`, `04-hearings.jpg`, `06-documents.jpg`, `07-messages.jpg`, `08-appointments.jpg` | Repeated cards, filters, lists, status chips |
| **Body-only** (light/white sidebar **rejected**) | `03-matter-details.jpg`, `05-checklist.jpg` | Detail/checklist composition and semantic fills only |
| Supporting (dark sidebar present; aligns with Home) | `09-identity-verification.jpg`, `10-sign-documents.jpg`, `11-notifications.jpg`, `12-profile.jpg` | Secondary surfaces, forms, status, active nav |

Do not average conflicting page shells. Home dark sidebar is the locked Client shell.

---

## B. COLOR MEASUREMENT TABLE

| Token purpose | Reference | Sample region | Measured representative | Current repo token | Final Client token | Reason / evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Canvas | 01 Home | Interior right of sidebar `(250,200)-(280,250)` and greeting field | Median `#F9FBFE` / `#F8FAFB` | inherited `#f8fafc` | `#f7f9fc` | Cool near-white canvas behind white cards. JPEG medians cluster F7–FB. |
| Elevated canvas | 01 Home | Nested/filter chips, 02 search fill | `#EAF1FB` / `#EEF2F7` | inherited `#f1f5f9` | `#eef2f7` | Slightly cooler elevated well for chips/inputs. |
| Panel / card | 01 Home | Card interiors `(1080,300)-(1220,360)` | Median `#FEFEFE` | inherited `#ffffff` | `#ffffff` | White elevated cards. |
| Panel hover | 01 Home | No hover frame in stills | n/a | inherited `#f8fafc` | `#f5f8fb` | 2–3% cool tint; no lift. |
| Strong text | 01 Home | Title dark pixels `(280,100)-(700,145)` | Median `#0D1631` | `:root` oklch ~navy | `#10182c` | Playfair/Inter title ink. |
| Secondary text | 01 Home | Subtitle `(280,145)-(620,175)` | Median `#767A87` (4.28:1 — below 4.5) | `:root` muted | `#5e6672` | Darkened one step so body secondary text meets 4.5:1 on white (`5.91:1`). |
| Muted text | 01 Home | Footer `(280,840)-(900,872)`; search placeholder | `#9CA1A9` / `#8A8F97` | `#64748b` inherited | `#5e6672` | Same secondary/muted family; 12px metadata remains readable. |
| Primary blue / navy | 01 Home | Sidebar navy + filled CTAs | Sidebar median `#0A2745` / `#0B2745`; CTA `#0B3156`; SoT clue `#0B2846` | `#3157d5` | `#0b2846` | JPEG ±1 of SoT navy. Filled buttons are the same navy family, not bright cobalt. |
| Primary hover | derived | 12% mix toward black | `#092338` | `#294bc0` | `#092338` | No hover still; darken filled navy. |
| Primary pressed | derived | 22% mix toward black | `#081C30` | `#223fa6` | `#081c30` | Pressed navy. |
| Primary soft | 01 Home | Metric “Active Matters” fill | Median `#EFF6FE` | `#e9efff` | `#eef6fe` | Soft information/primary wash. |
| Sidebar main navy | 01 Home | Flat interior `(40,380)-(90,430)` n=105383 dark sat pixels | Median `#0A2745`, mean `#0C2846` | `#1e3a6e` | `#0b2846` | Matches SoT `#0B2846`. |
| Sidebar deep navy | 01 Home | Top strip `(20,1)-(230,20)` and bottom navy | `#092441` / `#092543` | `#0f2040` | `#081f38` | Subtle vertical deepening only. No glow. |
| Sidebar foreground | 01 Home | Active label / icons | Near-white | `#ffffff` | `#f4f7fb` | 14.93:1 on `#0b2846`. |
| Sidebar muted | 01 Home | Inactive Documents row light pixels | Median `#95A7BE`; clustered `#A9C4DC` | `#93b4dc` | `#a9c4dc` | 8.26:1 on navy. |
| Sidebar hover | 01 Home | No hover still | n/a | `rgba(255,255,255,0.08)` | `rgba(255,255,255,0.06)` | Restrained. |
| Sidebar active | 01 Home | Home pill `(20,90)-(220,135)` | Median `#123A66` | `rgba(59,130,246,0.35)` | `#123a66` | Solid lighter-navy pill, not translucent blue. |
| Sidebar active text | 01 Home | Active pill | White | inherited `#ffffff` | `#ffffff` | 11.52:1 on `#123a66`. |
| Sidebar active icon | 01 Home | Home icon on pill | White (gold only in brand mark) | `#93c5fd` | `#ffffff` | Active icon is paper-white, not sky-blue. |
| Sidebar border | 01 Home | Seam x≈235 | Soft navy edge | `rgba(255,255,255,0.1)` | `rgba(255,255,255,0.08)` | Hairline. |
| Focus ring | derived / 04 Hearings navy CTAs | Interactive blue family `#1A4F8A` / `#04468F` | `#0f766e` teal | `#1a4f8a` | Visible on white; not teal, not gold-on-canvas. |
| Restrained gold / accent | 01 Home | Logo gold pixels `(8,8)-(90,70)` | Median `#B19364`, mode `#C4A064` | `#c99523` | `#c4a064` | Brand brass. Quote/trust lines are the same family; JPEG on photo is noisier (`#AA896E`). |
| Success | 09 Identity; 03 Active badge | 09 progress `#2F9D6B` (3.41:1 fail); 03 badge `#447D65` | `#059669` inherited | `#1f7a54` | Darkened measured green to 5.29:1 on white. Soft from 01 teal metric `#F2FDF9` → `#e8f6ef`. |
| Success soft | 01 Home teal metric | `#F2FDF9` | `#ecfdf5` | `#e8f6ef` | |
| Information | 01 metric icon; 06 Reviewed | Icon `#497EC7`; hearings navy `#04468F` | `#2563eb` | `#1a4f8a` | Link/info blue used on canvas; 8.30:1. |
| Information soft | 01 metric blue | `#EFF6FE` | `#eff6ff` | `#eef6fe` | Same as primary-soft. |
| Warning | 01 cream metric; 06 required rows | Fill `#FCF9F6`; amber ink not a clean JPEG sample | `#d97706` | `#b45309` | Amber that meets text contrast; cream wash preserved. |
| Warning soft | 01 cream metric | `#FCF9F6` | `#fffbeb` | `#fcf9f6` | |
| Danger | 01 Messages badge; 06 attention card | Badge median `#E53939`; attention soft `#FCF3F7` | `#e11d48` | `#c81e4a` | Badge red darkened slightly for 5.61:1 text; chip red stays `#e53939` on sidebar. |
| Danger soft | 06 Documents attention | `#FCF3F7` / 01 pink metric `#FDF1F5` | `#fff1f2` | `#fdf1f5` | |
| Neutral | 01 secondary text | `#5E6672` | `#64748b` | `#5e6672` | |
| Border | 01 card edges | Border-ish `#CFD3DC` / `#E0E0E4` | inherited `#8390a2` (too dark) | `#d7dde6` | Hairline cool gray. Base `#8390a2` is not the Client card edge. |
| Input / background | 01 search; 12 profile fields | Search fill white `#FEFEFE` | `:root` warm ivory | `#ffffff` | White control on light canvas, hairline border. |

Generic variables `--foreground`, `--muted-foreground`, `--card`, `--border`, `--input`, `--ring`, `--primary` are overridden **only** inside `.dashboard-theme.dashboard-client` so shared primitives that do not read `--dashboard-*` still pick up the measured canvas. `:root`, `.dark`, `.dashboard-theme` base, `.dashboard-admin`, and `.dashboard-staff` are unchanged.

---

## C. GEOMETRY TABLE

Scale used: JPEG 1400×876 ↔ source 1536×961 (`k = 1/0.911458 ≈ 1.097`). Target CSS assumes 16px root.

| Token | Reference measurement | Normalized ratio | Final CSS token | Reason |
| --- | --- | --- | --- | --- |
| Sidebar width | 01 Home: first light at x=235 / last dark x=233 (mode 37/55 rows) | 235/1400 = 16.79% → 258px at 1536; SoT 260px | `--dashboard-sidebar-width: 16.25rem` (260px) | JPEG confirms SoT ~260px. Previous Client value `15rem` was short. |
| Topbar height | 01 Home search row ~y=8–58; SoT 64px of 961 | 64/961 = 6.66% | `--dashboard-topbar-height: 4rem` | 64px source bar. Previous `3.5rem`. |
| Desktop gutter | Sidebar seam x=235 → first metric card ~x=266 | 31px JPEG → 34px source; SoT 30–32px | `--dashboard-content-gutter: 2rem` | Locked to SoT 32px band. |
| Compact gutter | derived (mobile/tablet) | ~20px | `--dashboard-content-gutter-compact: 1.25rem` | Not a 390px crop; stepped down from desktop. |
| Section gap | Metric row to “Your Matters” ~y=250–290 | ~40px JPEG → ~1.5–2rem | `--dashboard-section-gap: 1.5rem` | Matches current shared rhythm; reference is not airy SaaS. |
| Card / grid gap | Metric 1 right edge ~x=524, next card ~x=540 | ~16px JPEG → 1rem | `--dashboard-grid-gap: 1rem` | Four Home metric cards. |
| Card padding | Metric/card interiors | ~20px source | `--dashboard-panel-padding: 1.25rem` | |
| Compact card padding | denser lists 06/07 | ~16px | `--dashboard-panel-padding-compact: 1rem` | |
| Card radius | 01 Home cards: moderate, not pill | ~12px | `--dashboard-radius-card: 0.75rem` | Restrained. `rounded-2xl` on shared hero is a CUI-04 mismatch. |
| Input radius | Profile fields: small rounding | ~8px | `--dashboard-radius-control: 0.5rem` | |
| Button / search radius | 01 search and CTAs are pills | 999px | `--dashboard-radius-pill: 999px` | Search and primary/secondary buttons. |
| Input / control height | Search in 64px topbar | ~40px | `--dashboard-control-height: 2.5rem` | |
| Standard button height | Filled CTAs | ~40px | `--dashboard-control-height: 2.5rem` | Same as inputs. |
| Compact control height | chips / table actions | ~32px | `--dashboard-control-height-compact: 2rem` | |
| Icon sizes | Nav ~20px; metric ~24px; small 16px | — | `--dashboard-icon-size-sm: 1rem`; `--dashboard-icon-size: 1.25rem`; `--dashboard-icon-size-lg: 1.5rem` | |

Markup still hard-codes some padding (`PortalPageShell` `p-4 sm:p-6`, `space-y-6`). Tokens are defined now; consumption is CUI-03/CUI-04.

---

## D. TYPOGRAPHY TABLE

Fonts already imported in `src/index.css`. No new family. No global import change.

| Role | Family | Weight | Size | Line-height | Tracking | Usage rule |
| --- | --- | --- | --- | --- | --- | --- |
| App / interface | Inter (`--dashboard-font-sans`) | 400 | 0.875rem (14px) | 1.5 | 0 | Default operational UI. |
| Branded / display | Playfair Display (`--dashboard-font-display`) | 600 | 2rem (32px) | 1.2 | -0.01em | Home greeting and rare brand moments only. Not body. |
| Nepali | Mukta (`--dashboard-font-nepali`) | 400–600 | inherit | inherit | 0 | `lang=ne` / `.dashboard-lang-ne` only. |
| Page title | Playfair Display | 600 | 2rem / 1.75rem compact | 1.2 | -0.01em | “Good Morning, Ravi”; “My Matters”. |
| Section title | Inter | 600 | 1.125rem (18px) | 1.35 | 0 | “Your Matters”, “Upcoming Hearing”. |
| Card title | Inter | 600 | 1rem (16px) | 1.4 | 0 | Matter names, document names. |
| Body | Inter | 400 | 0.875rem | 1.5 | 0 | Descriptions, help copy. |
| Secondary body | Inter | 400 | 0.8125rem (13px) | 1.45 | 0 | Supporting sentences. Floor: do not go below 12px. |
| Metadata | Inter | 400 | 0.75rem (12px) | 1.4 | 0 | Dates, case numbers, “2 days ago”. |
| Label | Inter | 500 | 0.75rem | 1.3 | 0.02em | Form labels. |
| Button | Inter | 600 | 0.875rem | 1 | 0 | Filled and outline CTAs. |
| Overline / eyebrow | Inter | 500 | 0.75rem | 1 | 0.12em | “CLIENT PORTAL”. Uppercase. |

CSS tokens implemented: `--dashboard-font-sans|display|nepali`, `--dashboard-text-title-size`, `--dashboard-text-section-size`, `--dashboard-text-body-size`, `--dashboard-text-meta-size`. Remaining rows are the contract for CUI-04/CUI-05; do not invent a fourth font.

---

## E. EFFECTS TABLE

| Effect | Decision | Token / rule |
| --- | --- | --- |
| Card shadow | Barely-there contact shadow; cards also use hairline border | `--dashboard-shadow-card: 0 1px 2px rgba(11, 40, 70, 0.06)` |
| Raised / active shadow | Small, no lift-on-hover theatrics | `--dashboard-shadow-raised: 0 4px 12px rgba(11, 40, 70, 0.08)` |
| Border | Cool gray hairline | `--dashboard-border: #d7dde6` |
| Focus ring | Navy-blue, 2px, not gold glow | `--dashboard-focus: #1a4f8a`; `--ring: #0b2846` |
| Hero overlay / pattern | Home uses a photograph, not dhaka glow. Keep a whisper of existing Nepal pattern until CUI-05 | `--dashboard-hero-pattern-opacity: 0.04` (was inherited 0.05) |
| Sidebar gradient | Almost flat navy; 4–6% deepen toward bottom. No glow (`brand-glow: transparent`) | `from #0b2846 to #081f38` |
| Transition duration | Quiet | `--dashboard-duration-fast: 150ms`; `--dashboard-duration-normal: 200ms` |
| Reduced motion | Missing in repo. Client-scoped token collapse only | `@media (prefers-reduced-motion: reduce)` sets both durations to `0.01ms` under `.dashboard-theme.dashboard-client` |

Shared primitives still hard-code `rounded-2xl` and `shadow-xl` on `DashboardHero`. Recorded mismatch; **not** refactored in CUI-02 (CUI-04).

---

## F. CURRENT → TARGET DELTA

Selector: `.dashboard-theme.dashboard-client` (plus Client-only generic overrides, dark Client contrast restore, and Client reduced-motion query).

| Token | Before | After |
| --- | --- | --- |
| `--dashboard-primary` | `#3157d5` | `#0b2846` |
| `--dashboard-primary-hover` | `#294bc0` | `#092338` |
| `--dashboard-primary-pressed` | `#223fa6` | `#081c30` |
| `--dashboard-primary-soft` | `#e9efff` | `#eef6fe` |
| `--dashboard-secondary` | `#e4f3f1` | `#f4f7fb` |
| `--dashboard-secondary-hover` | `#d5eae7` | `#e8eef5` |
| `--dashboard-secondary-pressed` | `#c4deda` | `#d9e2ec` |
| `--dashboard-secondary-foreground` | `#134e4a` | `#0b2846` |
| `--dashboard-focus` | `#0f766e` | `#1a4f8a` |
| `--dashboard-accent` | `#c99523` | `#c4a064` |
| `--dashboard-accent-soft` | `#fff6dc` | `#f7f1e4` |
| `--dashboard-hero-start` | `#0f172a` | `#ffffff` |
| `--dashboard-hero-mid` | `#172554` | `#f4f8fc` |
| `--dashboard-hero-end` | `#0f766e` | `#e8f0f8` |
| `--dashboard-hero-foreground` | `#f8fafc` | `#10182c` |
| `--dashboard-hero-muted` | `rgba(255,255,255,0.8)` | `#5e6672` |
| `--dashboard-hero-border` | `rgba(255,255,255,0.18)` | `#d7dde6` |
| `--dashboard-chart-1` | `#3157d5` | `#0b2846` |
| `--dashboard-chart-2` | `#0f766e` | `#1f7a54` |
| `--dashboard-chart-3` | `#9a6b00` | `#1a4f8a` |
| `--dashboard-chart-4` | `#059669` | `#c4a064` |
| `--dashboard-chart-5` | `#8b5cf6` | `#c81e4a` |
| `--dashboard-canvas` | inherited `#f8fafc` | `#f7f9fc` |
| `--dashboard-canvas-elevated` | inherited `#f1f5f9` | `#eef2f7` |
| `--dashboard-panel` | inherited `#ffffff` | `#ffffff` |
| `--dashboard-panel-hover` | inherited `#f8fafc` | `#f5f8fb` |
| `--dashboard-border` | inherited `#8390a2` | `#d7dde6` |
| `--dashboard-success` | inherited `#059669` | `#1f7a54` |
| `--dashboard-success-soft` | inherited `#ecfdf5` | `#e8f6ef` |
| `--dashboard-information` | inherited `#2563eb` | `#1a4f8a` |
| `--dashboard-information-soft` | inherited `#eff6ff` | `#eef6fe` |
| `--dashboard-warning-soft` | inherited `#fffbeb` | `#fcf9f6` |
| `--dashboard-danger` | inherited `#e11d48` | `#c81e4a` |
| `--dashboard-danger-soft` | inherited `#fff1f2` | `#fdf1f5` |
| `--dashboard-neutral` | inherited `#64748b` | `#5e6672` |
| `--dashboard-sidebar` | `#1e3a6e` | `#0b2846` |
| `--dashboard-sidebar-deep` | `#0f2040` | `#081f38` |
| `--dashboard-sidebar-bg-from` | inherited | `#0b2846` |
| `--dashboard-sidebar-bg-to` | inherited | `#081f38` |
| `--dashboard-sidebar-foreground` | `#ffffff` | `#f4f7fb` |
| `--dashboard-sidebar-muted` | `#93b4dc` | `#a9c4dc` |
| `--dashboard-sidebar-heading` | `#7ba3d1` | `#8fafcb` |
| `--dashboard-sidebar-heading-bar` | `#5b8ec7` | `#c4a064` |
| `--dashboard-sidebar-active` | `rgba(59,130,246,0.35)` | `#123a66` |
| `--dashboard-sidebar-active-border` | `rgba(96,165,250,0.25)` | `rgba(255,255,255,0.12)` |
| `--dashboard-sidebar-active-icon` | `#93c5fd` | `#ffffff` |
| `--dashboard-sidebar-hover` | `rgba(255,255,255,0.08)` | `rgba(255,255,255,0.06)` |
| `--dashboard-sidebar-border` | `rgba(255,255,255,0.1)` | `rgba(255,255,255,0.08)` |
| `--dashboard-sidebar-badge` | `rgba(255,255,255,0.15)` | `#e53939` |
| `--dashboard-sidebar-badge-foreground` | `#bfdbfe` | `#ffffff` |
| `--dashboard-sidebar-brand` | `#3b82f6` | `#c4a064` |
| `--dashboard-sidebar-brand-bg` | inherited | `transparent` |
| `--dashboard-sidebar-brand-border` | inherited | `rgba(196,160,100,0.28)` |
| `--dashboard-sidebar-brand-icon` | inherited | `#c4a064` |
| `--dashboard-sidebar-brand-glow` | `rgba(59,130,246,0.35)` | `transparent` |
| `--dashboard-sidebar-chevron` | `rgba(147,197,253,0.5)` | `#8fafcb` |
| `--dashboard-sidebar-focus` | `rgba(96,165,250,0.5)` | `#c4a064` |
| `--dashboard-sidebar-width` | `15rem` | `16.25rem` |
| `--dashboard-topbar-height` | inherited `3.5rem` | `4rem` |
| `--dashboard-content-gutter` | inherited `1.5rem` | `2rem` |
| `--dashboard-content-gutter-compact` | inherited `1rem` | `1.25rem` |
| `--dashboard-hero-pattern-opacity` | inherited `0.05` | `0.04` |

Added Client-only tokens (not previously present): `--dashboard-grid-gap`, `--dashboard-radius-control`, `--dashboard-radius-pill`, `--dashboard-control-height`, `--dashboard-control-height-compact`, `--dashboard-icon-size`, `--dashboard-icon-size-sm`, `--dashboard-icon-size-lg`, `--dashboard-shadow-card`, `--dashboard-shadow-raised`, `--dashboard-font-sans`, `--dashboard-font-display`, `--dashboard-font-nepali`, `--dashboard-text-title-size`, `--dashboard-text-section-size`, `--dashboard-text-body-size`, `--dashboard-text-meta-size`, `--dashboard-duration-fast`, `--dashboard-duration-normal`, plus Client-scoped generic `--background/--foreground/--card/--border/--input/--ring/--primary`.

Dark Client: existing accent tokens kept (`#60a5fa` primary family). Generic light-canvas overrides are restored in `.dark.dashboard-theme.dashboard-client` so dark contrast does not break. This is not a new dark visual language.

---

## G. SCOPE PROOF

| Selector / file | Changed | Why Staff/Admin are unaffected |
| --- | --- | --- |
| `.dashboard-theme.dashboard-client` | YES | Client-only class on Client portal shell |
| `.dark.dashboard-theme.dashboard-client` | YES | Client-only dark restore + existing Client dark accents |
| `@media (prefers-reduced-motion: reduce)` wrapping `.dashboard-theme.dashboard-client` | YES | Client-scoped durations only |
| `.dashboard-theme` base | NO | Byte-identical |
| `.dashboard-theme.dashboard-admin` | NO | SHA-256 `bddaae356b2ed0c8ffb0c110227f5c3a083e49bfa17882c38e90f29cea650b69` |
| `.dashboard-theme.dashboard-staff` | NO | SHA-256 `9769b6849c3f08f1b5faad4c31dc083f8bcb56c0e3dcecc256974fdd947b5754` |
| `.dark.dashboard-theme.dashboard-admin` | NO | SHA-256 `c9a049e9378ec66a8e8238364e42a8151ec463140e4228c760c037d4c49b1b37` |
| `.dark.dashboard-theme.dashboard-staff` | NO | SHA-256 `13f7f0701e0fbad23c6064436899b9cc6233c9ea18f4dde901123fb45b121501` |
| `:root` / `.dark` | NO | |
| `src/app/(client)/layout.tsx` | NO | Geometry tokens are consumed by existing `md:w-[var(--dashboard-sidebar-width)]` and `h-[var(--dashboard-topbar-height)]` without markup edits |
| `src/components/dashboard/**` | NO | |
| `src/components/ui/**` | NO | |
| Protected dirty files | NO | |

---

## CMS / portal branding audit (CUI-02)

`PortalPageShell` applies `style={cssVars}` from `usePortalBranding()`.

`buildPortalBrandingCssVars` (`src/lib/portal-branding.ts`) **does not run** when CMS `primaryColor` is missing/invalid (returns `{}`).

When CMS `primaryColor` is a valid hex, inline style sets:

- `--dashboard-primary`, `--dashboard-primary-hover`, `--dashboard-primary-pressed`, `--dashboard-primary-foreground`, `--dashboard-primary-soft`
- `--dashboard-focus`
- `--dashboard-hero-end`, `--dashboard-hero-border`

| Branding field | Overrides locked Client palette? | CUI-02 action |
| --- | --- | --- |
| `logoUrl` | No (img/src only) | Preserve. Do not change provider. |
| `firmName` | No (text) | Preserve. |
| `heroImageUrl` | No CSS variable; used by `NepalDecoratedHero` | Later Home composition (CUI-05). |
| `primaryColor` | **Yes** — inline CSS variables beat the Client token block | **CUI-03 / shared-shell blocker.** Do not fight with `!important`. Do not edit `PortalBrandingProvider` in CUI-02. |
| Sidebar tokens | Not in `buildPortalBrandingCssVars` | Locked navy remains unless a future branding map is added. |

When local CMS `primaryColor` is unset, the measured Client tokens apply.

---

## Dark mode note

The approved pack is light canvas + dark nav. CUI-02 does not invent a dark canvas from the JPEGs. Existing `.dark.dashboard-theme` surfaces remain. Client dark accents (`#60a5fa` family) are preserved. Generic Client light overrides are undone in the dark Client selector so contrast cannot collapse.

---

## Known primitive mismatches (not CUI-02 work)

- `DashboardHero` still uses `rounded-2xl` and `shadow-xl` (CUI-04).
- `PortalPageShell` still hard-codes `p-4 sm:p-6 space-y-6` instead of gutter/section tokens (CUI-03/04).
- Client nav labels/structure still use current repository wording (CUI-03).
- Home body is not the approved composition (CUI-05).
