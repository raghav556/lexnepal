# LexNepal / Srimar Law — Client Portal UI Upgrade

## Source-of-Truth companion (machine-readable)

This Markdown file is a **faithful machine-readable transcription** of:

`doc/ui-reference/client/LexNepal_Client_UI_Upgrade_Source_of_Truth_v1.0.docx`

**The DOCX is the owner-approved master source.** If this Markdown and the DOCX conflict, the DOCX wins. Do not override this specification with chat memory or generic design assumptions.

### Transcription limitations

The following could not be represented losslessly in Markdown and must not be guessed:

1. **Visual layout, fonts, colors, spacing, table shading, and page geometry** of the DOCX are not reproduced. Text, tables, lists, locked rules, and hierarchy of recoverable content are preserved.
2. **Empty Heading 1 / Heading 2 paragraphs:** the DOCX XML contains 16 `Heading1` and 4 `Heading2` styled paragraphs with **no title text**. Those markers are preserved below as untitled headings. Section identity is taken from the following body text, lists, and tables — not from invented titles.
3. **Approved Client UI reference images** are embedded in the DOCX as **JPEG** files (`word/media/image1.jpg` through `image12.jpg`), not as separate `01-home.png` … `12-profile.png` files. Individual PNG source files were not available in the workspace. Images were **not** converted, regenerated, or renamed to `.png`. The DOCX remains the visual authority. Markdown image placeholders below point at the DOCX embeds only.
4. **Header / footer** text is transcribed here from `header1.xml` / `footer1.xml`. Pagination is not reproduced.
5. **Bold/italic/size/color runs** are not fully reconstructed; table cell and paragraph wording is preserved in full.

---

**Header:** LEXNEPAL / SRIMAR LAW  •  CLIENT UI SOURCE OF TRUTH

**Footer:** FINAL / LOCKED v1.0  •  Client Portal only  •  Codex execution target: Grok 4.6

---

**LEXNEPAL / SRIMAR LAW**

**Client Portal UI Upgrade**

**Source-of-Truth Implementation Plan**

FINAL / LOCKED • Version 1.0 • 18 September 2026

---

> **THIS DOCUMENT IS THE AUTHORITY**
>
> Use this document as the controlling source for the Client UI upgrade. It supersedes informal chat plans. Future coding sessions must not invent, omit, duplicate, reorder or redesign requirements outside this document. If repository evidence and a reference image conflict in a way this document does not resolve, stop and report the conflict instead of guessing.

Repository: raghav556/lexnepal

Audited branch: main  •  Audited HEAD: cdee66080fbdc51d47b7536d533aad60bfae54ff

Execution environment intended by owner: Codex using Grok 4.6

Scope: Client Portal UI only. Staff and Admin are explicitly out of scope until Client freeze.

## [Heading 1 #1 — no title text in DOCX XML]

The goal is not a generic redesign. The goal is to upgrade the real LexNepal Client Portal so every Client screen uses one consistent Srimar Law design language derived from the approved reference images, while preserving existing application behavior and using deterministic synthetic local fixture data through the real application data path.

> **NON-NEGOTIABLE DELIVERY RULE**
>
> The Client project is complete only when all 12 Client screen types pass visual, functional, responsive, state and accessibility gates. A page that looks correct but breaks a workflow fails. A workflow that works but does not match the approved visual system also fails.

### [Heading 2 #1 — no title text in DOCX XML]

- Client layout, navigation and information hierarchy.
- Client-scoped colors, typography, spacing, radii, borders and shadows.
- Client page composition, responsive behavior, labels and visual states.
- Client-specific presentation of shared components when it can be safely scoped.
- Local deterministic fixtures required to populate every Client screen for visual QA.

### [Heading 2 #2 — no title text in DOCX XML]

- Staff UI or Admin UI.
- Authorization rules, tenancy rules or permission boundaries.
- Database architecture for visual reasons.
- Working API/query architecture or a working workflow merely because a screenshot does not show it.
- A second messaging engine, second document engine, duplicate routes or duplicate UI systems.
- Billing, Payments, Payroll, Finance, Expenses or Conflict Checker.

## [Heading 1 #2 — no title text in DOCX XML]

| Priority | Authority | Controls |
| --- | --- | --- |
| 1 | Approved Client Home reference | Master shell: Srimar Law identity, dark sidebar, topbar, overall palette, card language, footer/support treatment. |
| 2 | Approved reference for each specific screen | Body composition and page-specific hierarchy. |
| 3 | Current LexNepal repository | Actual data, permissions, workflows, APIs, mutations, uploads/downloads and security behavior. |
| 4 | Existing shared UI components | Implementation mechanism only; they cannot override the approved Client visual contract. |

