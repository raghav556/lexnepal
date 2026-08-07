# Known Defects and Behaviors Not to Reproduce

**Status:** Triaged after local Convex decommission (R8) + local production-shaped gate  
**Last updated:** 2026-08-07

This list separates current behavior that needs parity from defects, simulations and unsafe shortcuts that must not become target requirements.

## Disposition legend

- `Closed` — obsolete after Next/Postgres cutover or fixed
- `Accepted residual` — product gap with explicit local disposition
- `Open` — still actionable on the Next stack

## Triage (post-R8)

| ID | Summary | Disposition | Notes |
|---|---|---|---|
| KD-001 | Briefs API simulated | **Accepted residual** | Keep classified until product implements or removes UI; do not invent undocumented stubs |
| KD-002 | Offline Convex mock undefined | **Closed** | `convex-mock` removed in R8 |
| KD-003 | `any` casts hide contract gaps | **Open** | Continue tightening Zod contracts on touch |
| KD-004 | Implicit Convex response validators | **Closed** | Convex gone; Next contracts are Zod |
| KD-005 | Tables without direct firmId | **Accepted residual** | Tenant via relationships; enforce with `assertResourceInFirm` on access paths |
| KD-006 | Public exports auth classification | **Open** | Threat-review remaining public routes when adding endpoints |
| KD-007 | Single-firm firmId ambiguity | **Closed** | Local identity requires firm context; multi-firm still single-writer per firm |
| KD-008 | tsconfig aliases convex/react to mock | **Closed** | Convex/mock aliases removed |
| KD-009 | Document generator synthetic storage IDs | **Accepted residual** | Implement real persistence or retire generator UI; never treat synthetic IDs as objects |
| KD-010 | Mock URL blob uploads | **Closed** | Demo mock upload paths removed with Convex |

## Triage rules

- Closing an item requires linked evidence (code removal, ADR, verify flag, or owner sign-off).
- `Accepted residual` items must not block `complete_local` / local production-shaped gate.
- Do not reintroduce Convex-era shortcuts.
