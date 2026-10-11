# CUI-21 Client presentation cleanup

Baseline: `12b5eb7d3653c2cf2ea7030f3ef1e32851940c36` (CUI-20).
Branch: `cui-21-client-cleanup`.
The locked v1.0 DOCX remains authoritative. This checkpoint changes no active
Client composition, workflow, authorization, styling or shared portal behavior.

## Removed presentation residue

`src/views/shared/profile/ClientProfileExtras.tsx` was the abandoned Client
Profile add-on containing Identity (KYC), My Cases and Support cards. A complete
tracked-repository text search found its name only in its own declaration.
The static import/re-export/dynamic-literal graph across 888 script files found
no consumer. Views are not automatic App Router entry points.

The `/client/profile` route already renders `SharedProfilePage` with the Client
variant. Its active overview is `ClientProfileOverview`, which retains identity
and matter information, permitted profile editing and navigation. The common
Client shell retains support. Shared security, sessions, activity and account
controls remain unchanged. No call site, query or supported action was removed.

The original component and its blob/hash/reference proof are retained in ignored
`.local/qa/cui-21/cleanup/` evidence. The existing CUI-17 through CUI-20 regression
tests, fixtures, reference images and required documentation are preserved.

## Retained code

- The public CUI-04 primitive vocabulary remains contract-backed shared code.
  A missing direct page consumer alone does not authorize deleting its public
  exports or invalidating the preserved primitive contract tests.
- `src/client/navigation/index.ts` documents the typechecker/default entry;
  the configured Next navigation alias and its implementation remain intact.
- `src/lib/convex-client-stub.ts` has no active Client import, but is recorded by
  the Convex migration/archive tooling. It is outside this Client presentation
  cleanup. No mock provider or alternate data layer was introduced.
- Staff/Admin dashboard primitives, profile extras and search entries remain
  necessary shared or other-portal code. None is deleted for looking old.
- All Client-specific stylesheet class names have source consumers. No proven
  obsolete Client selector or duplicate active page implementation was found.

## Excluded modules

The Client route tree still contains exactly the 12 locked page types.
Billing, Payments, Payroll, Finance, Expenses and Conflict Checker have no Client
route, navigation item or Client search-page/action entry. Their Staff/Admin or
backend contracts are deliberately retained. Shared search returns the Client
page/matter/action collection before constructing Admin entries.

## Verification and freeze boundary

Relevant retained Client/shared tests and synthetic Profile browser interactions
are used to verify the cleanup. The browser harness denies external requests
and uses in-memory operations; it does not exercise authenticated API E2E.
Exact commands, results, preservation checks and the checkpoint SHA are recorded
in ignored `.local/qa/cui-21/cleanup/REPORT.md` evidence.

CUI-22 is not started. Final acceptance still requires sufficient evidence for
every visual, functional, responsive, state and accessibility row; safely
isolated authenticated Client E2E; outstanding whole-project checks; and
Technical Owner Gate 4 approval. CUI-19 reference acceptance and other prior
release limitations are not upgraded to PASS by this cleanup.