> **CONFLICT RULE**
>
> If another page reference shows a white sidebar, the white sidebar is rejected. The approved Home dark sidebar wins. If a screenshot depicts functionality the repository does not support, do not fake it. If the repository contains working functionality not visible in the screenshot, preserve it and integrate it into the approved design.

## [Heading 1 #3 — no title text in DOCX XML]

| Route | Current owner component | Final visible name | Active sidebar item |
| --- | --- | --- | --- |
| /client | ClientDashboard.tsx | Home | Home |
| /client/cases | ClientCasesPage.tsx | My Matters | My Matters |
| /client/cases/:id | ClientCaseDetailPage.tsx | Matter Details | My Matters |
| /client/hearings | ClientHearingsPage.tsx | Hearing Schedule | My Matters |
| /client/checklist | ClientChecklistPage.tsx | Action Checklist | My Matters |
| /client/documents | ClientDocumentsPage.tsx | Documents | Documents |
| /client/messages | ClientMessagesPage.tsx | Messages | Messages |
| /client/booking | ClientBookingPage.tsx | Appointments | Appointments |
| /client/kyc | ClientKYCOnboarding.tsx | Identity Verification | Identity Verification |
| /client/signatures | ClientSignaturesPage.tsx | Sign Documents | Sign Documents |
| /client/notifications | ClientNotificationsPage.tsx | Notifications | Notifications |
| /client/profile | SharedProfilePage.tsx | Profile | Profile |

Internal domain identifiers such as caseId, ClientCaseDto or API paths do not need to be renamed only for presentation. The visible Client vocabulary is Matters; backend/domain naming remains stable unless a separate verified technical requirement exists.

## [Heading 1 #4 — no title text in DOCX XML]

The approved Home image is the master shell reference. No individual page is allowed to implement its own sidebar or topbar.

| Area | Locked rule |
| --- | --- |
| Sidebar | Dark Srimar navy, one shared implementation, same width and spacing across every Client route. |
| Topbar | Search + notifications + Client account/profile. Do not inherit unnecessary Staff/Admin operational chrome. |
| Primary nav | Home, My Matters, Documents, Messages, Appointments. |
| Secondary nav | Identity Verification, Sign Documents, Notifications, Profile. |
| Hearings / Checklist | Real routes retained; contextual Matter journey, not permanent sidebar items. |
| Support | One consistent sidebar support module; contextual body help may exist only when it serves a different purpose. |
| Footer | One consistent Client footer; no unsupported security/compliance slogans. |
| Top-level pages | May use the approved Nepal mountain/temple brand header. |
| Matter Details | Uses a compact contextual detail header, but remains inside the same dark Client shell. |

Measured reference baseline from the approved Home image: 1536 x 961 source image, sidebar about 260 px, topbar about 64 px, content gutter about 30-32 px. Dominant sampled sidebar navy is approximately #0B2846. Remaining production tokens must be sampled from the frozen reference pack during the token phase rather than chosen by taste.

## [Heading 1 #5 — no title text in DOCX XML]

| Current/technical wording | Final Client-facing wording |
| --- | --- |
| Dashboard | Home |
| My Cases / Cases | My Matters / Matters |
| Case Detail | Matter Details |
| Identity (KYC) | Identity Verification |
| E-Signatures | Sign Documents |
| Book Appointment | Appointments |
| Profile & Settings | Profile |

## [Heading 1 #6 — no title text in DOCX XML]

The redesign will use synthetic local data, but not a fake frontend data layer. LexNepal already has an idempotent Client fixture seeder at scripts/e2e/seed-e2e-client-portal.ts and the npm script e2e:seed:portal. Extend that fixture family instead of reviving the removed Convex mock provider or placing hard-coded arrays inside React pages.

> **REQUIRED DATA FLOW**
>
> Synthetic local fixture → local MySQL → existing API routes → existing Client query hooks → redesigned UI. The UI being styled must therefore be the real application UI.

### [Heading 2 #3 — no title text in DOCX XML]

Use one coherent synthetic Client identity and linked entities across all screenshots. The approved reference identity Ravi Sharma and the primary Matter Sharma vs. ABC Construction Pvt. Ltd. may be used as synthetic fixture content. The exact fixture must remain clearly local/test-only.

