import { describe, expect, it } from "vitest";
import { clientCreateSchema } from "@/shared/contracts/matters";
import {
  activeMatterCounts,
  buildStaffClientCreatePayload,
  buildStaffClientUpdatePayload,
  clientCsvRows,
  clientInitials,
  clientKpis,
  emptyStaffClientForm,
  filterStaffClients,
  nextClientAppointment,
  type StaffClient,
  type StaffClientMatter,
} from "@/views/staff/staff-clients-model";

const clients: StaffClient[] = [
  {
    _id: "c1",
    fullName: "Sunita Maharjan",
    type: "individual",
    email: "sunita@example.com",
    phone: "+977 9841234567",
    kycStatus: "pending",
    isActive: true,
    userId: null,
    createdAt: "2026-10-15T12:00:00.000Z",
  },
  {
    _id: "c2",
    fullName: "Himalaya Real Estate",
    type: "corporate",
    email: "info@himalaya.example",
    companyName: "Himalaya Real Estate",
    kycStatus: "verified",
    isActive: true,
    userId: "user-portal",
    createdAt: "2026-08-15T12:00:00.000Z",
  },
  {
    _id: "c3",
    fullName: "Dipen Shah",
    type: "individual",
    kycStatus: "submitted",
    isActive: false,
    createdAt: "2026-10-10T12:00:00.000Z",
  },
];

const matters: StaffClientMatter[] = [
  {
    _id: "m1",
    clientId: "c1",
    title: "Boundary dispute",
    caseNumber: "C-1",
    status: "active",
    practiceArea: "Property",
  },
  {
    _id: "m2",
    clientId: "c1",
    title: "Closed sale",
    caseNumber: "C-2",
    status: "closed",
    practiceArea: "Property",
  },
  {
    _id: "m3",
    clientId: "c2",
    title: "Lease",
    caseNumber: "C-3",
    status: "active",
    practiceArea: "Real estate",
  },
];

describe("staff clients list model", () => {
  it("counts real clients, pending KYC, visible active matters, and this month", () => {
    expect(clientKpis(clients, matters, new Date("2026-10-18T12:00:00.000Z"))).toEqual({
      total: 3,
      activeMatters: 2,
      kycPending: 1,
      createdThisMonth: 2,
    });
    expect(activeMatterCounts(matters).get("c1")).toBe(1);
  });

  it("filters by search, type, status, KYC, portal, and matter practice area", () => {
    const base = {
      query: "",
      type: "all" as const,
      status: "all" as const,
      kyc: "all" as const,
      portal: "all" as const,
      practiceArea: "all",
    };
    expect(
      filterStaffClients(clients, matters, { ...base, query: "sunita" }).map(
        (client) => client._id,
      ),
    ).toEqual(["c1"]);
    expect(filterStaffClients(clients, matters, { ...base, type: "corporate" })).toHaveLength(1);
    expect(filterStaffClients(clients, matters, { ...base, status: "inactive" })).toHaveLength(1);
    expect(filterStaffClients(clients, matters, { ...base, kyc: "submitted" })).toHaveLength(1);
    expect(filterStaffClients(clients, matters, { ...base, portal: "linked" })).toHaveLength(1);
    expect(
      filterStaffClients(clients, matters, { ...base, practiceArea: "Property" }).map(
        (client) => client._id,
      ),
    ).toEqual(["c1"]);
  });

  it("builds initials and a CSV without billing, owners, activity, or account ids", () => {
    expect(clientInitials("Sunita Maharjan")).toBe("SM");
    expect(clientInitials("")).toBe("—");
    const [row] = clientCsvRows(clients, matters);
    expect(row).toContain("Sunita Maharjan");
    expect(row?.join(",")).not.toMatch(/billing|owner|last activity|user-portal|%/i);
    expect(row).toContain("none");
  });

  it("builds a schema-valid create payload and names the failing field", () => {
    const created = buildStaffClientCreatePayload({
      ...emptyStaffClientForm(),
      fullName: "Ram Sharma",
      type: "corporate",
      companyName: "Ram Holdings",
      email: "",
      phone: "+977 9800000000",
    });
    expect(created.ok).toBe(true);
    if (created.ok) expect(clientCreateSchema.safeParse(created.payload).success).toBe(true);

    const missingCompany = buildStaffClientCreatePayload({
      ...emptyStaffClientForm(),
      fullName: "Ram Sharma",
      type: "corporate",
    });
    expect(missingCompany).toMatchObject({ ok: false, field: "companyName" });

    const longPhone = buildStaffClientCreatePayload({
      ...emptyStaffClientForm(),
      fullName: "Ram Sharma",
      phone: "9".repeat(51),
    });
    expect(longPhone.ok).toBe(false);
    if (!longPhone.ok) expect(longPhone.message).toMatch(/Phone/);

    const updated = buildStaffClientUpdatePayload({
      ...emptyStaffClientForm(),
      fullName: "Ram Sharma",
      type: "individual",
      companyName: "Should clear",
    });
    expect(updated.ok).toBe(true);
    if (updated.ok) {
      expect(updated.payload.companyName).toBeNull();
      expect(updated.payload).not.toHaveProperty("userId");
    }
  });

  it("picks the next real appointment and skips cancelled or past rows", () => {
    expect(
      nextClientAppointment(
        [
          { date: "2026-10-01", timeSlot: "09:00", status: "confirmed" },
          { date: "2026-10-20", timeSlot: "15:00", status: "cancelled" },
          { date: "2026-10-21", timeSlot: "10:00", status: "pending", practiceArea: "Property" },
          { date: "2026-10-19", timeSlot: "11:00", status: "confirmed", practiceArea: "Family" },
        ],
        "2026-10-18",
      ),
    ).toMatchObject({ date: "2026-10-19", practiceArea: "Family" });
  });
});
