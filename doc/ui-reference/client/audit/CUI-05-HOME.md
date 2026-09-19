# CUI-05 Home Audit

Implementation evidence only. This document does **not** replace:

`doc/ui-reference/client/LexNepal_Client_UI_Upgrade_Source_of_Truth_v1.0.docx`

The DOCX remains the owner-approved authority. CUI-05 rebuilds the Client Home body (`/client`, `src/views/client/ClientDashboard.tsx`) to match Reference 01 while remaining query-driven.

Master visual reference: `doc/ui-reference/client/references/01-home.jpg` (1400×876, SHA-256 `C8BA89F9F2E6206DB349E74962D25E0039A04C4DA87EEF8F8ECA93986493CB5E`).

QA clock for screenshots only: `2026-09-18T05:30:00.000Z`. Not used in production Home code.

---

## A. Reference measurements

Taken from `01-home.jpg` (1400×876 JPEG of the 1536×961 source). Scale matches CUI-02 (`k ≈ 1.097`).

| Element                         | Reference (JPEG px)                                      | Notes                                                                         |
| ------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Page                            | 1400×876                                                 | Frozen capture size                                                           |
| Sidebar                         | x=0–235 (~260px source)                                  | Unchanged CUI-03 shell                                                        |
| Topbar                          | y=0–64                                                   | Unchanged CUI-03 shell                                                        |
| Content gutter                  | ~31px after sidebar                                      | `--dashboard-content-gutter: 2rem`                                            |
| Hero card                       | ~x=266, y=78, width ~1100, height ~195 including KPI row | Greeting left, brand photo right, four tinted KPIs inside the same card       |
| KPI cards                       | four equal columns, ~16px gap, tinted fills              | Labels: Active Matters, Upcoming Hearing, Documents Pending, Actions Required |
| Body grid                       | left ~8/12, right ~4/12, ~16px gap                       | Your Matters spans left; Upcoming Hearing top-right                           |
| Your Matters                    | dense single matter card                                 | Title, type, number, status, advocate, next event, last update, two actions   |
| Upcoming Hearing                | date stack + matter/court/time                           | Add to Calendar                                                               |
| Recent Updates / Your Documents | two columns under Your Matters                           | Four updates / three documents in the reference crop                          |
| Quick Actions                   | three rows                                               | Upload, Request Appointment, Send a Message                                   |
| Help                            | “We're Here for You”                                     | Message CTA; no invented contact data                                         |
| Radius                          | ~12px cards                                              | `--dashboard-radius-card: 0.75rem`                                            |
| Border                          | `#d7dde6`                                                | CUI-02 token                                                                  |
| Shadow                          | contact `0 1px 2px rgba(11,40,70,0.06)`                  | CUI-02 token                                                                  |

---

## B. Before screenshot

`.local/qa/cui-05/before/home-1400x876.png`

Captured from an isolated worktree at `8d2e553591101b6548e93448fec41bd970d882e0` (CUI-04 HEAD). The primary workspace was not reset.

Baseline Home composition (pre-CUI-05): Featured Matter, Next appointment KPI, Documents count, “What you need to do”, combined Upcoming hearings+appointments, “Your legal portal”, “Secure client access”, Sparkles, hero CTAs.

---

## C. After screenshot

`.local/qa/cui-05/after/home-1400x876.png`

Viewport 1400×876, UI-preview Client, QA clock, fonts loaded, Next compiling overlay hidden when present.

---

## D. Overlay / diff paths

| Artifact        | Path                                                                                  |
| --------------- | ------------------------------------------------------------------------------------- |
| Reference copy  | `.local/qa/cui-05/reference/home-reference.png` (generated from frozen `01-home.jpg`) |
| Overlay         | `.local/qa/cui-05/compare/home-overlay.png`                                           |
| Diff            | `.local/qa/cui-05/compare/home-diff.png`                                              |
| Numeric samples | `.local/qa/cui-05/compare/measurements.json`                                          |
| Responsive      | `.local/qa/cui-05/responsive/home-*.png`                                              |

QA screenshots are local evidence and are not committed.

---

## E. Section-by-section comparison

| Section          | Reference                                        | After                                                                                                                                                                            | Result                                               |
| ---------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Shell            | Dark navy sidebar 260px, 64px topbar             | Unchanged CUI-03                                                                                                                                                                 | PASS                                                 |
| Hero eyebrow     | CLIENT PORTAL                                    | Client Portal (uppercase tracking via hero)                                                                                                                                      | PASS                                                 |
| Hero title       | Good Morning, {firstName}                        | Data-driven `dayPartGreeting` + client first name                                                                                                                                | PASS                                                 |
| Hero subtitle    | Here's what's happening with your legal matters. | Same copy                                                                                                                                                                        | PASS                                                 |
| Hero image       | Himalaya / temple photograph                     | CMS `heroImageUrl` through existing branding. UI-preview seed asset is a 1×1 PNG, so the figure is omitted rather than rendering a dummy pixel. Not cropped from the screenshot. | CMS configuration / data — not hardcoded photography |
| Hero actions     | None                                             | None (Message / Book moved to Quick Actions)                                                                                                                                     | PASS                                                 |
| Security badge   | Absent                                           | Absent                                                                                                                                                                           | PASS                                                 |
| KPI row          | Four tinted cards inside hero                    | Four MetricCards inside `heroChildren`                                                                                                                                           | PASS                                                 |
| Your Matters     | One dense matter                                 | `ClientMatterSummary`; nearest upcoming active hearing's matter                                                                                                                  | PASS                                                 |
| Upcoming Hearing | Dedicated right card                             | `ClientHearingSummary`; scheduled future hearings only                                                                                                                           | PASS                                                 |
| Recent Updates   | Timeline                                         | `ClientTimelineItem`, 4 most recent notifications                                                                                                                                | PASS                                                 |
| Your Documents   | Three rows                                       | `ClientDocumentItem`, 3 most recent                                                                                                                                              | PASS                                                 |
| Quick Actions    | Three real actions                               | Documents, booking, messages                                                                                                                                                     | PASS                                                 |
| Contextual help  | We're Here for You                               | `ClientSoftPanel` + `/client/messages`                                                                                                                                           | PASS                                                 |

