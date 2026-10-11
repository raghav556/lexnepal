# CUI-20 functional regression checkpoint

Baseline: `2e132585cab7ef2a1a96e93a01aaf46d8a0bb6bd` (CUI-19).
Branch: `cui-20-client-functional-regression`.
The locked v1.0 DOCX controls the Client scope. CUI-17/18 implementation and the
CUI-19 checkpoint are inherited. CUI-19 approved-reference acceptance remains
separately unverified; this phase does not approve those screenshots.

## Deterministic interaction coverage

Run `npm run test:functional:client`. The dedicated Playwright configuration has
one Chromium worker at 1440 × 900, a fixed clock, locale/timezone, empty browser
storage and no Next server or environment-file loading. Browser bootstrap HTML
is fulfilled at `https://client-functional.invalid/__fixture__`; all other
network requests are aborted. Test-only fetch/API adapters record synthetic
operations in memory and reject unconfigured transports. No database, real
session, object storage, worker or owner preview is used.

The harness renders the actual Client layout, views, dialogs, tabs and chat
engine. Queries, identity and commands are replaced only in the test bundle.
Real command-hook tests separately use TanStack Query with mocked API/auth
transports to assert request scope, payloads, rejection and invalidation.
No production mock provider, fixture arrays, dependencies or alternate workflow
engine are introduced.

| Route                   | Observable interactions covered                                                                                                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/client`               | KPI/matter/document/quick-action destinations; matter navigation while hearings remain pending                                                                                                                        |
| `/client/cases`         | Search, type/status filters, Cards/Table, pagination reset, matter and messaging destinations                                                                                                                         |
| `/client/cases/[id]`    | Section tabs, document download command, scoped messaging link; cached matter hidden after 401/403/404                                                                                                                |
| `/client/hearings`      | Upcoming/Past/All, matter/search filters, calendar export contents                                                                                                                                                    |
| `/client/checklist`     | Due/status/search filters, completion progress, read-only Client action boundary                                                                                                                                      |
| `/client/documents`     | Search, type/matter/source filters, pagination, preview/download, upload success/failure/retry, missing-matter and size prerequisites, duplicate-drop guard                                                           |
| `/client/messages`      | Authorized/pending/unlisted deep links, conversation changes, scoped send/read, draft retry, unread retry, attachment ordering/retry, denied composer and drop handling                                               |
| `/client/booking`       | Mode/date changes, slot reset, validation/busy state, pending confirmation, availability retry, booking failure                                                                                                       |
| `/client/kyc`           | Rejected-status resubmission, file type validation, upload wizard, consent, review, submit/busy/failure/retry, denied cached-file privacy                                                                             |
| `/client/signatures`    | Image review, viewed/OTP/consent gates, typed signature success/failure, completed document action, envelope decline success/failure; actual signer command requests                                                  |
| `/client/notifications` | Category filters, individual/all-read commands, failure retains unread status, safe navigation, independent Important Dates                                                                                           |
| `/client/profile`       | Account/contact edits, partial save failure, read-only email, password validation/success/failure/duplicate guard, sessions/other-device revocation, MFA enrollment, sign-out/profile export, denied activity privacy |

Shared chat tests retain Staff internal messaging and its existing default
presentation. Shared Profile tests exercise Staff/Admin General editing and
security controls independently of their real portal authentication.

## Reproduced corrections

| ID      | Root cause and narrow correction                                                                                                                                                                                                                                             |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C20-F01 | Chat event handlers allowed rejected send/upload promises to escape. Contain send failures while retaining the draft/attachments; show attachment failure feedback and allow retry. Shared success/send semantics stay intact.                                               |
| C20-F02 | Client chat did not pass query loading/access-denied state to the composer, and file drops ignored `disabled`. Disable Client composition for initial loading or 401/403/404; honor the existing disabled/busy file-input contract. Default Staff presentation is preserved. |
| C20-F03 | Document drop processing accepted another batch during an active upload. Guard the existing uploading phase and disable file selection during it.                                                                                                                            |
| C20-F04 | Client password submission had no in-flight guard. Add a Client-only request latch, disabled/busy button and pending text; leave Staff/Admin presentation and commands unchanged.                                                                                            |

All application changes are confined to four existing components. There are no
CSS, layout, backend authorization, tenant, query-key, read-command, storage,
signing, KYC or authentication-contract changes.

## Validation and acceptance limits

Executed commands, exit codes, operation attachments, diagnostic failures and
final results are retained in ignored `.local/qa/cui-20/implementation/` evidence.
Use the final report there for counts and the checkpoint commit; intermediate
failed probes are reproduction evidence, not passing checks.

Required real authenticated Client E2E acceptance remains **NOT VERIFIED** for
all 12 routes. In particular, real routing/API authorization, session revocation,
read-state persistence, malware scanning/promotion, booking persistence, KYC
review, PDF rendering, drawn/uploaded signing artifacts and actual OTP delivery
need independent disposable database/session/storage/job resources. Existing
stateful E2E tests must not be pointed at the owner preview or shared MySQL.

Mocked UI/command success is not authenticated E2E acceptance. Whole-project
TypeScript/build and CUI-19 reference approval remain separately tracked release
limitations. The three historical baseline-invalid assertions in
`cases-r7-client.test.ts` and `cui-09-client-checklist-contract.test.ts` are
unchanged; the selected passing suite is not a claim that all repository tests
pass. No CUI-21 work is included.
