# Phase 8.5: Financial Domain Migration

## Overview
This phase handles the migration of financial, billing, and trust accounting features from Convex to Next.js + Drizzle. This involves migrating invoices, time entries, trust transactions, and expenses.

## What Was Done

### 1. Database Schema
Financial tables are defined in `db/schema.ts` (using Next.js + Drizzle):
- `invoices`
- `invoiceLineItems`
- `timeEntries`
- `payments`
- `trustTransactions`
- `expenses`

### 2. Financial Repository
Created `src/server/repositories/financial-repository.ts` as the server-side single point of truth for financial mutations. This strictly enforces wrapping financial operations (such as payments and trust top-ups) within database transactions to maintain consistency.

### 3. Frontend Hooks (Convex Bridge)
Created `src/client/queries/financial.ts` containing the dual-backend domain hooks:
- `useInvoices`, `useInvoiceCommands`
- `useTimeEntries`, `useTimeEntryCommands`
- `useTrustTransactions`, `useTrustCommands`
- `useExpenses`, `useExpenseCommands`
- `useExpenseStats`

### 4. Component Refactoring
Refactored all frontend components that read or write financial data to use the domain-specific hooks instead of direct Convex API calls. Components refactored include:
- `src/pages/staff/StaffTimeTrackerPage.tsx`
- `src/pages/staff/StaffTasksPage.tsx`
- `src/pages/staff/StaffDashboard.tsx`
- `src/pages/staff/StaffCaseDetailPage.tsx`
- `src/pages/client/ClientDashboard.tsx`
- `src/pages/client/ClientBillingPage.tsx`
- `src/pages/admin/AdminFinancePage.tsx`
- `src/pages/admin/AdminExpensesPage.tsx`
- `src/pages/admin/AdminDashboard.tsx`

### 5. Migration Tools
- Implemented `src/server/services/financial-migration.ts` to extract `invoices`, `timeEntries`, `trustTransactions`, and `expenses` from Convex export zips and insert them into Postgres.
- Added `scripts/migration/migrate-financial-export.ts` CLI wrapper.
- Exposed as `npm run migration:financial`.

## Key Invariants Maintained
- **Idempotency & Transactions**: Ensuring financial mutations inside Postgres run inside `.transaction()` blocks.
- **Client/Case resolution**: Financial entries explicitly connect to `cases` and `clients`. The migration scripts correctly map these through `legacyConvexId`.

## Next Steps
- Verify the migration script on a real export (`npm run migration:financial`).
- Switch backend to "nextjs" in configuration when fully validated.
