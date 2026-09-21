# CUI-06 My Matters Audit

Implementation evidence only. This document does **not** replace:

`doc/ui-reference/client/LexNepal_Client_UI_Upgrade_Source_of_Truth_v1.0.docx`

The DOCX remains the owner-approved authority. CUI-06 rebuilds the Client My Matters body (`/client/cases`, `src/views/client/ClientCasesPage.tsx`) to match Reference 02 **body composition** while remaining query-driven.

Master shell reference: `doc/ui-reference/client/references/01-home.jpg` (CUI-05 frozen).
Body reference: `doc/ui-reference/client/references/02-my-matters.jpg` (1400×876, SHA-256 `6CCAD951904A144BB0A2E6C6F955EBAAE7B11E0F6F06B77654E0748996766B22`).

QA clock for screenshots only: `2026-09-18T05:30:00.000Z`. Not used in production My Matters code.

Worktree: `.local/worktrees/cui-06-client-my-matters-newpc`  
Branch: `cui-06-client-my-matters`  
Base: `268e3d3d13defa380b912b7edc0597ef58e6e957`  
Recovered commit: `e9a0540c1ab1e5729b22c52609db187b3915d0ac` + V2 visual correction

---

## A. Reference measurements

Taken from `02-my-matters.jpg` (1400×876 JPEG of the 1536×961 source). Light/white sidebar in this JPEG is **rejected**; CUI-05 dark shell remains mandatory.

| Element                   | Reference (JPEG px)              | Notes                                                                       |
| ------------------------- | -------------------------------- | --------------------------------------------------------------------------- |
| Page                      | 1400×876                         | Frozen capture size                                                         |
| Sidebar (rejected chrome) | x=0–235                          | Not implemented; dark CUI-05 shell kept                                     |
| Topbar                    | y=0–64                           | Unchanged CUI-03/CUI-05 shell                                               |
| Body left                 | ~x=266                           | After sidebar + gutter                                                      |
| Hero                      | y≈78, height ≈96                 | Title + subtitle + photo band                                               |
| Summary/count row         | y≈186, height ≈52                | All / In Progress / Under Review / Completed                                |
| Filter toolbar            | y≈250, height ≈48                | Search + type + status + sort                                               |
| Matter card               | width ≈720, height ≈168, gap ≈16 | Title, type, number, status, advocate, next event, last update, two actions |
| Right rail                | width ≈318                       | Next Important Date, timeline, help                                         |
| Next Important Date       | height ≈210                      | Date stack + matter/court/time                                              |
| Activity / timeline       | height ≈250                      | Screenshot legal events are **not** a real Client-safe log                  |
| Help                      | height ≈128                      | Message CTA                                                                 |
| Control height            | ≈36                              | Inputs / selects                                                            |
| Radius                    | ≈12px                            | `--dashboard-radius-card: 0.75rem`                                          |

---

## B. After screenshot (new-PC V2)

`.local/qa/cui-06-v2-newpc/after/my-matters-1400x876.png`

Viewport 1400×876, UI-preview Client, QA clock `2026-09-18T05:30:00.000Z`, fonts loaded.
After SHA-256 `68ECD1D9C2C6108A662D8C431B9D4EBF225F61D02AEAE1170ADBC9BB740180B5`.

Fresh DOM measurements (Section 16):

| Element                   | After (px)     |
| ------------------------- | -------------- |
| Hero top/bottom/height    | 67 / 167 / 100 |
| Summary top/bottom/height | 176 / 218 / 42 |
| Filter top/bottom/height  | 227 / 291 / 64 |
| First Matter top/bottom   | 299 / 457      |
| Second Matter top/bottom  | 466 / 623      |
| Third Matter top/bottom   | 633 / 790      |
| Avg Matter card height    | 157.2          |
| Right rail left/right     | 1024 / 1368    |
| Next Important Date       | 299 / 505      |
| Recent Matter Activity    | 513 / 609      |
| Help                      | 617 / 767      |
| Footer top                | 989            |

---

## C. Overlay / diff paths

| Artifact       | Path                                                                               |
| -------------- | ---------------------------------------------------------------------------------- |
| Reference copy | `.local/qa/cui-06-v2-newpc/reference/02-my-matters.jpg`                            |
| After          | `.local/qa/cui-06-v2-newpc/after/my-matters-1400x876.png`                          |
| Overlay        | `.local/qa/cui-06-v2-newpc/compare/my-matters-overlay.png`                         |
| Diff           | `.local/qa/cui-06-v2-newpc/compare/my-matters-diff.png`                            |
| Responsive     | `.local/qa/cui-06-v2-newpc/responsive/my-matters-*.png`                            |
| States         | `.local/qa/cui-06-v2-newpc/states/{table,search,status-completed,matter-type}.png` |

