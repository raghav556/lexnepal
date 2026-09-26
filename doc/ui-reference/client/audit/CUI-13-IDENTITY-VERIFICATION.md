# CUI-13 — Client Identity Verification

## Baseline and authority

- Starting SHA and published baseline: `e16f826937d2949989d10e17840ac66a114c427a`.
- Route: `/client/kyc`; visible title and active desktop navigation: **Identity Verification**.
- Source of truth: Client master shell, Reference 09 body, real KYC contracts, then shared components.
- Reference checksum: `186DB03D13892ED6C703C425A47BC5B4FCED9E68AABFD5995D1D7257D1AFB19E` (verified).

## Real KYC architecture and security audit

- `useMyClient` resolves the authenticated Client; `useKycFiles` calls the existing own-Client file API.
- Upload remains: SHA-256 → Client-owned upload intent → quarantine upload → intent completion → malware scan/promotion → submission of promoted intent IDs.
- The server resolves the linked active Client by firm and authenticated user for create/submission.
- Intent completion is creator-user scoped; status is creator-user or `kyc.review` scoped.
- File listing verifies the requesting Client's linked Client ID; staff require `kyc.review`.
- KYC review retains the `kyc.review` capability requirement.
- Verified KYC rejects a new Client upload/submission. No server, tenancy, auth, or schema code changed.

## Contract preserved

- Client KYC statuses: `pending`, `submitted`, `verified`, `rejected`.
- Required submission categories: `government_id`, `proof_of_address`.
- Required details: address, ID number, `consentAccepted=true`.
- Picker and backend contract: PDF, JPEG, PNG; 25 MB maximum per upload intent.
- The deterministic Ravi Sharma fixture remains `submitted` with `Citizenship-Copy.pdf` and `Utility-Bill.pdf` supplied through MySQL, API, and query hooks.

## Presentation and truthfulness

- Replaced metric-dashboard composition with compact status, progress, requirement, submitted-document, and wizard sections.
- Pending offers start verification; submitted has no duplicate submit action; verified has no Client restart action; rejected presents the real rejection reason and supported resubmission action.
- The review step masks the displayed ID number; storage IDs, hashes, protected paths, and intent IDs are not shown.
- Removed unsupported non-consent claims including Nepal AML/Bar Council compliance, encrypted vault copies, restricted-compliance-staff access, fixed proof-age requirements, Nepal-only address, and guaranteed timing.
- The existing `kyc-consent-v1` Client consent statement is preserved unchanged by explicit owner direction. It remains pre-existing legal-policy copy pending separate legal review; this change neither approves nor interprets its AML wording.

## Responsive and accessibility

- Tested 1400×876, 1280×800, 1024×768, 768, 390×844, and 360×800.
- 390: `clientWidth=390`, `scrollWidth=390`; 360: `clientWidth=360`, `scrollWidth=360`.
- File input has an accessible name; labels are associated with address, ID number, and consent controls; wizard steps expose `aria-current`; status includes text; upload/submission updates use a live region; disabled states and focused native/shared controls remain available.
- Mobile keeps Identity Verification under More; no extra bottom-navigation item was added.

## Test and fixture handling

- Focused unit contract: `tests/unit/cui-13-client-identity-verification-contract.test.ts`.
- Focused E2E: `tests/e2e/cui-13-client-identity-verification.spec.ts`.
- Local controlled state captures set pending, rejected, and verified only in the local preview database. A final `npm run e2e:seed:client-ui` restored the submitted two-file deterministic fixture before owner captures.

## Focused semantic correction

- `submitted` now marks Documents, Details, and Submitted as complete; Firm review is the current stage because the persisted submission has already occurred.
- `rejected` now marks the first three stages complete and presents the reached Firm review stage as correction-required, alongside the real rejection reason and resubmission action.
- `verified` remains fully complete.
- The previous rejected/verified screenshots showed no file history because the temporary pending-state capture deleted the preview `clientKycFiles` rows, then later state captures changed only `kycStatus`. The production UI always queried files independently of KYC status; no production file-display defect existed.
- Corrected rejected and verified captures now set only the Client status after a submitted-fixture reseed, preserving `Citizenship-Copy.pdf` and `Utility-Bill.pdf`. A final reseed restored the submitted baseline.

## Screenshots

- `D:\lexnepal\.local\qa\cui-13\reference\09-identity-verification.jpg`
- `after/identity-1400x876.png`, `identity-1280x800.png`, `identity-1024x768.png`
- `responsive/identity-768.png`, `identity-390x844.png`, `identity-360x800.png`
- `states/identity-pending.png`, `identity-submitted.png`, `identity-rejected.png`, `identity-verified.png`
- `compare/identity-overlay.png`, `identity-diff.png`

## Reference deviations

- Reference-only third-document, Nepal-specific, freshness, security/compliance, and support claims are intentionally omitted because they are not in the real Client KYC contract.
- The frozen dark Client shell is retained.
