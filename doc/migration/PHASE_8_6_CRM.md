# Phase 8.6: CRM (Leads & Appointments) Migration

## Overview
This document outlines the migration of the CRM module, specifically dealing with leads and appointments, from the legacy Convex backend to the new Drizzle/Postgres database. It uses the domain-by-domain strangler pattern approach.

## Data Model Changes

### Leads Table
- Mapped from `leads` table in Convex.
- Schema includes `fullName`, `email`, `phone`, `source`, `practiceAreaInterest`, `message`, `status`, `assignedTo`, `convertedClientId`, `notes`, `intakeToken`, and `intakeSubmitted`.
- Enum used for lead source and status.

### Appointments Table
- Mapped from `appointments` table in Convex.
- Schema includes `clientName`, `clientEmail`, `clientPhone`, `clientId`, `assignedLawyerId`, `practiceArea`, `date`, `timeSlot`, `notes`, `status`, and `meetingLink`.

## Backend Updates
- `crm-repository.ts` created with CRUD operations for Leads and Appointments.
- Implemented `migrateCrmExport` logic for robust ID mapping, conflict resolution, and data migration, using the same pattern as Matters.
- `migration:crm` script added to run the export logic from CLI.

## Client Updates
- Created new React Query hooks in `src/client/queries/crm.ts`:
  - `useLeads()` and `useLeadCommands()`
  - `useAppointments()` and `useAppointmentCommands()`
- Modified frontend pages to abstract over Convex and use the standard dual-backend toggle logic:
  - `StaffAppointmentsPage.tsx`
  - `AdminAppointmentsPage.tsx`
  - `AdminCRMPage.tsx`
  - `ClientBookingPage.tsx`
  - `IntakeFormPage.tsx`
  - `ResourcesPage.tsx`
  - `ContactPage.tsx`
  - `ConsultationPage.tsx`

## Status
- **Schema**: Done
- **Backend**: Done
- **Frontend**: Done
- **Verification**: Ready for characterization tests.