QA screenshots are local evidence and are not committed.

Full-frame overlay/diff is dominated by the **legitimate shell difference** (Reference 02 light sidebar vs frozen dark CUI-05 sidebar). Body hierarchy is compared section-by-section below.

---

## D. Section-by-section comparison

| Element             | Reference                                                                | After                                                                                  | Delta                                                                | Result |
| ------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------ |
| Shell               | Light sidebar (rejected)                                                 | Dark CUI-05 sidebar 235px, 64px-class topbar, footer, mobile nav                       | Shell authority is Reference 01                                      | PASS   |
| Hero                | My Matters + subtitle + photo                                            | Compact band (~100px); CMS `heroImageUrl`; no Request consultation CTA                 | V2 density; Home hero untouched                                      | PASS   |
| Summary row         | All / In Progress / Under Review / Completed                             | All Matters / In Progress / On hold / Completed mapped to `all/active/on_hold/closed`  | No Under Review; On hold retained                                    | PASS   |
| Filter toolbar      | Search, type, status, sort                                               | Search, Matter Type, Status, Cards/Table                                               | Latest Update sort omitted (no Client-safe `updatedAt`)              | PASS   |
| Main grid           | Cards + right rail                                                       | Cards + right rail from 1100px; stacks below on tablet/mobile                          | Rail ~340 vs ~318                                                    | PASS   |
| Matter card         | Title, type, number, status, advocate, next event, last update, two CTAs | Same real fields; initials/avatar fallback; nearest upcoming scheduled hearing         | No invented portrait                                                 | PASS   |
| Next Important Date | Date / hearing / matter                                                  | Nearest future scheduled hearing + View Calendar                                       | Add to Calendar omitted (no shared helper; would duplicate Home ICS) | PASS   |
| Activity            | Fabricated legal timeline                                                | Recent Matter Activity from notifications with `relatedId` or `/client/cases/:id` link | Honest empty/partial vs fake history                                 | PASS   |
| Help                | We're Here for You                                                       | Need help with a matter? → `/client/messages`                                          | Copy not duplicated from sidebar                                     | PASS   |

---

## E. Capability differences (allowed)

- No fake Latest Update sort (`ClientCaseDto` has no `updatedAt`).
- No fabricated legal timeline.
- No Under Review persisted status; Inquiry stays Inquiry and is included in All Matters only.
- On hold retained (display uses lifecycle label; CSS `capitalize` renders “On Hold”).
- Table mode preserved as a secondary control.
- Booking CTA removed from My Matters hero (avoids duplicate Request consultation CTA; booking remains on Home / booking route).
- Advocate photograph only when `useMyTeam()` already returns a matching `avatar`.
- Summary tiles include icons; status filters stay synchronized with All / In Progress / On hold / Completed.

---

## F. Frozen Home / protected files

| File / surface                         | Modified in CUI-06?           |
| -------------------------------------- | ----------------------------- |
| `src/views/client/ClientDashboard.tsx` | NO                            |
| `.client-home*` CSS                    | NO                            |
| Client shell / navigation              | NO                            |
| Home hero asset                        | NO                            |
| `src/shared/contracts/case-ui.ts`      | NO                            |
| `tests/unit/cases-r9-a11y.test.ts`     | NO                            |
| `ClientCaseDetailPage.tsx`             | NO                            |
| `cases-workspace.tsx`                  | NO                            |
| `StaffCaseDetailPage.tsx`              | NO                            |
| `CASE_CLIENT_HERO_CLASS`               | NOT introduced                |
| `CASE_LIST_HERO_CLASS`                 | Retained on `ClientCasesPage` |

---

## G. Validation

| Check                             | Result                                                |
| --------------------------------- | ----------------------------------------------------- |
| Changed-file prettier             | PASS                                                  |
| Lint                              | PASS (`--max-warnings=0`)                             |
| CUI-06 + Case + CUI-03/04/05 unit | 74/74 PASS                                            |
| CUI-06 E2E                        | 2/2 PASS (API login, live preview data)               |
| CUI-05 Home hierarchy E2E         | PASS                                                  |
| CUI-05 “Send a Message” click E2E | PASS (included in Quick Actions routes E2E on new PC) |
| Typecheck / build                 | PASS                                                  |
