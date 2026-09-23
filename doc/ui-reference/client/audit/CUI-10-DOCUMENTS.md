# CUI-10 — Client Documents

## Route

`/client/documents` → `src/views/client/ClientDocumentsPage.tsx`  
Wrapper: `src/app/(client)/client/documents/page.tsx`

## Baseline

- Starting SHA: `2f5f03667b0472a6c37d46b6099624b51655bf63`
- Branch / worktree: `cui-10-client-documents` at `D:\lexnepal\.local\worktrees\cui-10-client-documents`
- Owner Gate 2: PASS (CUI-05–CUI-09 frozen)

## Authority

| Layer              | Source                                                                        |
| ------------------ | ----------------------------------------------------------------------------- |
| Shell              | Home / published dark Client shell (`#0B2846` sidebar)                        |
| Body composition   | `doc/ui-reference/client/references/06-documents.jpg`                         |
| Reference SHA-256  | `E1E4C42E95296DE30187D6B6D358D32B5C67459EE321750AEBFA7705939ADE32` (verified) |
| Data / permissions | Repository APIs + existing document hooks                                     |

Reference 06 light sidebar and screenshot-only sections (Required Documents, fake category counts, status chips like “Submitted”) are **not** treated as product authority.

## Existing behavior preserved

| Concern               | Implementation                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------- |
| List                  | `useDocuments` → `GET /api/v1/documents`                                                  |
| Upload                | `useUploadDocument` → intent → SHA-256 → storage → complete → scan/promotion → invalidate |
| Download              | `useDownloadDocument` → `GET /api/v1/documents/:id/download`                              |
| Preview               | Same download URL; image / PDF / Open-file fallback                                       |
| Pagination            | `usePagination({ itemsPerPage: 8 })` with clamp when filters shrink the list              |
| Deep link             | `/client/documents?caseId=` initializes Matter filter                                     |
| Types (upload/filter) | pleading, evidence, contract, affidavit, correspondence, other                            |
| Source filter         | All / Legal Team / My Uploads via `uploadedBy` vs current user                            |

## Visual decisions

- Compact hero using `CASE_LIST_HERO_CLASS` + `.client-documents*` (aligned with Hearings/Checklist density)
- Upload card + library table (desktop ≥900px) / compact cards (mobile)
- Source tabs with `role="tablist"` + `aria-selected`
- Right rail: real summary counts only; Upload + Message CTAs
- No KPI metric strip; no fake Required / category inventory blocks
- Upload copy uses repository limit `MAX_DOCUMENT_BYTES` (50 MB) and truthful scan wording (no “Encrypted storage”)

## Permission / security decisions

- Client actions exposed: Preview, Download, Upload only
- No Delete / Trash / Share / Rename / Approve / Sign controls on this page
- Auth, tenancy, schema, upload-intent, and download-token logic unchanged
- Privileged / internal DTO fields not surfaced beyond existing client-safe display (title, type, mime, matter, relative date, source)

## CSS scope

- Page-local rules under `.dashboard-theme.dashboard-client.client-documents …` in `src/index.css`
- Staff/Admin primitives and frozen CUI-05–CUI-09 page sources not modified

## Responsive

