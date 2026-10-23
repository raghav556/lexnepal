# Session 17F — Nepal courts registry and bilingual selectors

2026-10-22, Asia/Kathmandu. **Implementation/QA PASS for owner/TL review; not yet owner-approved.** 110 verified standing court/bench/tribunal identities, no duplicate institutions. No staging, commit, push, merge, deployment, schema change, migration, dependency addition or live browser mutation.

## Safety and verification policy

Worktree D:\lexnepal\.local\worktrees\ui-staff-admin-upgrade; branch ui/staff-admin-upgrade. Local/fresh origin HEAD f8fafdb66006095678cf4448a0b10e4138a9ea45, origin https://github.com/raghav556/lexnepal.git. Empty index. Root AGENTS.md, installed Next.js use-client guidance and authoritative Client DOCX/Markdown were read. Reused localhost:3001 and existing installed Playwright/pdfjs; no new server or original-checkout edit.

Protected Session08 remains the sole unrelated modification, untouched and unstaged. SHA-256: 1ACEB9535586A43197F561057EEC9DB9409CAB5F12994629C43F86F5FE7BC78E.

The [Supreme Court directory](https://supremecourt.gov.np/web/yentemp) supplies 77 districts, seven principals and eleven benches. Each district/high-court office page was fetched and reconciled with its own published bilingual COURT_NAME fields; 97 office/main pages returned HTTP200. The [official NSO administrative-code dataset](https://ec.nsonepal.gov.np/html/admin_code.html) verifies all 77 distinct district codes and province relationships. District-court location metadata is explicitly district-level, not an inferred street address. Every JSON entry records all source URLs, checked date, status and English-name provenance; the table below links its principal source. Inclusion means an operating institution supported by current official directory/own-site information or an official work record, not a guarantee of a sitting on a particular day.

| Category | Verified count |
| --- | ---: |
| Supreme Court | 1 |
| Principal High Courts | 7 |
| High Court benches | 11: nine regular, two explicitly temporary |
| District Courts | 77 |
| Specialized courts | 6: Special, Labour, Administrative, Consumer, Juvenile/Bal Adalat Bhaktapur, Military Special |
| Tribunals | 8: Foreign Employment; bank Debt Recovery; Debt Recovery Appellate; four Revenue locations; cooperative Loan Recovery |
| **Total** | **110** |

The provisional107 omits three independently corroborated institutions: [cooperative Loan Recovery Tribunal](https://lrt.gov.np/) (official 2082/83 report/news and [constitutive introduction](https://lrt.gov.np/pages/introduction/)); [Bal Adalat Bhaktapur](https://nijamati.pis.gov.np/pages/organization-structure-list-with-code-1102813616/) (office code80-29-0116-1 and [Parliamentary reply confirming work commenced](https://hr.parliament.gov.np/uploads/attachments/oykb6ouslr1ouu2p.pdf)); Military Special Court ([current Council remit](https://www.jcs.gov.np/faq/), [latest Supreme Court annual report, PDF page130](https://supremecourt.gov.np/web/assets/downloads/annual/barsik-pratibedan-208182.pdf#page=130), inspection2082/03/11–13, [official English nomenclature](https://supremecourt.gov.np/web/assets/downloads/judgements/Some%20Landmark%20Decision%20-%20Vol.%204.pdf) and [court address](https://nkp.gov.np/full_detail/9384)). The annual report's extracted text has broken font mappings; its actual PDF page was rendered with the already installed pdfjs and visually checked (annual-page-130.png). This is a source-document rendering, not a browser UI screenshot.

## Source reconciliation and exclusions

- Butwal belongs to High Court Tulsipur; Hetauda to High Court Patan. All eleven parent links are sourced, never independent principal courts. Okhaldhunga and Birganj are explicitly temporary benches, currently listed by the judiciary.
- Nawalparasi court is in NSO507 (Bardaghat Susta West, Lumbini); Nawalpur is408 (East, Gandaki). Rukum court is608 (West, Karnali); Rukumkot is501 (East, Lumbini). The individual court pages explicitly identify east/west addresses. No alias is a second institution.
- [Labour Court](https://labourcourt.gov.np/) now lists Darbar Square, Bhaktapur. [Revenue Tribunal Kathmandu](https://revenuetribunal.gov.np/) retains that institutional name while its seat is Pulchowk, Lalitpur. Its [official introduction](https://revenuetribunal.gov.np/pages/view/about_us) and [IRD explanation](https://ird.gov.np/faq/?gid=97) corroborate all four operating Revenue locations.
- Own-office Nepali names take precedence over navigation spelling variants; published variants are retained as aliases. The Nepalgunj page's English Hig typo and Jumla capitalization/punctuation are explicitly identified transliterations. Three Revenue English location labels combine the verified institutional title with identified place transliteration. Bal Adalat uses an identified transliteration with an English explanation, not an invented official English brand. Place-only NSO variants (Birgunj/Nepalgunj municipality names) are search aliases, never sufficient identity aliases.
- Some direct LRT/PIS/JCS/CDN fetches reset or timed out; official indexed page content and corroborating official publications were used. Source quality/age is disclosed rather than claiming every source was live-fetched. No included court relies on a news/blog claim alone.
- Local judicial committees, development-authority appeal committees, administrative/quasi-judicial authorities and arbitration panels are separately classified and excluded. Ordinary courts-martial/police/APF disciplinary panels are potentially ad hoc; no current independently verified standing-office/location roster was established. They are unresolved verification candidates, not fabricated active options. Proposed provincial Consumer/Juvenile expansions, dissolved appellate courts and proposed high-powered courts are excluded without operational proof. This registry does not certify every possible case-specific adjudicative panel; such an extension requires authoritative current constitution/location evidence. No currently verified standing institution found during this review is omitted.

## Canonical contract and complete consumer inventory

src/lib/nepal-courts.json is the sole machine-readable registry. src/lib/nepal-courts.ts supplies readonly types, exact unambiguous resolution, bilingual formatting/search and identity matching. COURTS in lex-constants is a derived compatibility projection, not a second list. IDs are internal; new selections submit the existing English court-name string (max300), never a new courtId field. The final name-quality review below separates nine corrected display labels from their preserved original submission strings. No server/API/auth/schema file changed.

One CourtSelect reuses existing Input/Button tokens, the global search palette's input/listbox pattern, floating-position helper and existing theme portal. There is no installed searchable Select/Popover to duplicate and no added dependency. It provides category groups, province/district context, bilingual/verified alias search, parent/temporary distinction, full wrapped selected text, keyboard selection/Escape/Tab, screen-reader relationships, a focusable scroll region and viewport collision handling. Input search drafts never become stored court values. Global locale changes only presentation. Legacy strings are displayed separately with Needs verification, never injected as official options.

| Source / field | Route or consumer | Integration and preservation |
| --- | --- | --- |
| case-create-dialog / case-court | Staff/Admin Cases; /admin/cases/new redirects to the same create flow | Shared verified selector; same create command, lead/team/date/required fields |
| case-hearing-dialog / case-hearing-court | Staff/Admin case detail Schedule hearing | Shared selector; verified aliases resolve for a new hearing; unknown defaults require deliberate verified selection |
| StaffHearingsPage / hearing-create-court | Staff Hearings/Pesi create | Shared selector, including inherited case values; canonical string submitted; dates/times unchanged |
| StaffHearingsPage / hearing-court-filter | Staff Hearings | Shared selector; reset-to-all is a filter action outside the official list; identity matching includes historical bench aliases |
| StaffCaseDetailPage / detail-court | Staff/Admin case editor | Shared selector; unknown raw value retained on unrelated PATCH; explicit correction requires a verified choice |
| StaffHearingsPage / progress/archive/calendar summaries | Staff Hearings update and previews | Court remains read-only. Existing hearing-update schema has no court-write field; no false editor or ignored payload field was added. Replacing a historical hearing's court requires a separately authorized command/contract extension. |
| cases-workspace | Staff/Admin case search | Searches canonical bilingual identities and original legacy text without changing lifecycle filters/pagination |
| StaffCaseDetailPage, StaffDashboard, AdminDashboard | Detail overview, timeline, hearings and dashboard previews | Locale-aware read-only labels; source records/instants/permissions unchanged |
| ClientCasesPage, ClientCaseDetailPage, ClientHearingsPage, ClientDashboard | Client matter table/context, details, hearing lists and Home | Read-only locale labels/Needs verification; case/hearing search includes both identity and original text; no court editor introduced |
| StaffResearchPage / work-management category enum | Research source-level tags | Kept: court level/category is not selection of an institution; not replaced by110 court records |
| TemplateGeneratorModal, AdminDocumentGenerator, AdminTemplatesPage; ICS/CSV/JSON and migrations | Export/placeholders/historical imports | Kept: original authoritative string/payloads; no export contract rewrite, import execution or stored-record backfill |
| Other Admin/Client/Public, tasks/appointments/CRM/HR/content/documents/chat | Repository-wide court-reference search | No additional institution selector exists. Decorative icons, prose, category tags and generic appointment court-prep text are not court dropdowns. No invented Public/Client court-selection flow. |

**Five shared selector declarations cover eight real route/form/filter contexts.** All use the same registry/control; read-only consumers remain read-only. Complete source-reference search is saved as consumer-search.txt. No date-conversion or pagination architecture changed; the canonical converter, compatibility facade, BsDateField, Dialog, Pagination and usePagination match committed HEAD exactly. All26 date-field declarations remain; baseline CSS is retained verbatim with a scoped CourtSelect addition.

## Actual stored values and legacy decisions

A local-only MySQL transaction was explicitly READ ONLY and rolled back; only grouped court strings/counts were read, no person or case details. Actual values below are preserved (stored-courts.json). No production database was accessed or rewritten.

| Collection | Original stored court | Records |
| --- | --- | ---: |
| cases | Supreme Court of Nepal | 6 |
| cases | Family Court, Lalitpur | 1 |
| cases | Lalitpur District Court | 1 |
| cases | (null) | 1 |
| cases | High Court, Kathmandu | 1 |
| cases | Revenue Tribunal | 1 |
| hearings | Kathmandu District Court | 1 |
| hearings | Supreme Court of Nepal | 2 |
| hearings | High Court, Kathmandu | 2 |
| hearings | Lalitpur District Court | 2 |
| hearings | High Court — Hetauda | 1 |
| hearings | Revenue Tribunal | 1 |
| hearings | High Court — Butwal | 1 |
| hearings | Family Court, Lalitpur | 1 |

Supreme Court/standard district spellings resolve exactly. Observed Kathmandu District Court and Lalitpur District Court aliases resolve to the verified district identities. Old High Court — Butwal/Hetauda resolve to the correct parent-bench identities. Generic Revenue Tribunal, High Court, Kathmandu, Family Court, Lalitpur, Other and unrecognized strings do not receive guessed replacements. Null stays absent. Existing raw alias/unresolved values remain byte-for-byte unchanged in unrelated case PATCHs; new hearing creation requires a verified court. No generic Other/Unknown option is available for new selections.

## QA and evidence

| Focused browser phase | Check groups | Clean scoped scans | Intercepted writes | Evidence under .local/qa/session-17f/ |
| --- | ---: | ---: | ---: | --- |
| Six-width matrix | 192 | 128 | 0 | browser-evidence.json |
| Preservation/create/filter contracts | 34 | 0 | 30 | browser-evidence-commands-core.json |
| Explicit unknown correction | 2 | 0 | 2 | browser-evidence-correction.json |
| Read-only Client | 4 | 4 | 0 | browser-evidence-client.json |
| All 110 identities / both languages | 2 | 2 | 0 | browser-evidence-registry.json |
| Final child-popup focus regression | 16 | 34 | 0 | browser-evidence-smoke.json |
| **Reconciled total** | **250** | **168** | **32** | evidence-summary.json |

Zero browser exceptions and zero live writes in the successful evidence. The matrix covers360/390/768/1024/1280/1440, EN/NE, light/dark for all eight contexts. The complete-registry phase verifies every rendered ID against the JSON, then actually searches/selects all110 entries in each language (220 selections), plus verified Birgunj alias search and keyboard PageDown/Escape focus restoration. It does not claim all110 were visually replayed at every width.

Contract evidence includes20 unrelated-edit PATCHs preserving known/unknown/empty raw strings; ten case/hearing POSTs across Staff/Admin and both languages; two explicit unresolved-to-verified case corrections. The original two known-alias correction checks/writes in the core artifact are superseded, excluded and replaced by the dedicated unknown-correction artifact. Four Client read-only checks prove both canonical and unresolved identities remain searchable, with no editable court selector. No failed attempt is counted or warning suppressed.

Focused unit/model/API/security/Client/calendar regression: **10 files,93 passed and two independently proven historical failures** (unit.json). The unchanged R7 source regexes expect old hook names in Client Home/checklist. Reading committed f8fafdb source bytes using unmodified assertions reproduces exactly those two failures (baseline4 passed/2 failed; r7-baseline-proof.json). No existing test was edited, skipped or weakened. Final registry/Client contract run: **four files,22 passed, zero failed** (unit-final.json); overlapping results are not summed. TypeScript/focused ESLint exit0 (validation-final.json); whitespace/new-file EOF and exact scope pass in final-safety.json. No full-suite or production-build pass is claimed.

Browser QA found and fixed three genuine shared-control defects: Escape initially propagated to its parent dialog; highlighted geographic metadata retained insufficient-contrast muted text; the full110-item popup lacked keyboard-focusable scrolling. Capture-phase Escape, inherited active text color, and the named focusable results region/blur handling fix them. Fresh child-dialog and full-registry keyboard/axe checks pass. A Client next-hearing context still showed the raw alias; it now uses the same formatter. Wrapping the full selected identity preserves legibility when the native search input is narrow.

Harness corrections used actual Edit details/Save controls, the Admin judge field's existing parent structure, scoped court-listbox options rather than native Case options, and real Client Cards/Table modes. Successful prior contract groups were resumed explicitly after harness-only corrections. Earlier109-entry matrices and failed logs remain historical; final evidence above uses110 identities and excludes those superseded results. Generic failed-log filenames are not relabelled green.

Genuine browser review captures: court-{staff-create|admin-create|staff-edit|admin-edit|staff-schedule|admin-schedule|hearings-create|hearings-filter}-{en|ne}-{360-dark|1440-light}.png; court-legacy-{staff|admin}-needs-verification.png; court-client-{readonly|unresolved}-{en|ne}-390-dark.png. Representative Nepali mobile create/dropdown, unknown Admin record and Client read-only evidence were visually inspected. PDF source evidence is labelled separately above. Browser validation is installed Chromium/Playwright; no cross-browser, live persistence or whole-portal accessibility certification is claimed.

## Final English name-quality review

All **110 English institution labels and 77 district relationships** were reviewed against the retained judiciary office evidence and the **CBS (now NSO) Economic Census Atlas**, printed p.19/PDF p.20: [official publication hosted by Japan's Statistics Bureau](https://www.stat.go.jp/info/meetings/nepal/pdf/1-cover-contents.pdf#page=20). Its complete district-code table was extracted and visually inspected (`name-cbs-atlas.pdf`, `name-cbs-atlas-page-20.png`); PDF extraction artifacts for Ilam, Bajhang and Kailali were reconciled with the rendered page. The [NSO administrative-code dataset](https://ec.nsonepal.gov.np/html/admin_code.html) supplies the current province/district distinctions; [NSO's district-name codebook](https://microdata.nsonepal.gov.np/index.php/catalog/54/variable/F1/V1%3Fname%3DDIST) independently corroborates spellings (its historical 75-district boundaries are not used for current identities). The complete 110-row decision record, 77-code comparison and exact metadata/alias changes are in `name-review-audit.json`.

| Stable ID | Published English variant retained as alias/submission | Corrected English display |
| --- | --- | --- |
| district-bhaktapur | District Court Bhaktpur | District Court Bhaktapur |
| district-ramechap | District Court ramechap | District Court Ramechhap |
| district-taplejung | District Court Taplejuung | District Court Taplejung |
| district-syangjya | District Court Syangjya | District Court Syangja |
| district-achham | District Court Aacham | District Court Achham |
| district-argakhanchi | District Court Argakhanchi | District Court Arghakhanchi |
| district-dhadhing | District Court Dhadhing | District Court Dhading |
| district-therathum | District Court Therathum | District Court Terhathum |
| district-baitadi | Baitadi District Court Gadi Baitadi | Baitadi District Court |

These are **nine display corrections**, not newly constituted or renamed courts. Original judiciary English variants remain exact identity aliases with their original office sources; each corrected entry adds the CBS/NSO source and an `englishNameNote`, and is explicitly classified as an identified transliteration. NSO consistently uses **Terhathum** in the compared atlas/codebook; the judiciary's Therathum variant remains searchable. Baitadi's Gadi address text is removed from the institution label and district metadata without changing its identity.

Thirteen English district-context fields are corrected: the nine district records above, Bhaktapur context in Labour Court/Bal Adalat, and **Dang** context in High Court Tulsipur/Dang Deukhuri District Court. The verified **Dang Deukhuri District Court** institution title remains. District-level locations follow those corrections; no street address is inferred. Valid published variants **Chitwan/Chitawan, Kavrepalanchowk/Kavrepalanchok, Sindhupalchowk/Sindhupalchok, Tanahun/Tanahu and Makwanpur/Makawanpur** are reconciled as search aliases rather than declared institutional name errors. The four east/west identities and their descriptive metadata remain distinct. All seven principals, eleven parent-linked benches and fourteen specialized/tribunal identities retain their verified labels; Birganj/Birgunj remains a documented variant.

**Payload preservation:** the nine corrected entries carry their previous English `submissionValue`. The shared selector, `officialCourtValue` and derived compatibility `COURTS` projection use that value; English/Nepali presentation uses `name`. All **110 previous wire strings**, existing identity/search aliases, Nepali names, stable IDs, category/status/parent links, province and district codes are verified unchanged (`name-review-contracts.json`). Existing historical records are not rewritten; unresolved strings retain the prior preservation rules. No per-route callback or API/schema changed.

This review changes only **seven existing Session17F paths**: this report, canonical JSON, typed registry helper, derived lex-constants projection, CourtSelect, registry tests and the existing QA harness. Total scope remains **19 paths**, with no addition. Earlier 250 browser groups/168 scans and historical failures remain prior evidence and are not rerun or relabelled as this review's results.

Focused closure: **16 registry/alias/API-contract tests passed, zero failed** (`unit-name-review.json`); nine added cases verify corrected/original/Nepali identities, display/search, exact submission strings and unrelated-edit preservation. Snapshot comparison independently verifies all 110 prior wire strings and identity aliases. **16 browser groups, 32 clean scoped axe scans, zero browser exceptions, 14 intercepted requests and zero live browser mutations** (`browser-evidence-name-review.json`): all eight selector contexts in EN1440/light and NE390/dark; all nine corrected labels and old source strings actually searched/selected in both languages; keyboard Enter/Escape, focus, popup containment, filter results, case/hearing POSTs, case PATCHs and unchanged hearing A.D. dates checked. Actual global language switching on the unobstructed Hearings filter preserves the selected original value; modal forms are opened in each language. Genuine paired `court-name-review-{en-1440-light|ne-390-dark}.png` captures were visually inspected. Prior six-width/theme evidence covers unchanged layout code.

Two harness-only failures are preserved: trying to activate the global language control behind an open modal, and expecting `Pagination matter 1` instead of the fixture's exact `Pagination matter 001`. No forced click or production change was used. Fourteen successful form/payload groups and their 28 scans were retained explicitly; only the two filter groups were resumed after correcting the fixture assertion. The final artifact reconciles these sources, excludes failed attempts and asserts exact totals. Reproduce with `node scripts/qa/verify-court-registry.mjs --name-review`; `--name-review-resume` explicitly imports the named retained 14-group artifact, rather than claiming those groups reran.

TypeScript and focused ESLint exit **0** (`tsc-name-review.log`, `eslint-name-review.log`, final harness lint repeated after harness correction). Whitespace, exact 19-path scope, seven-path review delta, unchanged branch/local/remote HEAD, empty index and protected Session08 integrity are recorded in `name-review-safety.json`. Historical R7 failures remain unchanged prior evidence. **PASS for the final owner/TL review; no new verification blocker. No staging, commit or push until explicit approval of this name review.**

## Limits and review gate

No new retrieval, cause-list integration, jurisdiction/deadline computation, migrations or authorization behavior. Hearing-court replacement is not supported by the existing update contract and remains read-only. Unverified ad hoc service panels/proposed institutions remain excluded pending the current authoritative evidence described above; absence of an operating roster is not a claim that no such panel can exist. All included identities and all existing applicable selectors are complete within the verified standing-institution scope.

Historical Client/color-contrast/public-logo limitations and the two baseline-proven R7 assertions are retained, not fixed through unrelated changes. Session17D remains deferred, not completed/cancelled: Documents, Case Misl, document-derived case history, profile audit history and notifications. No Session18 work.

## Exact changed paths and final Git state

**19 Session17F paths:13 modified, six new.** Protected Session08 is excluded from this scope.

1. `doc/ui-reference/staff-admin/SESSION-17F-NEPAL-COURTS-REGISTRY-REPORT.md`
2. `scripts/qa/verify-court-registry.mjs`
3. `src/components/cases/case-create-dialog.tsx`
4. `src/components/cases/case-hearing-dialog.tsx`
5. `src/components/cases/cases-workspace.tsx`
6. `src/components/ui/court-select.tsx`
7. `src/index.css`
8. `src/lib/lex-constants.ts`
9. `src/lib/nepal-courts.json`
10. `src/lib/nepal-courts.ts`
11. `src/views/admin/AdminDashboard.tsx`
12. `src/views/client/ClientCaseDetailPage.tsx`
13. `src/views/client/ClientCasesPage.tsx`
14. `src/views/client/ClientDashboard.tsx`
15. `src/views/client/ClientHearingsPage.tsx`
16. `src/views/staff/StaffCaseDetailPage.tsx`
17. `src/views/staff/StaffDashboard.tsx`
18. `src/views/staff/StaffHearingsPage.tsx`
19. `tests/unit/nepal-courts.test.ts`

Local/fresh origin HEAD f8fafdb66006095678cf4448a0b10e4138a9ea45; branch ui/staff-admin-upgrade; index empty. The only unrelated change is protected Session08 with unchanged SHA-256 1ACEB9535586A43197F561057EEC9DB9409CAB5F12994629C43F86F5FE7BC78E. Final status:

```text
 M doc/ui-reference/staff-admin/SESSION-08-ENGINEERING-REPORT.md
 M src/components/cases/case-create-dialog.tsx
 M src/components/cases/case-hearing-dialog.tsx
 M src/components/cases/cases-workspace.tsx
 M src/index.css
 M src/lib/lex-constants.ts
 M src/views/admin/AdminDashboard.tsx
 M src/views/client/ClientCaseDetailPage.tsx
 M src/views/client/ClientCasesPage.tsx
 M src/views/client/ClientDashboard.tsx
 M src/views/client/ClientHearingsPage.tsx
 M src/views/staff/StaffCaseDetailPage.tsx
 M src/views/staff/StaffDashboard.tsx
 M src/views/staff/StaffHearingsPage.tsx
?? doc/ui-reference/staff-admin/SESSION-17F-NEPAL-COURTS-REGISTRY-REPORT.md
?? scripts/qa/verify-court-registry.mjs
?? src/components/ui/court-select.tsx
?? src/lib/nepal-courts.json
?? src/lib/nepal-courts.ts
?? tests/unit/nepal-courts.test.ts
```

**Stop for owner/TL review. No staging, commit, push, merge or deployment.**

## Every verified registry identity

All entries checked2026-10-22. Full provenance/English-name kind/aliases/locations are in the canonical JSON. Common province/district evidence is the official NSO dataset linked above.

| # | Stable ID | English identity | नेपाली पहिचान | Category / parent | Province / district | Primary evidence |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | supreme-nepal | Supreme Court of Nepal | सर्वोच्च अदालत नेपाल | supreme | Bagmati / Kathmandu | [Official source](https://supremecourt.gov.np/web/) |
| 2 | high-biratnagar | High Court Biratnagar | उच्च अदालत विराटनगर | high | Koshi / Morang | [Official source](https://supremecourt.gov.np/court/biratnagarhc) |
| 3 | high-dipayal | High Court Dipayal | उच्च अदालत दिपायल | high | Sudurpashchim / Doti | [Official source](https://supremecourt.gov.np/court/dipayalhc) |
| 4 | high-janakpur | High Court Janakpur | उच्च अदालत जनकपुर | high | Madhesh / Dhanusa | [Official source](https://supremecourt.gov.np/court/janakpurhc) |
| 5 | high-patan | High Court Patan | उच्च अदालत पाटन | high | Bagmati / Lalitpur | [Official source](https://supremecourt.gov.np/court/patanhc) |
| 6 | high-pokhara | High Court Pokhara | उच्च अदालत पोखरा | high | Gandaki / Kaski | [Official source](https://supremecourt.gov.np/court/pokharahc) |
| 7 | high-surkhet | High Court Surkhet | उच्च अदालत सुर्खेत | high | Karnali / Surkhet | [Official source](https://supremecourt.gov.np/court/surkhethc) |
| 8 | high-tulsipur | High Court Tulsipur | उच्च अदालत तुलसीपुर | high | Lumbini / Dang | [Official source](https://supremecourt.gov.np/court/tulsipurhc) |
| 9 | high-dhankuta | High Court Biratnagar, Dhankuta Bench | उच्च अदालत विराटनगर, धनकुटा इजलास | bench / high-biratnagar | Koshi / Dhankuta | [Official source](https://supremecourt.gov.np/court/dhankutahc) |
| 10 | high-illam | High Court Biratnagar, Ilam Bench | उच्च अदालत विराटनगर, इलाम इजलास | bench / high-biratnagar | Koshi / Ilam | [Official source](https://supremecourt.gov.np/court/illamhc) |
| 11 | high-okhaldhunga | High Court Biratnagar, Temporary Bench Okhaldhunga | उच्च अदालत विराटनगर, अस्थायी इजलास ओखलढुंगा | bench (temporary) / high-biratnagar | Koshi / Okhaldhunga | [Official source](https://supremecourt.gov.np/court/okhaldhungahc) |
| 12 | high-mahendranagar | High Court Dipayal, Mahendranagar Bench | उच्च अदालत दिपायल, महेन्द्रनगर इजलास | bench / high-dipayal | Sudurpashchim / Kanchanpur | [Official source](https://supremecourt.gov.np/court/mahendranagarhc) |
| 13 | high-rajbiraj | High Court Janakpur, Rajbiraj Bench | उच्च अदालत जनकपुर, राजविराज इजलास | bench / high-janakpur | Madhesh / Saptari | [Official source](https://supremecourt.gov.np/court/rajbirajhc) |
| 14 | high-birganj | High Court Janakpur, Temporary Bench Birganj | उच्च अदालत जनकपुर, अस्थायी इजलास वीरगन्ज | bench (temporary) / high-janakpur | Madhesh / Parsa | [Official source](https://supremecourt.gov.np/court/birganjhc) |
| 15 | high-hetauda | High Court Patan, Hetauda Bench | उच्च अदालत पाटन, हेटौंडा इजलास | bench / high-patan | Bagmati / Makwanpur | [Official source](https://supremecourt.gov.np/court/hetaudahc) |
| 16 | high-baglung | High Court Pokhara, Baglung Bench | उच्च अदालत पोखरा, बाग्लुङ्ग इजलास | bench / high-pokhara | Gandaki / Baglung | [Official source](https://supremecourt.gov.np/court/baglunghc) |
| 17 | high-jumla | High Court Surkhet, Jumla Bench | उच्च अदालत सुर्खेत, जुम्ला इजलास | bench / high-surkhet | Karnali / Jumla | [Official source](https://supremecourt.gov.np/court/jumlahc) |
| 18 | high-butwal | High Court Tulsipur, Butwal Bench | उच्च अदालत तुलसीपुर, बुटवल इजलास | bench / high-tulsipur | Lumbini / Rupandehi | [Official source](https://supremecourt.gov.np/court/butwalhc) |
| 19 | high-nepalgunj | High Court Tulsipur, Nepalgunj Bench | उच्च अदालत तुलसीपुर, नेपालगंज इजलास | bench / high-tulsipur | Lumbini / Banke | [Official source](https://supremecourt.gov.np/court/nepalgunjhc) |
| 20 | district-baitadi | Baitadi District Court | बैतडी जिल्ला अदालत | district | Sudurpashchim / Baitadi | [Official source](https://supremecourt.gov.np/court/baitadidc) |
| 21 | district-dang | Dang Deukhuri District Court | दाङ  जिल्ला अदालत | district | Lumbini / Dang | [Official source](https://supremecourt.gov.np/court/dangdc) |
| 22 | district-achham | District Court Achham | अछाम जिल्ला अदालत | district | Sudurpashchim / Achham | [Official source](https://supremecourt.gov.np/court/achhamdc) |
| 23 | district-argakhanchi | District Court Arghakhanchi | अर्घाखाँची जिल्ला अदालत | district | Lumbini / Arghakhanchi | [Official source](https://supremecourt.gov.np/court/argakhanchidc) |
| 24 | district-baglung | District Court Baglung | बागलुङ जिल्ला अदालत | district | Gandaki / Baglung | [Official source](https://supremecourt.gov.np/court/baglungdc) |
| 25 | district-bajhang | District Court Bajhang | बझाँग जिल्ला अदालत | district | Sudurpashchim / Bajhang | [Official source](https://supremecourt.gov.np/court/bajhangdc) |
| 26 | district-bajura | District Court Bajura | बाजुरा जिल्ला अदालत | district | Sudurpashchim / Bajura | [Official source](https://supremecourt.gov.np/court/bajuradc) |
| 27 | district-banke | District Court Banke | बाँके जिल्ला अदालत | district | Lumbini / Banke | [Official source](https://supremecourt.gov.np/court/bankedc) |
| 28 | district-bara | District Court Bara | बारा जिल्ला अदालत | district | Madhesh / Bara | [Official source](https://supremecourt.gov.np/court/baradc) |
| 29 | district-bardiya | District Court Bardiya | बर्दिया जिल्ला अदालत | district | Lumbini / Bardiya | [Official source](https://supremecourt.gov.np/court/bardiyadc) |
| 30 | district-bhaktapur | District Court Bhaktapur | भक्तपुर जिल्ला अदालत | district | Bagmati / Bhaktapur | [Official source](https://supremecourt.gov.np/court/bhaktapurdc) |
| 31 | district-bhojpur | District Court Bhojpur | भोजपुर जिल्ला अदालत | district | Koshi / Bhojpur | [Official source](https://supremecourt.gov.np/court/bhojpurdc) |
| 32 | district-chitwan | District Court Chitwan | चितवन जिल्ला अदालत | district | Bagmati / Chitwan | [Official source](https://supremecourt.gov.np/court/chitwandc) |
| 33 | district-dadeldhura | District Court Dadeldhura | डडेलधुरा जिल्ला अदालत | district | Sudurpashchim / Dadeldhura | [Official source](https://supremecourt.gov.np/court/dadeldhuradc) |
| 34 | district-dailekh | District Court Dailekh | दैलेख जिल्ला अदालत | district | Karnali / Dailekh | [Official source](https://supremecourt.gov.np/court/dailekhdc) |
| 35 | district-darchula | District Court Darchula | दार्चुला जिल्ला अदालत | district | Sudurpashchim / Darchula | [Official source](https://supremecourt.gov.np/court/darchuladc) |
| 36 | district-dhadhing | District Court Dhading | धादिङ जिल्ला अदालत | district | Bagmati / Dhading | [Official source](https://supremecourt.gov.np/court/dhadhingdc) |
| 37 | district-dhankuta | District Court Dhankuta | धनकुटा जिल्ला अदालत | district | Koshi / Dhankuta | [Official source](https://supremecourt.gov.np/court/dhankutadc) |
| 38 | district-dhanusa | District Court Dhanusa | धनुषा जिल्ला अदालत | district | Madhesh / Dhanusa | [Official source](https://supremecourt.gov.np/court/dhanusadc) |
| 39 | district-dolakha | District Court Dolakha | दोलखा जिल्ला अदालत | district | Bagmati / Dolakha | [Official source](https://supremecourt.gov.np/court/dolakhadc) |
| 40 | district-dolpa | District Court Dolpa | डोल्पा जिल्ला अदालत | district | Karnali / Dolpa | [Official source](https://supremecourt.gov.np/court/dolpadc) |
| 41 | district-doti | District Court Doti | डोटी जिल्ला अदालत | district | Sudurpashchim / Doti | [Official source](https://supremecourt.gov.np/court/dotidc) |
| 42 | district-gorkha | District Court Gorkha | गोरखा जिल्ला अदालत | district | Gandaki / Gorkha | [Official source](https://supremecourt.gov.np/court/gorkhadc) |
| 43 | district-humla | District Court Humla | हुम्ला जिल्ला अदालत | district | Karnali / Humla | [Official source](https://supremecourt.gov.np/court/humladc) |
| 44 | district-ilam | District Court Ilam | इलाम  जिल्ला अदालत | district | Koshi / Ilam | [Official source](https://supremecourt.gov.np/court/ilamdc) |
| 45 | district-jajarkot | District Court Jajarkot | जाजरकोट जिल्ला अदालत | district | Karnali / Jajarkot | [Official source](https://supremecourt.gov.np/court/jajarkotdc) |
| 46 | district-jhapa | District Court Jhapa | झापा जिल्ला अदालत | district | Koshi / Jhapa | [Official source](https://supremecourt.gov.np/court/jhapadc) |
| 47 | district-jumla | District Court Jumla | जुम्ला जिल्ला अदालत | district | Karnali / Jumla | [Official source](https://supremecourt.gov.np/court/jumladc) |
| 48 | district-kailali | District Court Kailali | कैलाली जिल्ला अदालत | district | Sudurpashchim / Kailali | [Official source](https://supremecourt.gov.np/court/kailalidc) |
| 49 | district-kalikot | District Court Kalikot | कालिकोट जिल्ला अदालत | district | Karnali / Kalikot | [Official source](https://supremecourt.gov.np/court/kalikotdc) |
| 50 | district-kanchanpur | District Court Kanchanpur | कन्चनपुर जिल्ला अदालत | district | Sudurpashchim / Kanchanpur | [Official source](https://supremecourt.gov.np/court/kanchanpurdc) |
| 51 | district-kapilbastu | District Court Kapilbastu | कपिलवस्तु जिल्ला अदालत | district | Lumbini / Kapilbastu | [Official source](https://supremecourt.gov.np/court/kapilbastudc) |
| 52 | district-kaski | District Court Kaski | कास्की जिल्ला अदालत | district | Gandaki / Kaski | [Official source](https://supremecourt.gov.np/court/kaskidc) |
| 53 | district-kavrepalanchowk | District Court Kavrepalanchowk | काभ्रेपलान्चोक जिल्ला अदालत | district | Bagmati / Kavrepalanchowk | [Official source](https://supremecourt.gov.np/court/kavrepalanchowkdc) |
| 54 | district-khotang | District Court Khotang | खोटांग जिल्ला अदालत | district | Koshi / Khotang | [Official source](https://supremecourt.gov.np/court/khotangdc) |
| 55 | district-lamjung | District Court Lamjung | लमजुंग जिल्ला अदालत | district | Gandaki / Lamjung | [Official source](https://supremecourt.gov.np/court/lamjungdc) |
| 56 | district-mahottari | District Court Mahottari | महोत्तरी जिल्ला अदालत | district | Madhesh / Mahottari | [Official source](https://supremecourt.gov.np/court/mahottaridc) |
| 57 | district-makwanpur | District Court Makwanpur | मकवानपुर जिल्ला अदालत | district | Bagmati / Makwanpur | [Official source](https://supremecourt.gov.np/court/makwanpurdc) |
| 58 | district-manang | District Court Manang | मनांग जिल्ला अदालत | district | Gandaki / Manang | [Official source](https://supremecourt.gov.np/court/manangdc) |
| 59 | district-morang | District Court Morang | मोरंग जिल्ला अदालत | district | Koshi / Morang | [Official source](https://supremecourt.gov.np/court/morangdc) |
| 60 | district-mugu | District Court Mugu | मुगु जिल्ला अदालत | district | Karnali / Mugu | [Official source](https://supremecourt.gov.np/court/mugudc) |
| 61 | district-mustang | District Court Mustang | मुस्तांग जिल्ला अदालत | district | Gandaki / Mustang | [Official source](https://supremecourt.gov.np/court/mustangdc) |
| 62 | district-myagdi | District Court Myagdi | म्याग्दी जिल्ला अदालत | district | Gandaki / Myagdi | [Official source](https://supremecourt.gov.np/court/myagdidc) |
| 63 | district-nawalparasi | District Court Nawalparasi | नवलपरासी जिल्ला अदालत | district | Lumbini / Nawalparasi (Bardaghat Susta West) | [Official source](https://supremecourt.gov.np/court/nawalparasidc) |
| 64 | district-nuwakot | District Court Nuwakot | नुवाकोट जिल्ला अदालत | district | Bagmati / Nuwakot | [Official source](https://supremecourt.gov.np/court/nuwakotdc) |
| 65 | district-okhaldhunga | District Court Okhaldhunga | ओखलढुंगा जिल्ला अदालत | district | Koshi / Okhaldhunga | [Official source](https://supremecourt.gov.np/court/okhaldhungadc) |
| 66 | district-palpa | District Court Palpa | पाल्पा जिल्ला अदालत | district | Lumbini / Palpa | [Official source](https://supremecourt.gov.np/court/palpadc) |
| 67 | district-panchthar | District Court Panchthar | पाँचथर जिल्ला अदालत | district | Koshi / Panchthar | [Official source](https://supremecourt.gov.np/court/panchthardc) |
| 68 | district-parbat | District Court Parbat | पर्वत जिल्ला अदालत | district | Gandaki / Parbat | [Official source](https://supremecourt.gov.np/court/parbatdc) |
| 69 | district-pyuthan | District Court Pyuthan | प्युठान जिल्ला अदालत | district | Lumbini / Pyuthan | [Official source](https://supremecourt.gov.np/court/pyuthandc) |
| 70 | district-ramechap | District Court Ramechhap | रामेछाप जिल्ला अदालत | district | Bagmati / Ramechhap | [Official source](https://supremecourt.gov.np/court/ramechapdc) |
| 71 | district-rasuwa | District Court Rasuwa | रसुवा जिल्ला अदालत | district | Bagmati / Rasuwa | [Official source](https://supremecourt.gov.np/court/rasuwadc) |
| 72 | district-rautahat | District Court Rautahat | रौतहट जिल्ला अदालत | district | Madhesh / Rautahat | [Official source](https://supremecourt.gov.np/court/rautahatdc) |
| 73 | district-rolpa | District Court Rolpa | रोल्पा जिल्ला अदालत | district | Lumbini / Rolpa | [Official source](https://supremecourt.gov.np/court/rolpadc) |
| 74 | district-rukum | District Court Rukum | रुकुम जिल्ला अदालत | district | Karnali / Rukum (West) | [Official source](https://supremecourt.gov.np/court/rukumdc) |
| 75 | district-rupandehi | District Court Rupandehi | रूपन्देही जिल्ला अदालत | district | Lumbini / Rupandehi | [Official source](https://supremecourt.gov.np/court/rupandehidc) |
| 76 | district-salyan | District Court Salyan | सल्यान जिल्ला अदालत | district | Karnali / Salyan | [Official source](https://supremecourt.gov.np/court/salyandc) |
| 77 | district-sankhuwasabha | District Court Sankhuwasabha | संखुवासभा जिल्ला अदालत | district | Koshi / Sankhuwasabha | [Official source](https://supremecourt.gov.np/court/sankhuwasabhadc) |
| 78 | district-saptari | District Court Saptari | सप्तरी जिल्ला अदालत | district | Madhesh / Saptari | [Official source](https://supremecourt.gov.np/court/saptaridc) |
| 79 | district-sarlahi | District Court Sarlahi | सर्लाही जिल्ला अदालत | district | Madhesh / Sarlahi | [Official source](https://supremecourt.gov.np/court/sarlahidc) |
| 80 | district-sindhuli | District Court Sindhuli | सिन्धुली जिल्ला अदालत | district | Bagmati / Sindhuli | [Official source](https://supremecourt.gov.np/court/sindhulidc) |
| 81 | district-sindhupalchowk | District Court Sindhupalchowk | सिन्धुपाल्चोक जिल्ला अदालत | district | Bagmati / Sindhupalchowk | [Official source](https://supremecourt.gov.np/court/sindhupalchowkdc) |
| 82 | district-siraha | District Court Siraha | सिराहा जिल्ला अदालत | district | Madhesh / Siraha | [Official source](https://supremecourt.gov.np/court/sirahadc) |
| 83 | district-solukhumbu | District Court Solukhumbu | सोलुखुम्बु जिल्ला अदालत | district | Koshi / Solukhumbu | [Official source](https://supremecourt.gov.np/court/solukhumbudc) |
| 84 | district-sunsari | District Court Sunsari | सुनसरी जिल्ला अदालत | district | Koshi / Sunsari | [Official source](https://supremecourt.gov.np/court/sunsaridc) |
| 85 | district-surkhet | District Court Surkhet | सुर्खेत जिल्ला अदालत | district | Karnali / Surkhet | [Official source](https://supremecourt.gov.np/court/surkhetdc) |
| 86 | district-syangjya | District Court Syangja | स्याङ्जा जिल्ला अदालत | district | Gandaki / Syangja | [Official source](https://supremecourt.gov.np/court/syangjyadc) |
| 87 | district-tanahun | District Court Tanahun | तनहूँ जिल्ला अदालत | district | Gandaki / Tanahun | [Official source](https://supremecourt.gov.np/court/tanahundc) |
| 88 | district-taplejung | District Court Taplejung | ताप्लेजुङ जिल्ला अदालत | district | Koshi / Taplejung | [Official source](https://supremecourt.gov.np/court/taplejungdc) |
| 89 | district-therathum | District Court Terhathum | तेह्रथुम जिल्ला अदालत | district | Koshi / Terhathum | [Official source](https://supremecourt.gov.np/court/therathumdc) |
| 90 | district-udayapur | District Court Udayapur | उदयपुर जिल्ला अदालत | district | Koshi / Udayapur | [Official source](https://supremecourt.gov.np/court/udayapurdc) |
| 91 | district-gulmi | Gulmi District Court | गुल्मी जिल्ला अदालत | district | Lumbini / Gulmi | [Official source](https://supremecourt.gov.np/court/gulmidc) |
| 92 | district-kathmandu | Kathmandu District Court | काठमाडौं जिल्ला अदालत | district | Bagmati / Kathmandu | [Official source](https://supremecourt.gov.np/court/kathmandudc) |
| 93 | district-lalitpur | Lalitpur District Court | ललितपुर जिल्ला अदालत | district | Bagmati / Lalitpur | [Official source](https://supremecourt.gov.np/court/lalitpurdc) |
| 94 | district-nawalpur | Nawalpur District Court | नवलपुर जिल्ला अदालत | district | Gandaki / Nawalparasi (Bardaghat Susta East) | [Official source](https://supremecourt.gov.np/court/nawalpurdc) |
| 95 | district-parsa | Parsa District Court | पर्सा जिल्ला अदालत | district | Madhesh / Parsa | [Official source](https://supremecourt.gov.np/court/parsadc) |
| 96 | district-rukumkot | Rukumkot District Court | रुकुमकोट जिल्ला अदालत | district | Lumbini / Rukum (East) | [Official source](https://supremecourt.gov.np/court/rukumkotdc) |
| 97 | administrative-nepal | Administrative Court | प्रशासकीय अदालत | specialized | Bagmati / Kathmandu | [Official source](https://admincourt.gov.np/) |
| 98 | juvenile-bhaktapur | Bal Adalat, Bhaktapur (Juvenile Court) | बाल अदालत, भक्तपुर | specialized | Bagmati / Bhaktapur | [Official source](https://nijamati.pis.gov.np/pages/organization-structure-list-with-code-1102813616/) |
| 99 | consumer-nepal | Consumer Court | उपभोक्ता अदालत | specialized | Bagmati / Kathmandu | [Official source](https://supremecourt.gov.np/consumercourt/) |
| 100 | labour-nepal | Labour Court | श्रम अदालत | specialized | Bagmati / Bhaktapur | [Official source](https://labourcourt.gov.np/) |
| 101 | military-special-nepal | Military Special Court | सैनिक विशेष अदालत | specialized | Bagmati / Kathmandu | [Official source](https://www.jcs.gov.np/faq/) |
| 102 | special-nepal | Special Court | विशेष अदालत | specialized | Bagmati / Kathmandu | [Official source](https://supremecourt.gov.np/court/specialcourt) |
| 103 | debt-recovery-appeal-nepal | Debt Recovery Appellate Tribunal | ऋण असुली पुनरावेदन न्यायाधिकरण | tribunal | Bagmati / Kathmandu | [Official source](https://drat.gov.np/page/about_us) |
| 104 | debt-recovery-nepal | Debt Recovery Tribunal | ऋण असुली न्यायाधिकरण | tribunal | Bagmati / Kathmandu | [Official source](https://drt.drtribunal.gov.np/) |
| 105 | foreign-employment-nepal | Foreign Employment Tribunal | वैदेशिक रोजगार न्यायाधिकरण | tribunal | Bagmati / Kathmandu | [Official source](https://fet.gov.np/) |
| 106 | cooperative-loan-recovery-nepal | Loan Recovery Tribunal | कर्जा असुली न्यायाधिकरण | tribunal | Bagmati / Kathmandu | [Official source](https://lrt.gov.np/) |
| 107 | revenue-biratnagar | Revenue Tribunal Biratnagar | राजस्व न्यायाधिकरण विराटनगर | tribunal | Koshi / Morang | [Official source](https://revenuetribunal.gov.np/pages/view/about_us) |
| 108 | revenue-kathmandu | Revenue Tribunal Kathmandu | राजस्व न्यायाधिकरण काठमाडौं | tribunal | Bagmati / Lalitpur | [Official source](https://revenuetribunal.gov.np/pages/view/about_us) |
| 109 | revenue-nepalgunj | Revenue Tribunal Nepalgunj | राजस्व न्यायाधिकरण नेपालगञ्ज | tribunal | Lumbini / Banke | [Official source](https://revenuetribunal.gov.np/pages/view/about_us) |
| 110 | revenue-pokhara | Revenue Tribunal Pokhara | राजस्व न्यायाधिकरण पोखरा | tribunal | Gandaki / Kaski | [Official source](https://revenuetribunal.gov.np/pages/view/about_us) |
