# Phase 1 Inventory Summary

**Regenerate with:** `npm run migration:inventory`

## Counts

| Item | Count |
|---|---:|
| Convex tables | 45 |
| Convex exported functions | 220 |
| Public queries | 74 |
| Public mutations | 141 |
| Public actions | 0 |
| Internal functions | 5 |
| Direct frontend API references | 0 |
| Frontend files with API references | 0 |
| Runtime storage/scheduler/internal-call dependencies | 20 |
| Frontend references without a Convex export | 0 |
| Tables without a direct `firmId` field | 28 |
| Public exports without a detected auth helper | 48 |

## Classification

All existing Convex exports and tables are initially classified as `migrate`; this prevents silent retirement. Frontend endpoints without a matching export are classified as `currently_simulated`. Any later `merge`, `replace`, or `retire` decision requires owner approval and evidence in the parity ledger.

## Static-analysis limitations

- Request validators are captured exactly; observed return expressions are recorded because most current handlers do not declare `returns` validators.
- Table access through shared helpers or an ID-only `ctx.db.get/patch/delete` cannot always be attributed statically.
- Auth, tenant, audit and notification fields report detected calls, not proof of correctness.
- Mock coverage is a heuristic based on branch text and must not be treated as behavioral parity.
- Dynamic API construction beyond `api.<module>.<export>` requires manual review.

## Unresolved references

- None detected.

## Tables requiring tenant-ownership design

- `attendance`
- `blogPosts`
- `careers`
- `cmsSettings`
- `conflictChecks`
- `documentTemplates`
- `firms`
- `hearings`
- `invoiceLineItems`
- `invoices`
- `jobApplications`
- `leaveRequests`
- `legalPages`
- `messages`
- `navigation`
- `newsAndAwards`
- `newsletterSubscribers`
- `notifications`
- `payments`
- `practiceAreas`
- `researchNotes`
- `resources`
- `sessions`
- `sopTemplates`
- `taskComments`
- `testimonials`
- `timeEntries`
- `trustTransactions`
