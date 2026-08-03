# Phase 8.7: Messages and Notifications Migration

## Overview
This document outlines the migration of the Messages and Notifications modules from the legacy Convex backend to the new Drizzle/Postgres database. It follows the domain-by-domain strangler pattern approach and utilizes standard polling mechanisms for near-real-time updates as required.

## Data Model Changes

### Messages Table
- Mapped from `messages` table in Convex.
- Schema includes `caseId`, `senderId`, `content`, `isInternal`.
- `messageReads` table tracks user read statuses, supporting multiple readers per message.

### Notifications Table
- Mapped from `notifications` table in Convex.
- Schema includes `userId`, `title`, `body`, `type`, `relatedId`, `link`, and `isRead`.

## Backend Updates
- `communication-repository.ts` created with CRUD operations for Messages and Notifications.
- Implemented `communicate-migration.ts` logic for robust ID mapping, conflict resolution, and data migration, gracefully handling orphaned users or cases.
- `migration:communication` script added to run the export logic from CLI.

## Client Updates
- Created new React Query hooks in `src/client/queries/communication.ts`:
  - `useMessages()` and `useMessageCommands()`
  - `useNotifications()` and `useNotificationCommands()`
- Replaced SSE/WebSockets subscriptions in Convex with simple TanStack query polling at 5 and 10 second intervals for messages and notifications respectively.
- Modified frontend pages to abstract over Convex and use the standard dual-backend toggle logic:
  - `ClientMessagesPage.tsx`
  - `ClientDashboard.tsx`
  - `CommandCenter.tsx`
  - `notification-bell.tsx`

## Status
- **Schema**: Done
- **Backend**: Done
- **Frontend**: Done
- **Verification**: Ready for characterization tests.