| Domain | Fixture coverage required |
| --- | --- |
| Matters | Multiple Matters with stable titles, types, numbers, courts, advocates, status variation and recent activity. |
| Hearings | Next hearing, multiple upcoming, completed and adjourned/past hearings. |
| Checklist | Overdue, due soon, upcoming and completed client-visible items. |
| Documents | PDF/DOCX, shared, recent, uploaded, signature-related and multiple Matter associations. |
| Messages | Read/unread Matter conversation with legal-team participants and stable timestamps. |
| Appointments | Upcoming + past; office/online/phone modes where supported. |
| Identity | Completed, pending, under-review and missing states using existing domain requirements. |
| Signatures | Pending, due and completed signing records using existing signature contracts. |
| Notifications | Today/week/earlier, read/unread and multiple event categories. |
| Profile | Synthetic name, phone, address, language, emergency contact and account metadata using existing fields. |

Do not modify existing smoke-test identities casually. Add or parameterize a UI-preview fixture within the existing fixture architecture so screenshot calibration does not destabilize unrelated E2E tests.

## [Heading 1 #7 — no title text in DOCX XML]

| ID | Phase | Required work | Exit gate |
| --- | --- | --- | --- |
| CUI-00 | Freeze reference pack + baseline | Store all 12 references in a stable source folder; inventory current behavior, queries, actions, dialogs, states and screenshots. | Reference pack complete; preservation matrix complete; no code redesign yet. |
| CUI-01 | UI-preview fixture | Extend existing local fixture/seeder architecture so every Client screen can render coherent populated data. | All 12 routes populate through real APIs/hooks; fixture reruns idempotently. |
| CUI-02 | Measured Client tokens | Extract reference dimensions/colors/spacing/typography; implement Client-scoped tokens only. | Client tokens match references; Staff/Admin visual snapshots unchanged. |
| CUI-03 | Master shell | Implement one sidebar, topbar, support/footer and explicit active-route mapping. | Every Client route uses the same dark shell; /client/hearings highlights My Matters. |
| CUI-04 | Shared Client primitives | Standardize cards, buttons, badges, filters, timeline/action/document/hearing/matter patterns by extending existing primitives where safe. | No duplicate visual systems; pages do not manually restyle the same primitive. |
| CUI-05 | Home | Match approved Home hierarchy and proportions using fixture-backed live queries. | Owner Gate 1/visual anchor PASS. |
| CUI-06 | My Matters | Implement reference body, Client vocabulary and preserve search/filter/pagination. | Visual + functionality PASS. |
| CUI-07 | Matter Details | Use approved body reference inside master dark shell; preserve tabs/actions/data. | Visual + functionality PASS. |
| CUI-08 | Hearings | Upcoming/Past/All, search/filter, preparation, calendar actions; never Appointment semantics. | Visual + functionality PASS; route active-state test PASS. |
| CUI-09 | Checklist | Progress + Overdue/Due Soon/Upcoming/Completed; retain Client-visible/read-only rules. | Visual + behavior PASS. |
| CUI-10 | Documents | Reference library + real upload/preview/download/permission behavior. | Visual + document regression PASS. |
| CUI-11 | Messages | Retain MatterChatPanel; redesign presentation only. | No second chat system; messaging regression PASS. |
| CUI-12 | Appointments | Upcoming/request/slots/history/help using actual supported appointment capability. | Visual + booking regression PASS. |
| CUI-13 | Identity Verification | Progress/steps/submitted docs/checklist using real KYC requirements. | No invented compliance requirement; behavior PASS. |
| CUI-14 | Sign Documents | Pending/preview/review/sign/recently signed/steps/support. | Existing signing mechanics preserved and PASS. |
| CUI-15 | Notifications | Categories/time groups/important dates; preserve read actions. Preferences only if persistence exists. | No fake switches; notification regression PASS. |
| CUI-16 | Profile | Client-specific visual treatment around shared profile without changing Staff/Admin. | Password/MFA/session/account functions PASS; Staff/Admin unaffected. |
| CUI-17 | States | Loading, empty, error, partial, long text, high volume, no upcoming items, complete states. | Every applicable state intentionally designed and tested. |
| CUI-18 | Responsive + accessibility | 1440/1280/1024/768/390/360 widths; keyboard, focus, labels, contrast, reduced motion. | Responsive + accessibility suite PASS. |
| CUI-19 | Visual regression | Playwright/reference screenshot suite using deterministic fixture, viewport, fonts and test clock where necessary. | No unexplained visual deviations. |
| CUI-20 | Functional regression | Exercise real Client workflows end-to-end. | Targeted + full Client E2E PASS. |
| CUI-21 | Cleanup | Remove proven obsolete Client presentation residue; keep backend/domain names and necessary shared code. | No duplicate/dead Client UI; excluded modules absent. |
| CUI-22 | Client freeze | Run final matrix and owner approval. | All 12 screen rows PASS; Client UI frozen before Staff work. |

