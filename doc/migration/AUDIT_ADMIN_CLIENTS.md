# Audit — Admin / Staff Clients directory

**Scope:** `http://localhost:3001/admin/clients` (shared with `/staff/clients`)  
**Date:** 2026-08-06  
**Rule:** One shared directory component — do not fork admin vs staff UIs.

---

## Gaps found (before fix)

| Gap | Before | After |
| --- | --- | --- |
| Layout | Card grid only | Table + detail drawer (Users-console pattern) |
| Dashboard KPIs | None (only KYC queue subtitle) | Total / KYC awaiting / Portal linked / Active matters |
| Filters | Search only | KYC, type, portal, active/inactive + search |
| Pagination | None (full list) | Paginated (15/page) |
| Edit CRM profile | Create only | Drawer edit → `PATCH /api/v1/clients/:id` |
| Export | None | CSV export of filtered set |
| Portal / KYC | Inline on cards | Drawer actions + existing grant/KYC modals |
| Deep links | None | Users (admin), CRM pipeline (admin), Staff cases (staff) |
| Deactivate | None | Confirm → `isActive` toggle |

## Intentionally not duplicated

- No second `AdminClientsPage` — `/admin/clients` still re-exports the shared `StaffClientsPage`.
- No new APIs — reuse list/create/update/KYC/portal-access.
- Firm analytics stay on `/admin/analytics` (not re-implemented here).

## Done when

Ops can filter, page, open a drawer, edit, grant portal, review KYC, and export without card sprawl on localhost.