Captured under `D:\lexnepal\.local\qa\cui-10\`:

- Desktop: 1400×876, 1280×800, 1024×768
- Narrow: 768, 390×844, 360×800

Documents remains bottom-nav active; filters/upload stack; cards replace table under 900px; no horizontal body overflow observed in e2e mobile check.

## Accessibility

- Labeled search, matter/type selects, upload file input, dropzone control
- Icon Preview/Download buttons have accessible names
- Source filter selected state via `aria-selected`
- Preview dialog title + Escape close (existing Dialog)
- Reduced-motion: dropzone transition disabled under `prefers-reduced-motion`
- Operational text ≥ 12px in scoped CSS

## Tests

| Suite                                                                          | Result               |
| ------------------------------------------------------------------------------ | -------------------- |
| `tests/unit/cui-10-client-documents-contract.test.ts`                          | PASS                 |
| `tests/e2e/cui-10-client-documents.spec.ts`                                    | PASS (3)             |
| `tests/unit/documents-contracts.test.ts` + `document-storage-pipeline.test.ts` | PASS (17)            |
| CUI-05–CUI-09 unit contracts                                                   | PASS                 |
| CUI-05–CUI-09 e2e                                                              | (recorded in QA log) |
| lint / typecheck / build                                                       | (recorded in QA log) |

## Changed files

- `src/views/client/ClientDocumentsPage.tsx`
- `src/index.css` (`.client-documents*` only)
- `tests/unit/cui-10-client-documents-contract.test.ts` (added)
- `tests/e2e/cui-10-client-documents.spec.ts` (added)
- `doc/ui-reference/client/audit/CUI-10-DOCUMENTS.md` (added)

## Known accepted deviations from Reference 06

1. Dark Home shell instead of Reference 06 light sidebar
2. No “Required Documents” / fake document-request rail (not backed by repository client document workflow)
3. Source tabs All / Legal Team / My Uploads instead of mock Status / Sort dropdowns
4. Real document types from repository (including fixture `court_filing` rows under All Types) rather than screenshot category inventory
5. Pagination retained at 8/page (not shown in Reference 06)

## Screenshots

- `D:\lexnepal\.local\qa\cui-10\reference\06-documents.jpg`
- `D:\lexnepal\.local\qa\cui-10\after\documents-1400x876.png`
- `D:\lexnepal\.local\qa\cui-10\after\documents-1280x800.png`
- `D:\lexnepal\.local\qa\cui-10\after\documents-1024x768.png`
- `D:\lexnepal\.local\qa\cui-10\responsive\documents-768.png`
- `D:\lexnepal\.local\qa\cui-10\responsive\documents-390x844.png`
- `D:\lexnepal\.local\qa\cui-10\responsive\documents-360x800.png`
- `D:\lexnepal\.local\qa\cui-10\compare\documents-overlay.png`
- `D:\lexnepal\.local\qa\cui-10\compare\documents-diff.png`

## Final status

Implementation complete for owner visual review.  
One local commit on `cui-10-client-documents` (ahead of `origin/main` by 1). Not pushed.

---

## OWNER VISUAL CORRECTION

Date: 2026-09-24  
Branch: `cui-10-client-documents`  
Previous local SHA: `7af7bd8f8f7d5714f3de0f6b84b8ee17bd74ae69`  
Amended into the same single local CUI-10 commit (not pushed).

### Why the initial visual gate was held

Functional/security gate passed, but owner visual review rejected composition:

1. **Upload dominance** — permanent full-width Upload Document form consumed most of the first viewport at 1024×768; Document Library started too low.
2. **Fragmented toolbar** — source tabs, Matter, Type, and search were visually disconnected.
3. **360px clipping** — Matter select and upload helper/dropzone content clipped on the right; prior “360 PASS / no overflow” was not accepted.
4. **Excess vertical space** — at 390×844 only the Document Library heading reached the first viewport; at 360×800 the library was not usefully visible before bottom nav.

### Changes made

- Primary header action is **Upload Document**; opens an accessible dialog/modal (Matter, Document Type, dropzone).
- Reuses existing `useUploadDocument` path only — no second upload engine.
- Permanent expanded upload form removed from page body.
- Compact coherent discovery toolbar immediately under the page header: Search → Matter → Type → source tabs (All / Legal Team / My Uploads).
- Document Library begins directly after the toolbar (documents-first workspace).
- Optional wide desktop right rail (≥1100px) using only real derived DOC_TYPES counts + Upload / Message actions; hidden at ≤1099px.
- Scoped CSS: `min-width: 0`, full-width mobile controls, ellipsis for long Matter names, wrap-safe dropzone hint, opaque upload dialog panel, mobile bottom content padding for fixed nav.
- Message Legal Team moved off competing primary header action into rail support card.

### Unsupported reference concepts intentionally omitted

- Required Documents
- Document Requests
- Screenshot-only categories (Court Filings inventory, Identity & KYC, Property Documents as category taxonomy)
- Fake Status / Sort / Request-status filters
- Light white Reference 06 sidebar (frozen dark Home shell retained)

### New screenshots (do not overwrite pre-correction set)

Under `D:\lexnepal\.local\qa\cui-10\owner-correction\`:

- `documents-1400x876.png`
- `documents-1280x800.png`
- `documents-1024x768.png`
- `documents-768.png`
- `documents-390x844.png`
- `documents-360x800.png`
- `upload-dialog-1400.png`
- `upload-dialog-390.png`
- `upload-dialog-360.png`
- `documents-overlay.png`
- `documents-diff.png`
- `overflow-measures.json`

### Responsive measurements (documentElement)

| Viewport   | clientWidth | scrollWidth | overflow |
| ---------- | ----------- | ----------- | -------- |
| 360×800    | 360         | 360         | NO       |
| 390×844    | 390         | 390         | NO       |
| upload@360 | 360         | 360         | NO       |
| upload@390 | 390         | 390         | NO       |

### Validation result (owner correction)

| Check                     | Result    |
| ------------------------- | --------- |
| format (changed files)    | PASS      |
| lint                      | PASS      |
| typecheck                 | PASS      |
| CUI-10 unit contract      | PASS (5)  |
| document unit regressions | PASS (22) |
| CUI-10 e2e                | PASS (4)  |
| CUI-05–CUI-09 e2e         | PASS (14) |
| build                     | PASS      |

Frozen CUI-05–CUI-09 page sources and Staff/Admin Documents unchanged. Auth / tenancy / schema / permission / upload-intent pipeline unchanged.

### Owner visual re-review

READY FOR OWNER VISUAL RE-REVIEW: YES  
READY TO PUBLISH: NO — OWNER RE-REVIEW REQUIRED  
READY FOR CUI-11: NO

---

## FINAL PRE-PUBLISH CHECK

Date: 2026-09-24  
Previous SHA: `3977b19329ceddb4cf54ce1e4241bbed19485c41`

### Dialog finding

**CAPTURE TIMING** — not a product defect.

Settled-state probe (wait ≥800 ms after dialog open) at 1400 / 390 / 360:

- Dialog background: `rgb(255, 255, 255)`, opacity `1`
- Overlay `z-index: 60` above bottom nav `z-index: 30`
- Toolbar center hit-tests to overlay/dialog (no bleed of page controls through dialog card)
- No horizontal overflow; dialog fits viewport
- Matter / Type / dropzone controls present without mutual content overlap

Previous owner-correction `upload-dialog-390.png` was captured before the open animation finished settling. QA capture now waits ≥750 ms after dialog visibility before screenshot/measure.

**Product code change for dialog: NO**

### Document type contract finding

Inspected `src/shared/contracts/documents.ts` `documentTypeSchema`.

`court_filing` is a real repository type.

CUI-10 previously counted/filtered categories only from the Client **upload** allowlist (`pleading|evidence|contract|affidavit|correspondence|other`), so `court_filing` documents were visible in the library but missing from category totals (5 vs 6) and Type filter options.

### Correction

- Added shared `documentTypeLabel` / `DOCUMENT_TYPE_LABELS` sourced from `documentTypeSchema`
- Display / filter / category counts derive from **loaded** `useDocuments` types (`presentDocTypes`)
- Client upload selector remains `CLIENT_UPLOAD_DOC_TYPES` (unchanged; does not add `court_filing|template|poa|notice|memo`)
- Fixture reconciliation: Court Filing 1 + Evidence 1 + Contract 2 + Correspondence 2 = 6

### Tests / screenshots

- Unit + E2E updated for type separation, Court Filing filter, settled dialog opacity, upload set not expanded
- Fresh evidence under `D:\lexnepal\.local\qa\cui-10\final-check\` (dialog shots after ≥750 ms settle)

| Check           | Result   |
| --------------- | -------- |
| format          | PASS     |
| lint            | PASS     |
| typecheck       | PASS     |
| CUI-10 unit     | PASS     |
| CUI-10 e2e      | PASS (4) |
| doc regressions | PASS     |
| build           | PASS     |