## [Heading 1 #8 — no title text in DOCX XML]

| Screen | Locked content contract |
| --- | --- |
| Home | Greeting + subtitle; Active Matters, Upcoming Hearing, Documents Pending, Actions Required; Your Matters; Upcoming Hearing; Recent Updates; Your Documents; Quick Actions; contextual help. |
| My Matters | Search/filter as supported; Matter cards/list with title, type, number, status, advocate, next event, last update and View Matter. |
| Matter Details | Breadcrumb; contextual Matter header; status/type/number/court; primary actions; overview/tabs; Matter information; hearing; team; actions; timeline; documents; updates. |
| Hearing Schedule | Upcoming/Past/All; Matter filter; search; next hearing; upcoming; past; preparation; calendar/View Matter/message actions where supported. |
| Action Checklist | Overall progress; All/Overdue/Due Soon/Upcoming/Completed; each item shows Matter, due date, status and permitted next action. |
| Documents | Upload; search; Matter/type filters; document collection; actual preview/download/upload/sign-related actions permitted by current logic. |
| Messages | Matter/conversation list; selected Matter; thread; composer; legal-team context; existing MatterChatPanel remains the engine. |
| Appointments | Upcoming appointments; request; available slots if genuinely supported; history; assistance. Hearings are never presented as Appointments. |
| Identity Verification | Progress; existing required steps; submitted docs; checklist; contextual support. Screenshot text is not legal authority. |
| Sign Documents | Pending requests; preview; review/sign; recently signed; steps; support. Preserve current OTP/signature/envelope behavior where implemented. |
| Notifications | All/Unread/Documents/Messages/Hearings; Today/This Week/Earlier; Important Dates; mark read/all read. Preference toggles only if persistence exists. |
| Profile | Personal Information; Account Overview; Communication Preferences; Security & Access; Emergency Contact. Preserve existing password/MFA/session/avatar/security functionality. |

## [Heading 1 #9 — no title text in DOCX XML]

After every implementation phase, the coding agent must produce evidence. “Done” without evidence is not an acceptable completion state.

| Evidence | Required |
| --- | --- |
| Phase ID and scope | Yes |
| Files changed | Yes |
| Routes affected | Yes |
| Reference requirement implemented | Yes |
| Existing behavior preserved | Yes |
| Tests run + result | Yes |
| Before screenshot | Yes for visual phases |
| After screenshot | Yes for visual phases |
| Reference comparison | Yes for visual phases |
| Known differences | Must be NONE or explicitly approved |
| Skipped items | Must be NONE or a documented blocker |

### [Heading 2 #4 — no title text in DOCX XML]

npm run format:check

npm run lint

npm run typecheck

npm run test

npm run build

npm run test:e2e

Use targeted tests during phases and the full relevant Client suite at final freeze. The project remains localhost-only; the UI redesign does not change production-readiness status.

## [Heading 1 #10 — no title text in DOCX XML]

| Viewport | Required review |
| --- | --- |
| 1440 x 900 | Primary desktop |
| 1280 x 800 | Smaller laptop |
| 1024 x 768 | Tablet/compact desktop |
| 768 px width | Breakpoint transition |
| 390 x 844 | Primary mobile |
| 360 px width | Small mobile |

Mobile primary navigation must be Home, Matters, Documents, Messages and More, with visible text labels. Client users must not be required to memorize icon meanings.

- Keyboard navigation and visible focus.
- Correct form labels and error announcements.
- Dialog focus management.
- Adequate touch targets and color contrast.
- Reduced-motion support.
- Operational text generally not below 12 px; body/list text should normally be around 14 px with secondary text around 13 px.

## [Heading 1 #11 — no title text in DOCX XML]

- An approved reference requires data or behavior that cannot be found in the repository.
- A proposed Client shared-component change alters Staff or Admin appearance or behavior.
- A screenshot suggests a control that has no persistent backend capability.
- A schema/API/authorization change appears necessary only to imitate a screenshot.
- Two references conflict outside the conflict rules already resolved in this document.
- An existing capability appears unused but its purpose or dependency is unclear.
- An approved reference file for the page is missing or cannot be opened.

