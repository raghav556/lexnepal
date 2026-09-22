# CUI-07 — Client Matter Details

## Scope

Route: `/client/cases/:id`  
Body reference: `doc/ui-reference/client/references/03-matter-details.jpg` (BODY ONLY)  
Shell: frozen dark Client shell (CUI-03). My Matters remains active.

## Reconciliation

Owner-dirty primary `ClientCaseDetailPage` only swapped `CASE_DETAIL_HERO_CLASS` → `CASE_CLIENT_HERO_CLASS`.  
**Rejected.** CUI-07 keeps published `CASE_DETAIL_HERO_CLASS` / `CASE_DETAIL_TABS_LIST_CLASS` and page-scoped `.client-matter-detail*` CSS. Protected `case-ui.ts` untouched.

## Implementation

| Area                                            | Approach                                                                         |
| ----------------------------------------------- | -------------------------------------------------------------------------------- |
| Header                                          | Compact breadcrumb + status + title + meta + CTAs                                |
| Overview                                        | Quick facts + main/rail composition                                              |
| Hearings / Team / Actions / Documents / Updates | Tabs backed by existing hooks                                                    |
| Messages                                        | Existing `/client/messages?caseId=` engine (CTA + optional recent preview)       |
| Upload                                          | Link into existing Documents workflow (no second upload engine)                  |
| Calendar                                        | Reused ICS download pattern from Home/Hearings                                   |
| Updates                                         | `useNotifications` filtered by `relatedId` / `caseId` / `/client/cases/:id` link |

## Freezes

- CUI-05 Home / `.client-home*` — not modified
- CUI-06 My Matters / `.client-matters*` — not modified
- Staff/Admin pages and `cases-workspace` — not modified
- No `CASE_CLIENT_HERO_CLASS`
- No fabricated court timeline / fake statuses / fake legal events

## Files

- `src/views/client/ClientCaseDetailPage.tsx`
- `src/index.css` (`.client-matter-detail*` only)
- `tests/unit/cui-07-client-matter-details-contract.test.ts`
- `tests/e2e/cui-07-client-matter-details.spec.ts`
- `doc/ui-reference/client/audit/CUI-07-MATTER-DETAILS.md`
