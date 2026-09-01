# Phase 2 - Finish Exposed Features

**Scope:** Localhost implementation and verification only  
**Owner:** Full-stack, database, security, QA and product review  
**Status:** Complete - PASS_LOCAL  
**Rule:** An exposed control must perform its stated action or clearly explain that the action is unavailable.

## 1. Multi-document ZIP download

- [x] Replace the simulated "Download Zip" notification with a real file download.
- [x] Accept a bounded, deduplicated list of document UUIDs through a validated API contract.
- [x] Require an authenticated session and `documents.read` capability.
- [x] Apply the existing per-document access policy to every requested document.
- [x] Reject cross-firm, deleted, quarantined, scanning or rejected documents.
- [x] Enforce document-count and total-uncompressed-size limits before building the archive.
- [x] Read only protected tenant storage keys.
- [x] Sanitize archive entry names and make duplicate names deterministic.
- [x] Return a real `application/zip` response with safe download headers and no caching.
- [x] Show progress, success and actionable error feedback in the staff UI.
- [x] Preserve the selection after failure and clear it only after a successful download.
- [x] Add contract, authorization, storage-boundary and archive-content tests.

## 2. Immutable document version restoration

- [x] Return the complete persisted version lineage instead of inventing a previous version in the UI.
- [x] Include version, parent, lifecycle and upload fields in document DTOs.
- [x] Require authenticated document access when reading history.
- [x] Require `documents.upload` and access to both the active and selected versions when restoring.
- [x] Verify the selected version belongs to the same version lineage.
- [x] Restore by creating a new immutable version; never overwrite historical evidence.
- [x] Copy only a clean protected object into a new tenant-scoped protected key.
- [x] Preserve source content metadata while inheriting current governance controls.
- [x] Allocate the next version safely and reject missing, deleted or unavailable source content.
- [x] Record the restoration in the audit log with source and new-version identifiers.
- [x] Replace the simulated Restore control with confirmation, busy state, refreshed history and clear feedback.
- [x] Connect the existing individual Download buttons to the real authorized download flow.
- [x] Add lineage, permission, immutable-restore and UI contract tests.

## 3. Truthful guided chatbot

- [x] State clearly that the widget is an automated guided assistant, not a lawyer or live chat.
- [x] Remove online-presence indicators, "instant reply" claims and artificial human-like response delays.
- [x] Use the CMS firm name, address, hours, contact details and practice areas when configured.
- [x] Do not substitute invented office, personnel, schedule, fee or availability claims.
- [x] Route users to the real lawyers, practice areas, contact and consultation pages when details are unavailable.
- [x] Keep the legal-advice boundary explicit for complex or specific legal questions.
- [x] Describe callback submission accurately without promising an immediate or guaranteed response.
- [x] Validate callback contact input and expose submission failures to the visitor.
- [x] Prevent duplicate callback submissions while a request is in progress.
- [x] Add deterministic unit coverage for intent routing and truthful response rules.

## 4. Verification and review

- [x] Confirm no simulated workflow, fake online indicator or guaranteed-response wording remains in runtime UI.
- [x] Run formatting, ESLint and TypeScript checks.
- [x] Run focused contracts, document storage and chatbot unit tests.
- [x] Run the complete automated test command.
- [x] Run authenticated browser tests for ZIP download and version restoration.
- [x] Run the Next.js production build.
- [x] Verify local health and leave the localhost development server running.
- [x] Review the final diff for tenant leakage, path traversal, unsafe filenames and authorization gaps.

## Local verification evidence

- Focused Phase 2 unit tests: 22 passed.
- Complete automated test command: 179 passed (154 unit, 8 integration, 4 characterization, 13 database).
- Complete Playwright browser suite: 37 passed, including real ZIP contents, persisted version history, immutable restore and truthful assistant behavior.
- Next.js production build: passed; 145 static pages generated and all dynamic routes compiled.
- Local health endpoint: `GET /api/v1/health` returned `status: ok` on port 3001.
- Local associate permissions were corrected through the audited Settings API to include `documents.read`, `documents.upload` and `documents.share`, matching the exposed staff Documents workspace.
- No live deployment or live data changes were performed.

## Exit gate

PASS_LOCAL. All three exposed features perform real work; restoration is immutable and audited; assistant
claims come from CMS data or are explicitly qualified; and the complete local verification suite passes.