> **REQUIRED BLOCKER REPORT**
>
> When a stop condition occurs, report: (1) observed conflict, (2) repository evidence, (3) reference evidence, (4) affected files/routes, and (5) safe options. Do not silently choose one.

## [Heading 1 #12 — no title text in DOCX XML]

- Do not guess missing requirements or invent data/behavior.
- Do not hard-code screenshot sample arrays inside Client React pages.
- Do not revive the removed Convex mock provider or create a second frontend data layer.
- Do not duplicate routes, chat engines, document engines or parallel design systems.
- Do not delete a working function solely because the mockup does not display it.
- Do not globally restyle Staff/Admin while implementing Client.
- Do not change authorization, tenancy or database architecture for UI purposes.
- Do not reintroduce Billing, Payments, Payroll, Finance, Expenses or Conflict Checker.
- Do not use a white sidebar on isolated Client pages.
- Do not highlight Appointments on the Hearing route.
- Do not hard-code 2025 or sample screenshot dates into production UI; dates remain data-driven. A frozen test clock may be used for deterministic visual tests.
- Do not implement fake notification/KYC/signature controls just because a reference image contains them.
- Do not claim completion while any acceptance row fails.

## [Heading 1 #13 — no title text in DOCX XML]

| Gate | Owner reviews | Rule |
| --- | --- | --- |
| Gate 1 - Foundation | Master sidebar/topbar, colors, typography, cards, buttons and Home visual anchor. | If incorrect, stop before other screens proliferate. |
| Gate 2 - Core legal journey | Home, My Matters, Matter Details, Hearings, Checklist. | All five must be consistent before Client services continue. |
| Gate 3 - Client services | Documents, Messages, Appointments, Identity Verification, Sign Documents. | All workflows and references must pass. |
| Gate 4 - Final Client | Notifications, Profile, responsive/mobile, final consistency. | Only after PASS is Client frozen and Staff work permitted. |

## [Heading 1 #14 — no title text in DOCX XML]

| Screen | Reference/Visual | Function | Responsive/States | Accessibility |
| --- | --- | --- | --- | --- |
| Home | PASS required | PASS required | PASS required | PASS required |
| My Matters | PASS required | PASS required | PASS required | PASS required |
| Matter Details | PASS required | PASS required | PASS required | PASS required |
| Hearings | PASS required | PASS required | PASS required | PASS required |
| Checklist | PASS required | PASS required | PASS required | PASS required |
| Documents | PASS required | PASS required | PASS required | PASS required |
| Messages | PASS required | PASS required | PASS required | PASS required |
| Appointments | PASS required | PASS required | PASS required | PASS required |
| Identity Verification | PASS required | PASS required | PASS required | PASS required |
| Sign Documents | PASS required | PASS required | PASS required | PASS required |
| Notifications | PASS required | PASS required | PASS required | PASS required |
| Profile | PASS required | PASS required | PASS required | PASS required |

> **FREEZE RULE**
>
> One FAIL means the Client UI upgrade is not complete. Staff work must not begin until every row is PASS and the owner has approved Gate 4.

## [Heading 1 #15 — no title text in DOCX XML]

The following pages embed the frozen visual references to keep future implementation sessions from relying on chat memory. The master-shell rule still applies: Home controls the dark sidebar/topbar/global visual language. Matter Details and Checklist screenshots that show a light/white sidebar are BODY references only; their final implementation must use the master dark shell.

> **REFERENCE USE RULE**
>
> Use these images for visual comparison. Do not copy sample values as production data. Data comes from deterministic local fixtures and remains query-driven.

Reference 01 - Home

Master shell + Home body. This is the highest visual authority for the Client Portal.

*Visual reference 01 — Reference 01 - Home.* Embedded in the authoritative DOCX as `word/media/image1.jpg` (JPEG). Separate file `01-home.png` was not available as a PNG source and was not generated. **DOCX remains the visual authority.**

Reference 02 - My Matters

Body reference. Must use the Home master shell.

*Visual reference 02 — Reference 02 - My Matters.* Embedded in the authoritative DOCX as `word/media/image2.jpg` (JPEG). Separate file `02-my-matters.png` was not available as a PNG source and was not generated. **DOCX remains the visual authority.**

Reference 03 - Matter Details

BODY REFERENCE ONLY for the content area. The light sidebar in this image is rejected; final page uses the Home dark shell.

