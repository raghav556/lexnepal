# CUI-14 Sign Documents implementation audit

## Authority and baseline

- Starting published `origin/main`: `bd7c4ae804b0a8cca8518553e48d9f8a644bf0cf`.
- Source of Truth: `LexNepal_Client_UI_Upgrade_Source_of_Truth_v1.0.docx`, CUI-14 row.
- Reference 10: `references/10-sign-documents.jpg`; SHA-256 `6A970FFDF49F6798C4207EC2AEF35D8BDAF57E54650E5AAF18EB8F2AEE123A86` (verified).
- Frozen Client shell, CUI-05–13 pages, and published signing-security services/contracts remain authoritative. No backend, authorization, schema, migration, Staff/Admin, or frozen Client page source changed.

## Implementation and truthfulness

- The page presents one `Documents awaiting your signature` list from the signer-scoped signing inbox. The server's active envelope/direct separation remains authoritative; the view helper preserves action kind and suppresses only duplicate direct rows for an envelope-backed document. It retains distinct completed envelope signing events.
- An envelope or direct request opens the same review/sign dialog. Decline is offered only for an active envelope request. The dialog keeps the real preview/download, mark-viewed, account-email OTP, draw/type/upload, exact consent, and sign flows. Authorized same-origin PDF bytes are rendered locally with PDF.js; authorized image bytes continue through a temporary browser blob URL revoked on close/unmount. A failed download, PDF render, or mark-viewed call leaves signing disabled; no server-security route was changed.
- The Client submits no authoritative document SHA or protected artifact storage key. Signature images continue through the published secure artifact-intent/quarantine/validation/scan/promotion flow. File picker accepts only PNG/JPEG. No browser OTP or `demoCode` handling remains.
- `Recently signed` uses current-signer history only. The document action identifies the **original document**. The local PDF action is called **Signature event summary**, contains only available event fields, and makes no server-certification claim. It is browser-generated, not an authoritative certificate.
- Unsupported “verified certificate,” “signature vault,” and similar security-marketing wording was removed. The legally meaningful `esign-consent-v1` wording/version remains unchanged. It is pre-existing legal-policy copy pending separate legal review, not approved by this UI work.
- The right-hand guidance keeps Reference 10's preview, process steps, and support hierarchy while avoiding screenshot-only fake dates, signers, certificates, or controls. The desktop pending and history sections use compact Client design primitives; mobile stacks them in priority order. No fake React signing records were introduced.

## Deterministic fixture and preview

- Only the two existing signing documents (`CUI1-DOC-004` Client Engagement Letter and `CUI1-DOC-005` NDA Agreement) now receive deterministic, syntactically valid one-page PDF bytes. Their titles, numbers, Matter links, statuses, envelope identities, and total document count are unchanged. Every non-signing document continues through the original `fixtureBytes` path unchanged.
- Browser evidence is fetched from the real fixture, MySQL, existing API, and query hooks. The test parses the authorized PDF response using PDF.js and confirms one page with readable title text. The initial native PDF iframe appeared blank in headless screenshots; owner testing then proved the normal browser also showed a blocked-content page. That earlier screenshot-only classification was incorrect and is superseded by Owner visual correction 2 below.
- Signing opens/mark-viewed calls mutate fixture viewed state. The deterministic Client seed is rerun after browser tests and evidence capture so the final fixture returns to its published preview shape.

## Validation

- Changed-file Prettier formatting: pass.
- Lint and typecheck: pass.
- CUI-14 unit: 6/6 pass (signer-action composition, history deduplication, OTP response contract, neutral summary, protected consent, page contract).
- CUI-14 focused browser tests: 9/9 pass after Owner visual correction 2, including painted PDF canvas pixels, unchanged document security headers, no iframe/CSP frame error, one live signing-control set, corrupt-PDF failure, mark-viewed failure, dialog accessibility, and responsive overflow. Screenshot capture passes separately with `CUI14_CAPTURE=1`.
- Published signing Job A MySQL behavior suite: 9/9 pass, using the repository `.env.local` loader.
- Published Job B live signing verifier: pass (inbox, OTP secrecy/email delivery, typed/draw/upload, SHA, misuse denial, routing, decline, cleanup). Its local scanner reported the development fallback `unscanned`; an antivirus-clean verdict was **not** proven. A configured verified malware scanner remains a production deployment prerequisite.
- Published 0007 disposable migration verifier: pass, zero schema drift, disposable database removed. Migration integrity: pass.
- Frozen Client CUI-05–13 unit tests: 52/52 pass. Browser regressions: 25 pass in the combined run, one CUI-11 unread-count assertion failed after shared-state interaction; after deterministic reseed, isolated CUI-11 passed 3/3. CUI-10 browser tests passed 4/4 with the signing-only fixture byte change.
- Optimized Next.js production build: pass.
- Responsive browser checks cover 1440×900, 1280×800, 1024×768, 768, 390×844, and 360×800. Document `scrollWidth <= clientWidth` at 390 and 360, including the review dialog. Locked mobile navigation remains unchanged.
- Keyboard dialog focus/Escape restoration, visible focus, accessible canvas name/instructions, OTP/file/consent/decline labels, selected method state, status/error text, disabled signing prerequisites, touch-sized buttons, and shared reduced-motion treatment were reviewed.

