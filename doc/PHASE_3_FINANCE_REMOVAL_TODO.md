# Phase 3 - Permanent Finance Removal

**Scope:** Localhost only  
**Status:** Complete — `PASS_LOCAL`  
**Backup:** `lexnepal-20260901-190937.dump` (1,084,189 bytes; restore drill passed before removal)  
**SHA-256:** `EDD926C3D84D03BCAEF6277ADF941F5CB6EEA9107A8B34AB014B2D153A2EAD7B`

## Locked outcome

- [x] Remove the staff Workspace heading and Time & Billing; retain Dashboard, Tasks and HR.
- [x] Remove Admin Financials, Finance and Expenses.
- [x] Remove Client Billing and its payment-return route.
- [x] Remove payment gateways and billing defaults while retaining SMS and meeting integrations.
- [x] Replace finance dashboard and analytics content with live operational metrics.
- [x] Remove all active finance pages, APIs, services, queries, contracts, scripts and permissions.
- [x] Drop invoices, invoice line items, time entries, payments, trust transactions and expenses.
- [x] Return HTTP 404 for every removed page and API route.

## Protected exclusions

- [x] Preserve HR payroll, salary, attendance and leave features.
- [x] Preserve generic appointment, hearing and task date/time behavior.
- [x] Preserve the public legal practice area named Banking & Finance.
- [x] Preserve immutable historical audit events and archived migration documentation.

## Exit evidence

- [x] Formatting, lint, TypeScript and production build pass.
- [x] Unit, integration, characterization and database tests pass.
- [x] Full Chromium browser and accessibility tests pass (47/47).
- [x] Removed pages and APIs return genuine HTTP 404.
- [x] Database inspection confirms all six tables, dedicated enums, settings and permissions are absent.
- [x] Health and readiness return HTTP 200 with the local development server running.

## Implementation evidence

- Forward-only migration: `drizzle/0025_remove_financial_domain.sql`.
- Active inventory: 77 page routes and 160 API route files; no finance route is present.
- Production build route manifest contains no removed page or `/api/v1/financial/*` endpoint.
- Operational dashboards use matters, clients, leads, tasks, users and hearings.