---

## F. Data mapping

| Home element             | Real query/domain                                                          | Rule                                                       | Hardcoded screenshot data? |
| ------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------- |
| Greeting                 | `useMyClient().fullName` + `dayPartGreeting`                               | First token of live name                                   | NO                         |
| Hero image               | `usePortalBranding().heroImageUrl`                                         | Approved CMS branding URL; hide 1×1 seed                   | NO                         |
| Tagline overlay          | `usePublicCmsSettings().tagline`                                           | Omit if absent                                             | NO                         |
| Active Matters           | `useClientCases` `status === "active"`                                     | Existing lifecycle                                         | NO                         |
| Upcoming Hearing KPI     | `useHearings` + client case ids, `scheduled` and `dateGregorian >= today`  | Count, not appointment                                     | NO                         |
| Documents Pending        | `useMyPendingEnvelopeActions`                                              | Live pending signature envelopes                           | NO                         |
| Actions Required         | pending envelopes + client-visible incomplete tasks + KYC pending/rejected | Not notifications/hearings/appointments                    | NO                         |
| Your Matters             | Active matter with nearest upcoming hearing                                | Live `ClientCaseDto`                                       | NO                         |
| Upcoming Hearing section | First upcoming scheduled hearing                                           | Not appointments                                           | NO                         |
| Recent Updates           | `useNotifications` newest 4                                                | Live timestamps                                            | NO                         |
| Your Documents           | `useDocuments` newest 3                                                    | Client-visible                                             | NO                         |
| Quick Actions            | Existing routes                                                            | `/client/documents`, `/client/booking`, `/client/messages` | NO                         |
| Help                     | Static page-level copy + messages route                                    | No invented phone/email/hours                              | NO                         |

`toDocumentDto` does not expose `requiresSignature` / `signatureStatus`. Documents Pending therefore uses the existing Client envelope pending API already used by Sign Documents — not a fake frontend array.

---

## G. Responsive results

| Viewport | Overflow | Notes                                     |
| -------- | -------- | ----------------------------------------- |
| 1400×876 | NONE     | Calibration size                          |
| 1440×900 | NONE     | Same hierarchy                            |
| 1280×800 | NONE     | Two-column body                           |
| 1024×768 | NONE     | KPIs 2×2; sections stack in locked order  |
| 768      | NONE     | Sidebar + stacked body                    |
| 390×844  | NONE     | CUI-03 mobile nav; Hero → KPIs → Matters… |
| 360      | NONE     | Same                                      |

Mobile DOM order: Your Matters, Upcoming Hearing, Recent Updates, Your Documents, Quick Actions, help (`display:contents` + `order` below `xl`).

---

## H. Accessibility results

- One page `h1` (greeting / Client Portal).
- Section titles are `h2`.
- KPI cards are links with accessible names.
- Matter / hearing / document / quick actions are links or buttons.
- Status uses `DashboardStatusLabel` text.
- Decorative hero `img` is `alt=""` and `aria-hidden`.
- Loading uses `ClientStatePanel` `aria-busy`.
- Reduced-motion already killed Client primitive motion in CUI-04.
- Home KPI/icon hide uses `!important` only to beat Tailwind `flex` layer order on the unused hero icon.

---

## I. Functional preservation

| Capability     | Home / shell path                                                                |
| -------------- | -------------------------------------------------------------------------------- |
| My Matters     | KPI + View All + sidebar                                                         |
| View Matter    | Matter CTA `/client/cases/:id`                                                   |
| Hearings       | KPI + Upcoming Hearing + `/client/hearings`                                      |
| Documents      | Quick Action + Your Documents                                                    |
| Messages       | Quick Action + help + matter CTA                                                 |
| Appointments   | Quick Action + sidebar (not a Home KPI)                                          |
| KYC            | Sidebar Identity Verification; counted in Actions Required when pending/rejected |
| Sign Documents | Documents Pending KPI → `/client/signatures` when envelopes exist                |
| Checklist      | Actions Required → `/client/checklist`                                           |
| Notifications  | Recent Updates View All                                                          |

---

## J. Remaining differences

**Dynamic fixture DATA (allowed):**

- Preview identity is Ravi Sharma / first name Ravi (live record, not hardcoded).
- Matter titles, case numbers (`CUI1-MATTER-001`), advocate Jibachh Yadav, hearing 12 Oct 2026 10:30, document names, notification copy, KPI counts (2 / 3 / 1 / 4 in the seeded preview).
- CMS hero is the configured `heroImageUrl`. The UI-preview seed uploads a 1×1 PNG (`scripts/e2e/seed-cms-assets.ts`), which is not Himalaya photography. Home omits that dummy pixel. A published CMS mountain/temple asset will render in the hero figure through the same mechanism.

**Structural / design:**

No competing Home composition remains (Featured Matter, Next appointment, Secure client access, Your legal portal, combined Upcoming, Sparkles, hero CTAs).

Owner Gate 1 should judge remaining crop tightness of the 1400×876 fold (help panel sits immediately below Quick Actions; fixture last-update copy is longer than the screenshot sample).
