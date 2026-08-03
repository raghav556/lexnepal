# Known Defects and Behaviors Not to Reproduce

**Status:** Initial Phase 1 triage list  
**Last updated:** 2026-08-02

This list separates current behavior that needs parity from defects, simulations and unsafe shortcuts that must not become target requirements. A domain owner must confirm severity and disposition before its design exits.

## Confirmed from source inspection

| ID | Current defect / unsafe behavior | Evidence | Target disposition | Owner | Status |
|---|---|---|---|---|---|
| KD-001 | Frontend code calls a `briefs` API module that does not exist in the Convex backend. | `StaffCaseDetailPage.tsx`; generated frontend inventory | Keep classified as `currently_simulated` until product decides to implement or remove it. Do not create an undocumented compatibility stub. | Product/API owner | Open |
| KD-002 | The offline mock can return `undefined` for unimplemented queries and no-op behavior for unsupported mutations, so a successful mock UI is not proof of backend parity. | Default fallthroughs in `src/lib/convex-mock.tsx` | Contract-test the real target API; record intentional simulations separately. | QA owner | Open |
| KD-003 | Many API references and responses are cast through `any`, hiding missing exports and contract mismatches at compile time. | `Unsafe cast` column in `frontend-consumers.csv` | Replace with generated/validated typed contracts; do not port unsafe casts as the API abstraction. | API owner | Open |
| KD-004 | Most Convex handlers have no declared response validator, leaving response contracts implicit. | `Response contract` column in `endpoint-parity.csv` | Capture observed behavior and add explicit Zod response contracts in the target. | API/QA owners | Open |
| KD-005 | Numerous tables do not carry a direct `firmId`; their tenant ownership is implicit, global or inherited through relationships. | `firmId field` column in `table-mapping.csv` | Decide global-versus-tenant ownership and enforce it with schema/policy tests. Never infer cross-firm access from client input. | Data/security owners | Open |
| KD-006 | Some public exports have no statically detectable authentication helper. Some are intentionally public, while others may be missing protection. | Inventory summary and `Authorization` column | Classify each as public/authenticated and threat-review it. Do not automatically reproduce unauthenticated access. | Security owner | Open |
| KD-007 | Tenant compatibility currently allows a user without `firmId` when exactly one active firm exists. | `requireFirmId` in `convex/lib/roles.ts` | Backfill firm ownership and remove this ambiguity before multi-firm PostgreSQL authority. | Security/data owners | Open |
| KD-008 | The TypeScript application configuration aliases `convex/react` to the mock implementation, while Vite conditionally aliases it only when `VITE_USE_MOCK=true`; tooling and runtime can therefore validate different clients. | `tsconfig.json` and `vite.config.ts` | Use one explicit data-client adapter and environment contract. | Frontend owner | Open |
| KD-009 | The document-generator UI creates synthetic `generated_<timestamp>` storage IDs without persisting a corresponding file object. | `src/pages/admin/AdminDocumentGenerator.tsx` | Implement real generated-file persistence or explicitly retire the behavior; never migrate synthetic IDs as valid objects. | Documents owner | Open |
| KD-010 | Several upload flows branch on a mock URL prefix and create browser-local blob or fabricated storage IDs. Those IDs are not durable or portable. | Document upload/KYC components and `runtime-dependencies.csv` | Keep this behavior demo-only; production migration accepts only verified object-storage references. | Documents/frontend owners | Open |

## Triage rules

- `Confirmed defect`: behavior must be corrected and covered by a target test.
- `Intentional simulation`: product must choose implement, retain as demo-only, or remove.
- `Needs investigation`: do not promise parity until runtime evidence exists.
- Closing an item requires a linked ADR, parity row, test, or approved retirement decision.
