import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveCapabilities } from "@/server/auth/capabilities";
import type { AuditContext } from "@/server/audit/context";
import type { AuthPrincipal, AuthUser } from "@/server/auth/types";
import type { AppointmentBookInput } from "@/shared/contracts/crm";
import { CrmService } from "@/server/services/crm-service";

const mocks = vi.hoisted(() => ({
  repository: {
    getClientLinkForUser: vi.fn(),
    bookConsultation: vi.fn(),
    listAppointments: vi.fn(),
  },
  notifyAppointmentBooked: vi.fn(),
}));

vi.mock("@/server/repositories/crm-repository", () => ({
  CrmRepository: class {
    constructor() {
      return mocks.repository;
    }
  },
}));

vi.mock("@/server/repositories/identity-repository", () => ({
  MySqlIdentityRepository: class {},
}));

vi.mock("@/server/services/crm-notifications", () => ({
  notifyAppointmentAssigned: vi.fn(),
  notifyAppointmentBooked: mocks.notifyAppointmentBooked,
  notifyAppointmentClientStatus: vi.fn(),
  notifyAppointmentRescheduled: vi.fn(),
  notifyIntakeSubmitted: vi.fn(),
  notifyLeadAssigned: vi.fn(),
  notifyPublicLeadCreated: vi.fn(),
}));

const firmId = "61000000-0000-4000-8000-000000000001";
const clientAId = "61000000-0000-4000-8000-000000000010";
const clientBId = "61000000-0000-4000-8000-000000000011";
const assignedLawyerId = "61000000-0000-4000-8000-000000000012";

function principal(role: AuthUser["role"], userId: string): AuthPrincipal {
  return {
    user: {
      id: userId,
      firmId,
      tokenIdentifier: `local:${userId}`,
      name: null,
      email: null,
      role,
      isActive: true,
      isPending: false,
      avatar: null,
      phone: null,
    },
    firmId,
    capabilities: resolveCapabilities(role, undefined),
    sessionId: "session-test",
    authenticationMethod: "session_cookie",
  };
}

const audit: AuditContext = {
  actorId: "client-user-a",
  firmId,
  ipAddress: "127.0.0.1",
  requestId: "client-appointment-auth-test",
  occurredAt: new Date("2026-09-26T00:00:00.000Z"),
};

function bookingInput(overrides: Partial<AppointmentBookInput> = {}): AppointmentBookInput {
  return {
    clientName: "Browser supplied name",
    clientEmail: "browser@example.invalid",
    clientPhone: "+977-9800000000",
    clientId: clientAId,
    practiceArea: "Virtual Consultation",
    date: "2026-10-01",
    timeSlot: "10:00 AM",
    notes: "Client-selected notes",
    assignedLawyerId,
    ...overrides,
  };
}

describe("Client appointment booking authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.repository.getClientLinkForUser.mockResolvedValue({
      id: clientAId,
      fullName: "Client A Server Record",
      email: "client-a@example.invalid",
      phone: "+977-9811111111",
    });
    mocks.repository.bookConsultation.mockImplementation(
      async (_firmId: string, input: AppointmentBookInput) => ({
        _id: "61000000-0000-4000-8000-000000000099",
        ...input,
        status: "pending",
      }),
    );
  });

  it("rejects a same-firm foreign clientId without creating an appointment", async () => {
    const service = new CrmService();

    await expect(
      service.bookConsultation(
        principal("client", "client-user-a"),
        bookingInput({ clientId: clientBId }),
        audit,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });

    expect(mocks.repository.bookConsultation).not.toHaveBeenCalled();
    expect(mocks.notifyAppointmentBooked).not.toHaveBeenCalled();
  });

  it("derives Client identity, preserves Client booking fields, and leaves it unassigned", async () => {
    const service = new CrmService();
    const result = await service.bookConsultation(
      principal("client", "client-user-a"),
      bookingInput(),
      audit,
    );

    expect(result).toMatchObject({ clientId: clientAId, status: "pending" });
    expect(mocks.repository.bookConsultation).toHaveBeenCalledWith(
      firmId,
      expect.objectContaining({
        clientId: clientAId,
        clientName: "Client A Server Record",
        clientEmail: "client-a@example.invalid",
        clientPhone: "+977-9811111111",
        assignedLawyerId: null,
        practiceArea: "Virtual Consultation",
        date: "2026-10-01",
        timeSlot: "10:00 AM",
        notes: "Client-selected notes",
      }),
      audit,
    );
  });

  it("rejects a Client account without a linked Client profile", async () => {
    mocks.repository.getClientLinkForUser.mockResolvedValueOnce(null);
    const service = new CrmService();

    await expect(
      service.bookConsultation(principal("client", "unlinked-client-user"), bookingInput(), audit),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
    expect(mocks.repository.bookConsultation).not.toHaveBeenCalled();
  });

  it("scopes Client appointment listing to the linked Client, ignoring supplied filters", async () => {
    mocks.repository.listAppointments.mockResolvedValue([{ _id: "appointment-for-client-a" }]);
    const service = new CrmService();

    await expect(
      service.listAppointments(principal("client", "client-user-a"), {
        clientId: clientBId,
        status: "confirmed",
      }),
    ).resolves.toEqual([{ _id: "appointment-for-client-a" }]);

    expect(mocks.repository.listAppointments).toHaveBeenCalledWith(firmId, {
      clientId: clientAId,
      clientEmail: "client-a@example.invalid",
      status: "confirmed",
    });
  });

  it("preserves Staff booking input and does not resolve a Client profile", async () => {
    const service = new CrmService();
    const staffInput = bookingInput({ clientId: clientBId, assignedLawyerId });

    await service.bookConsultation(principal("admin", "admin-user"), staffInput, {
      ...audit,
      actorId: "admin-user",
    });

    expect(mocks.repository.getClientLinkForUser).not.toHaveBeenCalled();
    expect(mocks.repository.bookConsultation).toHaveBeenCalledWith(firmId, staffInput, {
      ...audit,
      actorId: "admin-user",
    });
  });
});
