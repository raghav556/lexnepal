# Session 10 — Premium Staff Research Vault

Worktree `.local/worktrees/ui-staff-admin-upgrade`, branch `ui/staff-admin-upgrade`, base HEAD `1c2268a274eaee795e8d1450bd75d9a146d95e10`. Technical Lead approved the GitHub checkpoint after screenshot review.

## Changed files

| File | Change |
| --- | --- |
| `src/views/staff/StaffResearchPage.tsx` | Presentation rewrite. Same research hooks and create, update, and delete commands. |
| `src/index.css` | Appended rules scoped to `.staff-research-*`. |
| `doc/ui-reference/staff-admin/SESSION-10-ENGINEERING-REPORT.md` | This report. |

No API, database, permission, navigation, or Client Portal files were changed. `SESSION-08-ENGINEERING-REPORT.md` still shows a line-ending difference and was not edited.

## What the page does

- Navy/gold Nepal hero and four counts from the loaded notes: research notes, linked matters, categories, and notes added in the last 30 days.
- Library with New Research Note, search, category filter, note title, category, NKP number when present, date, and linked-case marker.
- Read view on the same page: note text, tags, category, citation, linked case, Edit, and Delete.
- Write and edit on the same page, not in a dialog. Fields are title, category, linked case, NKP number, decision number, bench, tags, and a plain-text research content area. Actions are Save to Vault and Cancel.
- Unsaved edits ask for confirmation before New, Edit, Cancel, Back, switching notes, or leaving the page.
- Below 1024px the library and the reader/editor switch. Back returns to the library. Save and Cancel stay reachable above the mobile bottom nav.

## Preserved

Search still matches title, content, and NKP number. Categories, citation fields, one linked case, and the existing create/update/delete payloads are unchanged. Delete still asks for confirmation. Title and content remain required.

The reference image’s AI tools, autosave, draft publishing, rich-text controls, extra linked cases, and citation database are not in the product and were not added.

## Polish

- Read view: category badge, serif title, date, citation panel, linked-case chip, and tags. Empty citation, tags, and case stay hidden.
- KPI cards are shorter. The hero is unchanged. On a phone the library follows the compact metrics.
- Save and Cancel stay after the writing area instead of sticking over the fields. The editor heading is not under the top bar.

## Verification

| Check | Result |
| --- | --- |
| `eslint` on `StaffResearchPage.tsx` | Pass |
| `tsc --noEmit` | Pass |
| Mocked note QA | 19/19 passed |
| Overflow at 1440, 768, 390, 360 | None |

Dark KPI cards, after notifications and animations settle, use the dark panel `rgb(20, 29, 49)`. Contrast is 16.1 for the values, 6.6 for the labels, and 11.8–13.5 for the helpers. No style change was required. The earlier pale appearance was captured before dark mode had settled.

Save and Cancel are fully visible and clickable at 1440×900 and 390×844 after scrolling a long note to the bottom. They do not meet the fixed navigation. No layout change was required.

The failed read check expected mixed-case “Supreme Court”. The rendered badge is “SUPREME COURT”, with the citation, tag, and linked case present. The assertion now matches that text without regard to case. The rerun passed.

Approved checkpoint: dark KPI contrast verified; desktop and mobile Save and Cancel accessible; focused QA 19/19 passed; no real owner-data writes. Verified with in-memory notes only. No owner record was changed.

- Empty title/content does not create a note.
- Create sends `POST /api/v1/research` with the title and content.
- Edit prefills the title and NKP number, then `PATCH /api/v1/research/:id`.
- A failed save shows an error.
- Delete asks, then sends `DELETE /api/v1/research/:id`.
- Cancel and switching notes can keep or discard unsaved text.
- Search matches title, content, and NKP number. The category filter works.
- Mobile Save and Cancel sit above the bottom navigation.

## Screenshots (`.local/qa/session-10/final/`)

- `desktop-read-1440-light.png`
- `desktop-edit-1440-light.png`
- `mobile-library-390-light.png`
- `mobile-editor-390-light.png`
- `desktop-read-1440-dark.png`
- `desktop-kpis-1440-dark.png`
- `desktop-editor-actions-1440.png`
- `mobile-editor-actions-390.png`

Approved files only: `StaffResearchPage.tsx`, `src/index.css`, this report.