## Evidence and accepted reference deviations

Screenshots: `D:\lexnepal\.local\qa\cui-14\01-desktop-pending.png`, `02-desktop-review-sign.png`, `03-desktop-recently-signed.png`, `04-mobile-pending.png`, `05-mobile-review-sign.png`, `06-mobile-review-sign-360.png`, `07-desktop-pdf-preview.png`.

### Owner visual correction 1 (unpublished)

- The Review & Sign surface was white, but the shared Dialog entrance faded the entire overlay subtree. During that transition the underlying page and mobile navigation showed through the dialog. The Client bottom navigation itself remained at `z-30`, below the Dialog overlay at `z-60`; no global navigation change was needed.
- A CUI-14-scoped overlay rule removes that fade, while the local dialog surface stays fully opaque from its first frame. The dialog now has a bounded viewport height, restrained responsive preview, internally scrolling signing details, and a visible modal action footer. All signing prerequisites and handlers are unchanged; the shared Dialog primitive and frozen Client pages are untouched.
- The focused browser check verifies the accessible dialog name, opaque surface and overlay, layering above the mounted mobile nav, viewport containment, 390/360 no-overflow behavior, internal scrolling, and reachable final action. Initial evidence: `02-desktop-review-sign.png` (1440x900), `05-mobile-review-sign.png` (390x844), and `06-mobile-review-sign-360.png` (360x800). The PDF claim from that review was later corrected as described below.

### Owner visual correction 2 (unpublished)

- Owner's normal Chrome session showed “This content is blocked” in the Review & Sign preview. Browser diagnostics confirmed the authorized storage response was HTTP 200, `application/pdf`, `Content-Disposition: attachment`, a valid `%PDF-1.4` document, with `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'; object-src 'none'; default-src 'self'`. The Client first fetched those bytes successfully and created a `blob:` URL, but the page CSP has no `frame-src`; Chrome therefore applied `default-src 'self'` and blocked the blob iframe. No redirect, authentication failure, token expiry, or MIME mismatch was observed.
- Live dialog DOM inspection found exactly one method heading, typed-signature input, consent checkbox, decline field, and preview region. Repetition in the owner's scrolling capture was a screenshot-stitching artifact, not a React duplicate-render defect. No duplicate-render change was made.
- The CUI-14-local correction renders the authorized PDF bytes into canvases with the installed PDF.js library, without an iframe or a public URL. It renders all pages and calls the existing mark-viewed mutation only after rendering succeeds; malformed PDF bytes leave viewed false and signing disabled. PDF tasks/canvases are cancelled/cleared on close or document change. The image blob URL cleanup remains intact. Global CSP, X-Frame-Options, document authorization, short-lived token, and signing security services are unchanged.
- A headed Google Chrome test signed in as Ravi Sharma, opened the real pending Client Engagement Letter, confirmed the authorized PDF response and nonwhite painted canvas pixels, and found no blocked-content/CSP frame error. `07-desktop-pdf-preview.png` visibly shows the actual one-page signing fixture in the dialog; `02-desktop-review-sign.png`, `05-mobile-review-sign.png`, and `06-mobile-review-sign-360.png` were refreshed from the same real fixture. CUI-14 unit: 6/6; CUI-14 browser: 9/9; CUI-10 Documents browser: 4/4; published signing-security integration: 9/9; live signing verifier: pass. The verifier still reports local scanner fallback `unscanned`, not an antivirus-clean verdict. The existing `esign-consent-v1` wording remains pre-existing legal-policy copy pending separate legal review.

Reference-only sample values and any implication of a verified/legal certificate are omitted. The real OTP/account-email, consent, artifact scan, and signer authorization steps remain in the dialog even where the visual reference is simpler. This follows the secured repository contract. The browser-generated event summary is retained with neutral terminology.

## Scope

Modified: `src/views/client/ClientSignaturesPage.tsx`, `src/client/queries/envelopes.ts`, `src/lib/pdf-generator.ts`, `scripts/e2e/seed-e2e-client-ui-preview.ts`.

Added: `src/views/client/signing-presentation.ts`, `tests/unit/cui-14-client-sign-documents.test.ts`, `tests/e2e/cui-14-client-sign-documents.spec.ts`, this audit.

Remaining independent backlog: pre-existing `drizzle/0004` fresh-chain compatibility, local historical migration-hash artifact, production malware-scanner readiness, and legal review of `esign-consent-v1`. None was changed for CUI-14.