*Visual reference 03 — Reference 03 - Matter Details.* Embedded in the authoritative DOCX as `word/media/image3.jpg` (JPEG). Separate file `03-matter-details.png` was not available as a PNG source and was not generated. **DOCX remains the visual authority.**

Reference 04 - Hearing Schedule

Body reference. /client/hearings belongs to My Matters and must never activate Appointments.

*Visual reference 04 — Reference 04 - Hearing Schedule.* Embedded in the authoritative DOCX as `word/media/image4.jpg` (JPEG). Separate file `04-hearings.png` was not available as a PNG source and was not generated. **DOCX remains the visual authority.**

Reference 05 - Action Checklist

BODY REFERENCE ONLY. Final page uses the Home dark shell.

*Visual reference 05 — Reference 05 - Action Checklist.* Embedded in the authoritative DOCX as `word/media/image5.jpg` (JPEG). Separate file `05-checklist.png` was not available as a PNG source and was not generated. **DOCX remains the visual authority.**

Reference 06 - Documents

Body reference + master shell. Preserve actual upload/preview/download permissions.

*Visual reference 06 — Reference 06 - Documents.* Embedded in the authoritative DOCX as `word/media/image6.jpg` (JPEG). Separate file `06-documents.png` was not available as a PNG source and was not generated. **DOCX remains the visual authority.**

Reference 07 - Messages

Body reference + master shell. Existing MatterChatPanel remains the message engine.

*Visual reference 07 — Reference 07 - Messages.* Embedded in the authoritative DOCX as `word/media/image7.jpg` (JPEG). Separate file `07-messages.png` was not available as a PNG source and was not generated. **DOCX remains the visual authority.**

Reference 08 - Appointments

Body reference + master shell. Hearings and Appointments remain separate concepts.

*Visual reference 08 — Reference 08 - Appointments.* Embedded in the authoritative DOCX as `word/media/image8.jpg` (JPEG). Separate file `08-appointments.png` was not available as a PNG source and was not generated. **DOCX remains the visual authority.**

Reference 09 - Identity Verification

Body reference + master shell. Visual copy is not legal/regulatory authority.

*Visual reference 09 — Reference 09 - Identity Verification.* Embedded in the authoritative DOCX as `word/media/image9.jpg` (JPEG). Separate file `09-identity-verification.png` was not available as a PNG source and was not generated. **DOCX remains the visual authority.**

Reference 10 - Sign Documents

Body reference + master shell. Preserve existing signing/security workflow.

*Visual reference 10 — Reference 10 - Sign Documents.* Embedded in the authoritative DOCX as `word/media/image10.jpg` (JPEG). Separate file `10-sign-documents.png` was not available as a PNG source and was not generated. **DOCX remains the visual authority.**

Reference 11 - Notifications

Body reference + master shell. Preference toggles require verified persistence before being interactive.

*Visual reference 11 — Reference 11 - Notifications.* Embedded in the authoritative DOCX as `word/media/image11.jpg` (JPEG). Separate file `11-notifications.png` was not available as a PNG source and was not generated. **DOCX remains the visual authority.**

Reference 12 - Profile

Body reference + master shell. Client styling must not globally alter shared Staff/Admin profile presentation.

*Visual reference 12 — Reference 12 - Profile.* Embedded in the authoritative DOCX as `word/media/image12.jpg` (JPEG). Separate file `12-profile.png` was not available as a PNG source and was not generated. **DOCX remains the visual authority.**

## [Heading 1 #16 — no title text in DOCX XML]

This document is version 1.0 and is locked as the Client UI source of truth. A future change to scope, navigation, design authority, fixture strategy, page contract or acceptance rule must be made by revising this document and incrementing its version. Do not silently reinterpret it in a coding session.

| Change type | Required action |
| --- | --- |
| Owner changes a UI decision | Revise this document, record the changed rule and increment version. |
| Repository architecture changes before implementation | Re-audit affected files, update only the impacted sections, preserve all unaffected locked decisions. |
| Reference image replaced | Replace the embedded reference, note what changed, and re-run affected visual acceptance. |
| New Client module is intentionally added | Owner approval + route/file/fixture/reference/acceptance contract must be added before implementation. |
| Staff/Admin project begins | Create separate Staff/Admin source-of-truth documents. Do not mutate the Client contract to fit those roles. |

> **FINAL EXECUTION INSTRUCTION**
>
> A future Codex / Grok 4.6 session should first read this document, inspect the current repository, confirm the audited assumptions still hold, and then execute one CUI phase at a time. It must not compress the plan into a single uncontrolled redesign pass.
