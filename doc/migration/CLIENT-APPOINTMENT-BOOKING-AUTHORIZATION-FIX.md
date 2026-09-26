# Client Appointment Booking Authorization Fix

**Status:** Local security fix complete; technical-owner review and publication pending
**Starting SHA:** `840b6b838dc1cdb961a4d719373924d7b3ddc8d7`

## Confirmed vulnerability

An authenticated Client could submit another same-firm Client UUID to `POST /api/v1/appointments/book`. The route accepted the browser payload, `CrmService.bookConsultation` forwarded it unchanged, and the repository checked only that the supplied Client belonged to the firm. This allowed an appointment to be created against a foreign Client record.

## Root cause and correction

The Client browser was incorrectly treated as authoritative for `clientId`, name, email, phone, and lawyer assignment. For `role=client`, the service now resolves the Client record through `firmId + principal.user.id` and:

- rejects an absent linked Client profile with a generic `FORBIDDEN` response;
- rejects a supplied foreign `clientId` before any appointment is created;
- derives appointment identity fields from the linked Client record;
- stores `assignedLawyerId` as `null`.

The Client booking workflow has no server-authoritative lawyer-selection rule. Lawyer assignment remains the existing Staff CRM workflow. Client-controlled consultation type, date, time slot, and notes remain unchanged.

## Regression coverage

`tests/unit/client-appointment-booking-auth.test.ts` proves foreign-ID rejection without repository creation or notification, own booking identity derivation and pending status, identity and lawyer tampering neutralization, unlinked-account rejection, Client list scoping, and unchanged Staff booking input behavior. `npm run crm:verify-client-appointment-booking-auth` exercises the API routes and local MySQL path with two same-firm Client records, verifies the generic 403 response leaks no foreign identity, and cleans up the appointments and secondary Client fixture it creates.

## Scope

No schema, tenancy-model, public-booking, Client UI, Staff UI, or Admin UI change is included.
