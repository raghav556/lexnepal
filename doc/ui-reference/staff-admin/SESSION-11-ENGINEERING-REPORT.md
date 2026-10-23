# Session 11 — Premium Staff Content Studio

Worktree `.local/worktrees/ui-staff-admin-upgrade`, branch `ui/staff-admin-upgrade`, base HEAD `3333bce8b51e07f850b44c96063964b0e8eaead9`. Not committed.

## Changed files

| File | Change |
| --- | --- |
| `src/views/staff/StaffContentPage.tsx` | Content library. Real article and news counts, tabs, search, filters, and shared pagination. |
| `src/views/staff/StaffContentWritePage.tsx` | Separate writing canvas for blog and news. |
| `src/views/staff/staff-content-model.ts` | Existing payload, status, and slug helpers shared by both pages. |
| `src/app/(staff)/staff/content/write/page.tsx` | Route for `/staff/content/write`. |
| `src/views/staff/staff-content-markdown.ts` | Markdown load/save for the supported formatting subset, with source mode when a round-trip would drop content. |
| `src/views/staff/StaffContentMarkdownEditor.tsx` | Installed TipTap toolbar and a real React Markdown preview. |
| `src/server/policies/cms-asset-access.ts` | Staff may upload only `blog_cover` and `news_image`. |
| `src/server/services/cms-asset-service.ts` | Enforces that rule when an upload is created, completed, and polled. |
| `src/index.css` | Scoped `.staff-content-*` layout only. |
| `doc/ui-reference/staff-admin/SESSION-11-ENGINEERING-REPORT.md` | This report. |
| `tests/unit/staff-content-markdown.test.ts` | Round-trip and source-mode checks. |
| `tests/unit/cms-asset-access.test.ts` | Staff, admin, and cross-user upload checks. |

`SESSION-08-ENGINEERING-REPORT.md` still shows a line-ending difference and was not edited. Admin Console and Client Portal UI were not changed.

## Reused

`PortalPageShell`, `MetricCard`, `StatusBadge`, `EmptyState`, `DashboardButton`, `DualDateDisplay`, shared `Button`, `Input`, `Textarea`, `Tabs`, `Select`, `Pagination`, `usePagination`, and `CmsImageUploadField`. Blog and news commands stay `POST`/`PATCH` with `status: "draft"`, then `POST .../submit`. Staff still cannot publish.

## What the pages do

- Library hero and four counts from the loaded articles and news: total, drafts, pending review, and published.
- Blog and news tabs, search, category or type filter, and status filter. Statuses are Draft, Pending Review, Published, and Rejected. Rejection notes stay visible.
- New Blog Article and New News sit in the library. Edit and View open `/staff/content/write?type=blog|news&id=...`. Submit remains available for drafts and rejected items.
- The writer is a separate page. Refresh loads the record from the existing staff list. Save Draft and Submit for Review use the current payloads. Pending and published items are read only.
- Unsaved edits ask for confirmation before Back, Cancel, or another in-app link, and the browser warns before unload.

The writer toolbar uses the installed TipTap editor for headings, bold, italic, lists, quotes, safe http(s) links, and undo/redo. It saves Markdown, not HTML. Code fences, tables, HTML, and headings deeper than level 3 stay in a Markdown source box so they are not rewritten. The preview renders that same Markdown with React Markdown. Tags, WebP, autosave, and publishing were not added. Excerpt and SEO limits follow the current schemas.

Firm News uses the same SEO title and SEO description fields as Blog. Both are optional. Title is limited to 300 characters and description to 1,000. They are included in the news draft POST and PATCH, loaded again from the staff news list on edit, view, and refresh, and stay read only when the item is pending or published. Admin, API, database, and CMS schemas were not changed.

## Verification

| Check | Result |
| --- | --- |
| `eslint` on the Content Studio and upload files | Pass |
| `tsc --noEmit` | Pass |
| Markdown round-trip and CMS upload authorization unit tests | 17/17 passed |
| Browser screenshots for the rich editor | Not recaptured; the dev server CSS loader and renderer crashed during this pass |

Blog create sent `POST /api/v1/staff/content/blog-posts` with `status: "draft"`. Submit sent a separate `POST .../submit`. No owner record was changed.

## Final polish

Create, edit, and view subtitles now match the mode for both blog and news. Save Draft and Submit appear once, with Cancel, at the bottom of the writer. At 1440×900 and 390×844 those buttons are fully inside the canvas, clickable, and above the fixed mobile navigation. No layout change was required. The dark writer topbar stays at full opacity; its translucent background is the existing bar, not a dimming overlay.

Blog and news searches, filters, and pages stay separate. Refresh keeps a saved record. Pending and published items stay read only, with no Staff publish action. Empty required fields use the browser’s required-field message. Writes stayed on mocked draft and submit requests.

Final screenshots from the earlier polish pass: `.local/qa/session-11/final/`. The approved rich-editor captures were intended for `.local/qa/session-11/final-approved/` and were not produced in this pass.

## Save timeout (HTTP 408)

The application never returns status 408. `ApiClientError: Request failed with status 408` is the client fallback for a non-JSON response. Next.js development proxies API requests with a 30 second `proxyTimeout` and aborts the upstream request when that expires. Creating a blog is `POST /api/v1/staff/content/blog-posts`; editing is `PATCH` on that route or the news route. No retained log shows this request’s duration, content type, or request ID, so it is not known whether the handler ran or the database insert finished. A health read timed out, and about 1.6 GB of 7.9 GB RAM was free, which matches the earlier development-server compile stalls. The timeout was not raised. Save no longer prints the raw error or says the draft failed when the result is unknown. The text stays on the page, the buttons unlock after the attempt, and the message tells the user to check the library before creating the draft again. There is no automatic POST retry.

