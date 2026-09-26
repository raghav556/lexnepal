# CUI-12 — Client Appointments

## Baseline and authority

- Starting secure SHA: `274ff5d6ccb795cb4ec6ec5882c9a792cc00b0d7`
- Reference: `doc/ui-reference/client/references/08-appointments.jpg`
- Reference SHA-256: `6953371FB141BF2E52CAA9065E29FAD34142B7802F50996431007A067271C88E` (verified)
- Authority applied: frozen Client shell, Reference 08 body hierarchy, real appointment workflows, shared components.

## Published security baseline

The published booking hotfix remains unchanged. `CrmService.bookConsultation` derives a Client from the firm and authenticated user, rejects a foreign supplied `clientId`, replaces browser identity fields with the linked Client record, and stores Client booking requests with `assignedLawyerId: null`. Client listing remains linked-user scoped. This UI sends no `assignedLawyerId` or `leadId` and adds no Client staff controls.

## API and data contract

- Appointment query: `useAppointments` → `GET /api/v1/appointments`
- Slots query: `useAvailableSlots(selectedDateIso)` → `GET /api/v1/appointments/slots`
- Booking: `bookConsultation` → `POST /api/v1/appointments/book`
- Stored statuses: `pending`, `confirmed`, `completed`, `cancelled`; no `scheduled` appointment assumption.
- Firm timezone and calendar helpers: `Asia/Kathmandu`, `todayIsoInFirmTz`, `addCalendarDaysIso`, and `formatAppointmentDate`.
- Modes retained through the existing `practiceArea` values: Virtual, In-Person, Phone.
- The deterministic preview fixture remains four records: three future confirmed appointments (Virtual, In-Person, Phone) and one completed past appointment. Targeted CUI-12 test records are removed by the reseed so test reruns restore the four-record fixture.

## Implementation decisions

- The page title is **Appointments** and its desktop navigation item is active through the frozen Client shell.
- Upcoming contains future `pending` or `confirmed` appointments. All other records, including past active records and completed/cancelled records, remain in history without changing stored status.
- Booking presents a pending request as “Request submitted” and “Awaiting confirmation”; it never promises confirmation.
- Slots are API data only; there are no browser-defined slot values or lawyer-specific Client parameters.
- A meeting action is rendered only for a real `meetingLink`.
- Scheduling assistance links purposefully to `/client/messages`.
- Unsupported security, video, confidentiality, office-address, duration, lawyer, and confirmation-code claims were removed.
- The Reference 08 desktop hierarchy is followed while omitting unsupported attorney, location, and cancellation/rescheduling controls.

## Accessibility and responsive verification

- Mode controls use a radio group with `aria-checked`; slots expose `aria-pressed`.
- Previous/next date controls have labels and past navigation is disabled at today.
- Notes have a visible label; booking exposes disabled/submitting/error states; successful requests use a polite live status.
- Status text is always visible alongside its color. Meeting links have appointment-specific accessible names. The loading spinner respects reduced motion.
- Browser verification passed at 1400×876, 1280×800, 1024×768, 768px, 390×844, and 360×800. At 390px and 360px, `scrollWidth <= clientWidth`.
- Mobile ordering is Upcoming → Request appointment → History and uses the frozen bottom-navigation architecture (Appointments is not a permanent bottom item).

## Tests and validation

- `tests/unit/cui-12-client-appointments-contract.test.ts`: route/composition, real API usage, status/date contract, modes and accessible states, truthfulness, security preservation, fixture and frozen-screen checks.
- `tests/e2e/cui-12-client-appointments.spec.ts`: real preview records, active navigation, real slot selection and pending booking success, notes, responsive no-overflow checks, and on-demand owner evidence capture.
- `tests/unit/client-appointment-booking-auth.test.ts`: published Client booking authorization and scoped-listing regression.

## Changed files

- `src/views/client/ClientBookingPage.tsx`
- `scripts/e2e/seed-e2e-client-ui-preview.ts` (only targeted cleanup of CUI-12 test-created bookings)
- `tests/unit/cui-12-client-appointments-contract.test.ts`
- `tests/e2e/cui-12-client-appointments.spec.ts`
- This audit record.

No frozen CUI-05 through CUI-11 page, Staff/Admin presentation, schema, tenancy, or server security file changed.

## Screenshots

The evidence root is `D:\lexnepal\.local\qa\cui-12\` (the requested `D:\lexnepal.local\` sibling does not exist; the repository’s actual local-worktree root is `D:\lexnepal\.local\`).

- `reference/08-appointments.jpg`
- `after/appointments-1400x876.png`
- `after/appointments-1280x800.png`
- `after/appointments-1024x768.png`
- `responsive/appointments-768.png`
- `responsive/appointments-390x844.png`
- `responsive/appointments-360x800.png`
- `states/appointments-upcoming.png`
- `states/appointments-booking.png`
- `states/appointments-success-pending.png`
- `states/appointments-history.png`
- `states/appointments-no-slots.png`
- `compare/appointments-overlay.png`
- `compare/appointments-diff.png`

## Final result

Client Appointments is a real API-backed, secure Client workspace ready for owner visual review after validation and local commit.
