# Session 09 — Premium Staff Documents UI (Engineering Report)

Worktree `.local/worktrees/ui-staff-admin-upgrade`, branch `ui/staff-admin-upgrade`, base HEAD `ac680e76eb3882049683d2623a661fc6671b687b`. Not committed.

This report covers the accepted visual Documents UI plus the final functional completion: real in-browser preview, metadata collision fix, and restored Advanced Filters.

## Changed files

| File | Change |
| --- | --- |
| `src/views/staff/StaffDocumentsPage.tsx` | Presentation rewrite kept all data hooks and command handlers. Final pass wires `StaffDocumentViewer` into Open Previewer and renames the aside to **Recent documents**. |
| `src/index.css` | Scoped `.staff-docs-*` rules. Final pass defines named grid areas for card metadata and adds viewer chrome. Desktop 62rem table styling is unchanged. |
| `src/components/documents/AdvancedSearch.tsx` | Filters dialog now uses controlled `open` / `onOpenChange`. `DialogTrigger` was removed. Shared `Dialog` was not modified. |
| `src/components/documents/StaffDocumentViewer.tsx` | New staff-only viewer. Fetches authorized same-origin bytes and renders PDF, DOCX, JPEG/PNG and TXT locally. |
| `src/components/documents/staff-document-preview.ts` | Preview kind classification, same-origin URL check, safe error copy, and Word HTML allowlist sanitizer. |
| `tests/unit/staff-document-preview.test.ts` | Focused classification, sanitizer, same-origin and Filters-contract tests. |
| `doc/ui-reference/staff-admin/SESSION-09-ENGINEERING-REPORT.md` | This report. |

`git status` also lists `doc/ui-reference/staff-admin/SESSION-08-ENGINEERING-REPORT.md`. That file has no content diff once CRLF/LF is ignored. It was not staged or reset.

No backend, storage, authorization, schema or Client Portal files were touched.

## Supported document formats

| Kind | Source | Rendering |
| --- | --- | --- |
| PDF | `pdfjs-dist` legacy build, local worker | Real pages on canvas, vertical scroll, page prev/next, zoom 50–250% |
| DOCX | `mammoth.convertToHtml` | Sanitized headings, paragraphs and tables |
| JPEG / JPG / PNG | Object URL from fetched bytes | Fit-to-width image, zoom |
| TXT | `TextDecoder` | Plain text in a `<pre>` |
| Legacy DOC | Not converted | Honest fallback + Download |
| Other allowed types (XLSX, PPTX, TIFF, …) | Not rendered | Honest fallback + Download |

Unclean, quarantined, rejected or unauthorized files are not previewed. The existing download service already refuses those before a URL is minted.

## Rendering architecture and security

1. Open Previewer calls the existing `useDownloadDocument()` helper, which hits `/api/v1/documents/:id/download`.
2. That route still uses `DocumentDownloadService.createAuthorizedDownload` (document, case and firm checks; `uploadStatus === "clean"` only).
3. The viewer fetches the signed same-origin storage URL with `credentials: "same-origin"` and `cache: "no-store"`. Cross-origin URLs are rejected so bytes never go to Google, Microsoft, a CDN worker or any other third-party viewer.
4. Bytes are rendered in memory. Object URLs and pdf.js tasks are released on close, document change and unmount. Nothing is written to `localStorage`, logs or QA artifacts.
5. The storage response `content-disposition: attachment` is not embedded in an iframe. Bytes are read, then rendered locally.
6. DOCX HTML is passed through an allowlist sanitizer before `html-react-parser`. Scripts, event handlers, `href`/`src`, inline styles and unknown tags are stripped. Mammoth is never used for `.doc`.
7. Preview is read-only. It does not change versions, records or scan state.
8. 403 / 404 / empty / failed renders show a safe message and Download. Expired tokens surface as 403.

`useRecentDocuments(5)` is `DocumentRepository.listRecent` (latest firm documents), not viewing history. The aside title is therefore **Recent documents**.

## Responsive metadata fix

Card cells used `grid-area: type|case|date|size` without `grid-template-areas`, so the four fields stacked on top of each other when the library container was narrower than 36rem. That is the 390px card layout and the narrow 768px tablet content column (staff sidebar still visible).

The card grid is now:

```
"type case"
"date size"
```

Values wrap. Dual AD/BS dates stay inside the Modified cell. Desktop `min-width: 62rem` table layout is unchanged.

## Advanced Filters

`src/components/ui/dialog.tsx` ignores `DialogTrigger`. `AdvancedSearch` now owns `isOpen` and opens the existing Case, Document Type and Tag fields from the Filters button. Apply, Clear, Escape and initial focus use the existing Dialog behaviour.

## Verification

| Check | Result |
| --- | --- |
| `eslint` on the Session 09 files (`--max-warnings=0`) | Pass |
| `tsc --noEmit` | Pass |
| `prettier` on the changed TS/TSX files | Pass |
| `vitest` `staff-document-preview.test.ts` | Pass (classification, sanitizer, same-origin, Filters contract) |
| `vitest` `documents-contracts.test.ts` | Pass |
| `vitest` `document-storage-pipeline.test.ts` | Pass (including denied/quarantined download) |
| `vitest` `phase2-exposed-features.test.ts` | Pass |
| Authenticated live UI at `http://localhost:3001/staff/documents` (1440, 768, 390, 360; light and dark) | **25/25 checks passed** |

