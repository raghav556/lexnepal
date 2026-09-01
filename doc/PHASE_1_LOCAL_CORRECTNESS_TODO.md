# Phase 1 — Local Correctness

**Scope:** Localhost development only  
**Owner:** Full-stack implementation and QA  
**Status:** Complete — `PASS_LOCAL`  
**Rule:** No production deployment or live-provider configuration is included in this phase.

## 1. CI correctness

- [x] Remove every workflow command that does not exist in `package.json`.
- [x] Add a regression test that verifies every `npm run` command used by GitHub Actions exists.
- [x] Run the workflow-command regression test.

## 2. Local setup correctness

- [x] Explain that `npm run db:seed` creates the base firm and a non-login placeholder record.
- [x] Use `npm run e2e:seed` as the documented command for localhost demo login accounts.
- [x] Use `npm run auth:provision-local` only for invitation/setup flows for existing emailed users.
- [x] Correct quick-start, troubleshooting, auth-baseline, and local sign-off instructions.

## 3. Verified chatbot contact

- [x] Remove the invalid hard-coded email and masked telephone number.
- [x] Read telephone and email from public CMS settings.
- [x] Provide a truthful Contact-page fallback when neither setting exists.
- [x] Describe the widget as a guided digital assistant, not a live AI service.
- [x] Add unit coverage for configured and missing contact details.

## 4. Dynamic bank instructions

- [x] Add validated, tenant-scoped payment-method and bank fields to system settings.
- [x] Save and reload bank name, account name, account number, and optional branch in Admin Settings.
- [x] Reject enabling bank transfer in the UI when required bank fields are blank.
- [x] Remove the non-functional QR upload control.
- [x] Keep wallet credentials out of the browser form and clearly label wallet methods as sandbox-only.
- [x] Show only configured payment methods in the client portal.
- [x] Show a safe empty state when no payment method is configured.
- [x] Use saved bank details in client transfer instructions.
- [x] Use saved bank details in admin-generated and client-generated invoice PDFs.
- [x] Never fall back to a fake bank account.
- [x] Add contract and helper unit coverage.

## 5. Verification and review

- [x] Confirm no invalid contact or hard-coded bank account remains in runtime source.
- [x] Run formatting checks.
- [x] Run ESLint with zero warnings.
- [x] Run TypeScript checking.
- [x] Run the complete unit, integration, characterization, and database test command.
- [x] Run database schema and migration integrity checks.
- [x] Run the production build.
- [x] Verify health and readiness against the running localhost server.
- [x] Review the final diff for secrets, tenant leakage, duplicated settings, and unrelated edits.

## Completion evidence

- Authenticated settings round-trip: admin write, persisted read, client read, and original-value
  restoration passed against `http://localhost:3001`.
- Formatting, ESLint, TypeScript, migration checksum, and Drizzle schema checks passed.
- Automated tests passed: 139 unit, 8 integration, 4 characterization, and 13 database tests.
- Chromium E2E passed: 28/28.
- Next.js 16 production build passed and generated 144 static pages.
- Health, readiness, `/admin/settings`, and `/client/billing` returned HTTP 200.
- Production dependency threshold passed; four known moderate development-tool advisories remain
  deferred because the available forced fix is a breaking Drizzle downgrade.
- No production secrets or live-provider credentials were added.

## Exit gate

Phase 1 is complete only when all items above are checked, the working implementation has no fake
contact/bank fallback, and all automated gates pass. Production provider work remains separately
deferred.
