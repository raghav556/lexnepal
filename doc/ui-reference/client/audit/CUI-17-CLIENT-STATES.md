# CUI-17 — Client states implementation

Baseline: `5196623d8c00a299f669c1b2492af4148275eb4b` (`origin/main`). This phase is limited to loading, empty, error, partial, and retry states. CUI-18 responsive/accessibility QA and CUI-19 visual regression remain separate and have not started.

## Proven defects and corrections

| ID     | Proven failure                                                                                                                                             | Correction                                                                                                                                                                                                             |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S17-01 | `useMyClient()` exposed `null` for both a successful null record and a failed request, so ten Client routes could call an API failure an unlinked profile. | Those routes now consume `useMyClientQuery()` and distinguish pending, error, successful null, and populated states. Errors offer query-level retry; a successful null retains the existing unlinked-profile state.    |
| S17-02 | A failed Home dependency left its data undefined and could hold the entire page on “Preparing your portal.”                                                | Home loading now follows query status. A settled dependency failure allows successfully loaded sections to render, with an unavailable/retry state in the failed section and no false zero KPI.                        |
| S17-03 | Matter Documents, Hearings, Checklist, Documents Library, and submitted KYC files could retain a skeleton or show empty/zero content after a failed query. | Each affected query has a settled error state and `refetch()` action. Successful empty responses retain the established empty presentation; Matter Details and KYC keep unrelated content usable.                      |
| S17-04 | Failed conversation-list and thread requests appeared as no matters/messages.                                                                              | The Client list distinguishes loading/error/empty; the shared chat panel shows Client-only thread error/retry while Staff/default appearance stays unchanged. Selection, unread, and deep-link behavior remain intact. |
| S17-05 | Failed slot requests appeared as “No available times.”                                                                                                     | The Client booking slot panel distinguishes error/retry from a successful empty slot response. The shared hook change is additive; Admin/public callers retain their existing presentation.                            |
| S17-06 | Failed Profile audit/session requests had no settled error state.                                                                                          | The existing shared Profile uses Client-variant-only unavailable/retry branches. Staff/Admin presentation and account actions remain unchanged. The server-side Client-safe audit projection is untouched.             |

## Query and presentation boundaries

Existing data-only hooks remain available. Additive status-bearing accessors were introduced for documents, tasks, KYC files, pending envelope actions, audit events, and sessions; Messages and appointment-slot hooks gained error/refetch state without changing their data shape. Existing cases, hearings, and current-Client query-state hooks are reused. All Retry controls call the original TanStack Query `refetch()`, and are disabled while that query is fetching. `ClientQueryError` is a small presentation-only wrapper around the existing dashboard EmptyState and button primitives.

No API DTO, backend, schema, auth, tenancy, audit projection, signing security, notification-link security, fixture source, or shared Client shell change is part of this phase. Staff chat and Staff/Admin Profile use the previous presentation branches.

## Proof and evidence

`tests/unit/cui-17-client-states-contract.test.ts` checks status-aware current-Client handling in all ten routes, additive hook compatibility, and Client-only shared-component error branches. `tests/e2e/cui-17-client-states.spec.ts` intercepts real Client API requests to compare 503 with HTTP 200 empty/null, exercises representative retries, and avoids persisting message-read changes. Frozen page regressions are run separately against the deterministic Ravi fixture. Browser evidence is stored in `D:\lexnepal\.local\qa\cui-17\implementation\` as numbered screenshots `01`–`08` for Client-record, Home partial, Documents, Messages list/thread, slots, and Profile audit/sessions failures.

Long content, high-volume notifications, completed/no-upcoming content, and populated frozen visuals are not redesigned by this state pass. The prior CUI-15 long/high-volume regression and relevant frozen page regressions remain the checks for those states. The separate CUI-18 and CUI-19 gates are still required.

## Validation notes

- The focused CUI-17 browser suite passed 3/3 against the local compiled build on port 3002. It distinguishes 503 from HTTP 200 null/empty and verifies retry recovery. The eight screenshots above were regenerated by this passing run.
- Focused unit and frozen contract coverage passed 88/88 across 13 files. Lint, typecheck, build, changed-file Prettier, and `git diff --check` passed.
- Relevant frozen browser regressions passed in isolated runs: Home; My Matters; Matter Details; Hearings; Checklist; Documents; Messages; Appointments; Identity Verification; Sign Documents; Notifications; and Client, Staff, and Admin Profile. Large combined browser runs initially encountered sign-in limits, a mismatched temporary public URL for signed downloads, and Next development-server memory exhaustion. Those were test-environment conditions; affected cases passed after deterministic reseeding and isolated reruns with the temporary server URL aligned.
- The pre-existing CUI-09 unit contract has one overly broad CSS regex assertion that fails on unchanged `src/index.css`. The same 1-of-5 failure was reproduced in the clean published-baseline worktree; no frozen CSS or contract was edited for this phase. The CUI-09 browser regression passed.