Live checks used the demo staff account, safe in-memory fixtures, and mocked authorized download bytes. No owner file was uploaded, edited or deleted. Every non-GET `/api/` call except `/api/auth` was blocked. Fixture bytes and signed URLs were not written to disk, `localStorage` or the report.

**Live checks covered:**

- Real multipage PDF (2 canvases, zoom to 125%, page navigation)
- Real DOCX heading, paragraph and table
- Real JPEG and PNG fixture images
- Real TXT
- Unsupported XLSX fallback with Download
- 403 / unauthorized download message
- Reopen and switch from PDF to DOCX
- Filters button, Case/Type/Tag dialog, Apply, Escape
- No metadata cell overlap at 1440, 768, 390 and 360
- No horizontal overflow at those widths
- Mobile preview clears the bottom nav (dialog bottom 748, nav top 772 at 390×844)
- Recent documents label
- Opaque preview surfaces
- Zero mutating API calls reached the server

## Screenshots (`.local/qa/session-09/final-viewer/`)

- `desktop-pdf-1440-light.png` — real page 2 at 125% zoom
- `mobile-pdf-390-light.png` — real pages 1 and 2, above the bottom nav
- `desktop-docx-1440-light.png` — heading, paragraph and table
- `desktop-jpeg-1440-light.png` — fixture JPEG
- `desktop-png-1440-light.png` — fixture PNG
- `desktop-txt-1440-light.png` — fixture text
- `mobile-library-cards-390-light.png` — corrected 2×2 metadata cards
- `tablet-library-768-light.png` — corrected tablet cards
- `desktop-filters-1440-light.png` — working Advanced Filters
- `desktop-viewer-1440-dark.png` — dark-mode PDF page 1
- `desktop-unsupported-1440-light.png` — XLSX fallback
- `desktop-error-403-1440-light.png` — expired / unauthorized download
- `qa-results.json` — 25/25 pass log

Earlier visual-acceptance shots remain under `.local/qa/session-09/after/`.

## Legacy DOC decision

**Not implemented. No backend conversion was added.**

`.doc` (`application/msword`, OLE Compound File `D0 CF 11 E0…`) is a different format from `.docx`. Mammoth only reads OOXML. `src/utils/textExtractor.ts` currently feeds `application/msword` into `mammoth.extractRawText`; that path was not reused and is not safe for preview. TIFF and Office XML spreadsheets/slides also have no local renderer.

### Minimal proposal (separate approval)

If staff need in-browser preview of legacy `.doc`:

1. After a file is scanned clean, a **firm-local** conversion worker (for example LibreOffice in the existing scan worker host) writes a `.docx` or PDF *preview derivative* under `protected/{firmId}/…`.
2. Preview reads that derivative through the existing authorized download path. Download continues to return the original `.doc`.
3. Conversion stays on this deployment. No Google/Microsoft/Cloud Convert API.
4. Scope is a new worker + one stored derivative key. No Client Portal change.

Until that is approved, Open Previewer shows the Download fallback for `.doc`.

## Remaining limitations

- Hero title remains the i18n string "Vault & Documents".
- Retention and legal-hold prompts still use `prompt` / `confirm`.
- Recent documents still appear only at 1280px and up.
- Word preview is structural (headings, paragraphs, tables). Embedded images, revision marks and complex styles are stripped by the sanitizer.
- TIFF, XLSX and PPTX stay on the Download fallback.
- 360px was checked for overflow, metadata collision and Filters; no separate 360 screenshot was kept.

## Technical Lead verification (dialog opacity, real storage, DOCX label)

No dialog CSS change. The translucent JPEG, PNG, Filters, unsupported and error screenshots were captured while `fade-in-50` / `fade-in-30` were still running (measured dialog opacity about 0.55–0.67). After those animations finished, dialog and overlay opacity were both `1`, and the panel background was opaque. Underlying document rows were no longer visible through the dialog.

Settled captures, under `.local/qa/session-09/final-viewer/settled/`:

- `settled-jpeg-1440-light.png`
- `settled-png-1440-light.png`
- `settled-filters-1440-light.png`
- `settled-unsupported-1440-light.png`
- `settled-error-1440-light.png`

Real authorized storage, with GET responses left unmocked: an existing clean dashboard PNG was opened through the normal download URL, then its same-origin storage bytes. The image rendered. Download issued a second authorized GET and also returned 200. No mutating API request was sent. The preview image was not kept, because the stored file itself is a cases-dashboard capture. No signed URL, token or file bytes are recorded here.

The viewer subtitle was labeling `.docx` as DOC via `fileKind()`. It now uses `previewKindLabel(classifyDocumentPreview(...))`. Live check: `.docx` shows **DOCX · Version 1**; legacy `.doc` still shows **DOC · Version 1**. No `.doc` conversion was added. Library chips are unchanged.

| Check | Result |
| --- | --- |
| `eslint` on `StaffDocumentsPage.tsx` and `staff-document-preview.test.ts` | Pass |
| `tsc --noEmit` | Pass |
| `vitest` `staff-document-preview.test.ts` | 8 passed |
| Live DOCX / DOC labels | DOCX and DOC respectively |
| Settled dialog opacity | 1, opaque, no CSS change |
| Real storage preview | Passed (clean PNG, same-origin 200, download 200, zero mutations) |

**Do not commit, push, merge, deploy or begin Session 10 until Technical Lead review.**
