/**
 * CUI-12 Client Appointments composition and security-preservation contract.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/views/client/ClientBookingPage.tsx", "utf8");
const queries = readFileSync("src/client/queries/crm.ts", "utf8");
const contracts = readFileSync("src/shared/contracts/crm.ts", "utf8");
const dates = readFileSync("src/shared/crm/appointment-dates.ts", "utf8");
const securityService = readFileSync("src/server/services/crm-service.ts", "utf8");
const nav = readFileSync("src/lib/client-shell-nav.ts", "utf8");
const fixture = readFileSync("scripts/e2e/seed-e2e-client-ui-preview.ts", "utf8");
const home = readFileSync("src/views/client/ClientDashboard.tsx", "utf8");
const matters = readFileSync("src/views/client/ClientCasesPage.tsx", "utf8");
const detail = readFileSync("src/views/client/ClientCaseDetailPage.tsx", "utf8");
const hearings = readFileSync("src/views/client/ClientHearingsPage.tsx", "utf8");
const checklist = readFileSync("src/views/client/ClientChecklistPage.tsx", "utf8");
const documents = readFileSync("src/views/client/ClientDocumentsPage.tsx", "utf8");
const messages = readFileSync("src/views/client/ClientMessagesPage.tsx", "utf8");

describe("CUI-12 client appointments contract", () => {
  it("renders the Appointments workspace and keeps its desktop navigation active", () => {
    expect(page).toContain('title="Appointments"');
    expect(page).toContain('className="client-appointments"');
    expect(page).toContain("Upcoming appointments");
    expect(page).toContain("Appointment history");
    expect(nav).toContain('if (matchesPath(path, "/client/booking")) return "appointments"');
  });

  it("uses the existing appointment, slot, and booking APIs rather than a client-side scheduler", () => {
    expect(page).toContain("useAppointments({})");
    expect(page).toContain("useAvailableSlots(selectedDateIso)");
    expect(page).toContain("bookConsultation.mutateAsync");
    expect(queries).toContain('"/api/v1/appointments"');
    expect(queries).toContain('"/api/v1/appointments/slots"');
    expect(queries).toContain('"/api/v1/appointments/book"');
    expect(page).not.toContain("DEFAULT_APPOINTMENT_SLOTS");
  });

  it("keeps the real status and firm-timezone contracts", () => {
    expect(contracts).toContain('z.enum(["pending", "confirmed", "completed", "cancelled"])');
    expect(page).toContain(
      'appointment.status === "pending" || appointment.status === "confirmed"',
    );
    expect(page).not.toContain('status === "scheduled"');
    expect(page).toContain("todayIsoInFirmTz");
    expect(page).toContain("addCalendarDaysIso");
    expect(page).toContain("formatAppointmentDate");
    expect(dates).toContain('"Asia/Kathmandu"');
  });

  it("presents the three supported modes and an accessible request workflow", () => {
    expect(page).toContain('label: "Virtual"');
    expect(page).toContain('label: "In-Person"');
    expect(page).toContain('label: "Phone"');
    expect(page).toContain('role="radiogroup"');
    expect(page).toContain("aria-checked={selected}");
    expect(page).toContain("aria-pressed={selected}");
    expect(page).toContain('htmlFor="appointment-notes"');
    expect(page).toMatch(/Submitting\s+request…/);
    expect(page).toContain("Request submitted");
    expect(page).toContain("Awaiting confirmation");
  });

  it("does not expose client-side staff controls or unsupported claims", () => {
    expect(page).not.toMatch(
      /Confirm Booking|Complete appointment|Assign lawyer|Reschedule appointment/,
    );
    expect(page).not.toMatch(
      /secure video|confidential consultation|Srimar Law Chambers|Kathmandu office/i,
    );
    expect(page).not.toContain("assignedLawyerId:");
    expect(page).not.toContain("leadId:");
    expect(page).toContain("appointment.meetingLink ?");
    expect(page).toContain('href="/client/messages"');
  });

  it("preserves the published server-side Client booking protection", () => {
    expect(securityService).toContain("getClientLinkForUser(firmId, principal.user.id)");
    expect(securityService).toContain("You are not authorized to book for this client");
    expect(securityService).toContain("assignedLawyerId: null");
    expect(securityService).toContain("A linked client profile is required to book");
  });

  it("uses the deterministic preview fixture and leaves frozen Client pages in place", () => {
    expect(fixture).toContain("const appointmentSpecs");
    expect(fixture).toContain("Virtual Consultation");
    expect(fixture).toContain("In-Person Consultation");
    expect(fixture).toContain("Phone Consultation");
    expect(fixture).toContain('status: "completed"');
    expect(home).toContain("ClientDashboard");
    expect(matters).toContain("ClientCasesPage");
    expect(detail).toContain("ClientCaseDetailPage");
    expect(hearings).toContain("ClientHearingsPage");
    expect(checklist).toContain("ClientChecklistPage");
    expect(documents).toContain("ClientDocumentsPage");
    expect(messages).toContain("ClientMessagesPage");
  });
});