## False required-field error

Save Draft read React form state. The words visible in the editor can still be only in the editor when Save is clicked, so `content` was an empty string and the toast said title, excerpt, and content were all required. Save now reads the editor’s current Markdown first. A real gap names the empty field, for example “Content is required.” Entered text stays on the page. Blog and News share this save path. `tsc --noEmit` passed. Markdown and upload unit tests passed, 19/19, including a TipTap-shaped document that saves as `Hello **bold** world` and field-specific required checks.

## Approved design and upload rule

The library is one bordered panel: tabs, new button, filters, table, and centered pagination. Staff with `cms.content_submit` may upload only `blog_cover` and `news_image`, and only an intent they created. `cms.manage` still covers every purpose and any intent in the firm. Other purposes and users without either capability are denied. Cross-firm lookups stay not found. No publish right was added.

## News SEO fields

Firm News now shows the same SEO title and SEO description controls as Blog. Empty values stay off the payload. A trimmed value is sent with the draft POST and PATCH. Refresh and edit load `seoTitle` and `seoDescription` from the staff news list. Pending and published news keep both fields visible and disabled. `eslint` on the writer, model, and markdown test passed. `tsc --noEmit` passed. The markdown unit file passed 16/16, including news SEO save and reload. Intercepted browser writes confirmed create, reload, edit, and a second reload. Published news showed both values read only at 1440 and 390, in light and dark. Screenshots: `.local/qa/session-11/news-seo/`. No real news POST or PATCH was sent for this check.

## Screenshots (`.local/qa/session-11/after/`)

- `desktop-library-1440-light.png`
- `desktop-blog-write-1440-light.png`
- `desktop-news-write-1440-light.png`
- `mobile-library-390-light.png`
- `mobile-write-390-light.png`
- `desktop-library-1440-dark.png`
- `desktop-blog-write-1440-dark.png`

## Rich-text presentation

Measured styles before the change: editor H1 and paragraph were both 16.8px at weight 400, lists used `list-style: none` with no indent, and the preview node was inside `.staff-content-editor`. Tailwind’s reset was winning because the staff rules set only the heading font family. Scoped `.staff-content-*` rules now set heading sizes and weight, disc and decimal markers, quote rules, and underlined links in the editor and the preview. The preview is a separate card under the editor. Toolbar behavior and Markdown serialization are unchanged. Public pages and global type styles were not changed.

After the change, light and dark H1 computed at 28px and weight 700 against a 16.8px paragraph, and lists computed as `disc`. A mocked blog save returned `# Opening heading`, a bullet, a quote, and the https link. A mocked news save returned `# News heading` and `- News item`. A published article stayed read only. A mocked 408 left the typed sentence in the editor and did not send a second create. `eslint` on the editor passed. `tsc --noEmit` passed. Markdown and upload unit tests passed, 21/21.

Screenshots: `.local/qa/session-11/final-review/editor-preview-desktop.png` and `editor-preview-mobile.png`.

## Real create 500s

The original database error for both failed creates is not available. The API handler records a non-application error only as “Unexpected server error.” The MySQL error log has no matching line, and statement history is not enabled, so the driver code was not retained. No backend change was made. A real Save Draft was not sent again.

Request `97580b25-2d23-48b7-a560-9cccbae3ca30` inserted one blog row and one `cms.blog_post_created` audit row, then returned 201. Submit `4607addd-9479-40c8-8b98-ea1819263d62` updated that same row to pending review and returned 200.

Requests `de575faf-d41a-4ecd-9287-afb1648a261e` and `ec81b4fb-be0a-46b2-85f1-742566c176e6` were both `POST /api/v1/staff/content/blog-posts`. Each returned 500 in under 100ms. Neither request id is in `audit_log`, and no second blog row exists. The insert and its audit share one transaction, so a failed insert leaves neither record. Other queries kept succeeding, so this was not a database outage or a crashed process. Zod failures return 400, and these responses were 500.

Live `blog_posts` constraints, read only: primary key `id`; unique `(firm_id, slug)`; unique `(firm_id, id)`; unique `legacy_convex_id`; the only foreign key is `firm_id` to `firms`. `author_user_id` and `submitted_by` are not foreign keys. `sql_mode` includes `STRICT_TRANS_TABLES`. Staff create does not send `legacy_convex_id`. The same firm had just accepted an insert, so a firm foreign-key failure on the next create is not supported. A duplicate slug, or a value longer than a `varchar(255)` column, would both roll back with a generic 500. The API allows a title and SEO title of 300 characters and a cover URL of 2,000 characters, while those columns are 255 characters. The saved row’s lengths fit. The failed request bodies were not logged, so neither a duplicate slug nor an over-length value is established.

This investigation changed only this report. `eslint` on the writer, model, CMS service, and API handler passed. `tsc --noEmit` passed. Markdown and upload unit tests passed, 21/21. Mocked blog and news creates from the prior pass stayed drafts, and a mocked non-success response left the editor text in place. `SESSION-08-ENGINEERING-REPORT.md` is still an unstaged line-ending difference and was not edited.

Checkpoint: the two historical Blog POST 500s remain unresolved, and this checkpoint does not claim they are fixed. The original database error is unknown. The CMS contract allows a title and SEO title of 300 characters and a cover URL of 2,000 characters, while those database columns are `varchar(255)`. That length mismatch is confirmed and is not fixed here. Image-upload authorization was verified with unit tests and mocked requests. A repeat live Save Draft was not verified.

**Do not commit, push, merge, deploy, or start Session 12.**
