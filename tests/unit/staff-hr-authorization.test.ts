import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthPrincipal } from "../../src/server/auth/types";
import type { AuditContext } from "../../src/server/audit/context";
import { HrService } from "../../src/server/services/hr-service";

const repo = vi.hoisted(() => ({
  listAttendance: vi.fn(),
  listLeaveRequests: vi.fn(),
  listLeaveBalances: vi.fn(),
  upsertAttendance: vi.fn(),
  createLeaveRequest: vi.fn(),
  reviewLeaveRequest: vi.fn(),
  upsertLeaveBalance: vi.fn(),
}));
const notifications = vi.hoisted(() => ({
  notifyLeaveSubmitted: vi.fn(),
  notifyLeaveReviewed: vi.fn(),
}));
vi.mock("@/server/repositories/hr-repository", () => ({
  HrRepository: class {
    listAttendance = repo.listAttendance;
    listLeaveRequests = repo.listLeaveRequests;
    listLeaveBalances = repo.listLeaveBalances;
    upsertAttendance = repo.upsertAttendance;
    createLeaveRequest = repo.createLeaveRequest;
    reviewLeaveRequest = repo.reviewLeaveRequest;
    upsertLeaveBalance = repo.upsertLeaveBalance;
  },
}));
vi.mock("@/server/services/hr-notifications", () => notifications);

const principal: AuthPrincipal = {
  user: {
    id: "staff",
    firmId: "firm",
    tokenIdentifier: "synthetic",
    name: "Synthetic Staff",
    email: "staff@example.invalid",
    role: "associate",
    isActive: true,
    isPending: false,
    avatar: null,
    phone: null,
  },
  firmId: "firm",
  capabilities: new Set(),
  sessionId: "synthetic",
  authenticationMethod: "session_cookie",
};
const audit = {} as AuditContext;
const service = new HrService();
beforeEach(() => vi.clearAllMocks());
describe("Existing HR self-service authorization (repository and notifications mocked)", () => {
  it.each(["listAttendance", "listLeaveRequests", "listLeaveBalances"] as const)(
    "scopes %s to the principal even with a forged user filter",
    async (method) => {
      repo[method].mockResolvedValue([]);
      await service[method](principal, { userId: "other-staff" });
      expect(repo[method]).toHaveBeenCalledWith("firm", { userId: "staff" });
    },
  );
  it("permits the existing self attendance command without hr.manage", async () => {
    const input = {
      userId: "staff",
      date: "2026-10-20",
      clockIn: "09:00 AM",
      status: "present" as const,
    };
    await service.upsertAttendance(principal, input, audit);
    expect(repo.upsertAttendance).toHaveBeenCalledWith("firm", input, audit);
  });
  it("denies attendance changes for another staff member", async () => {
    await expect(
      service.upsertAttendance(
        principal,
        { userId: "other", date: "2026-10-20", status: "present" },
        audit,
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(repo.upsertAttendance).not.toHaveBeenCalled();
  });
  it("assigns submitted leave to the principal and only calls mocked notifications", async () => {
    const input = { type: "annual" as const, fromDate: "2026-10-20", toDate: "2026-10-20" };
    repo.createLeaveRequest.mockResolvedValue({ ...input, id: "leave", userId: "staff" });
    await service.createLeaveRequest(principal, input, audit);
    expect(repo.createLeaveRequest).toHaveBeenCalledWith("firm", "staff", input, audit);
    expect(notifications.notifyLeaveSubmitted).toHaveBeenCalledOnce();
  });
  it("does not grant self-service approval or balance-adjustment rights", async () => {
    await expect(
      service.reviewLeaveRequest(principal, { leaveRequestId: "leave", status: "approved" }, audit),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      service.upsertLeaveBalance(
        principal,
        { userId: "staff", type: "annual", year: 2026, entitledDays: 99 },
        audit,
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(repo.reviewLeaveRequest).not.toHaveBeenCalled();
    expect(repo.upsertLeaveBalance).not.toHaveBeenCalled();
  });
  it("rejects Client-role access and invalid firm context before repository access", async () => {
    await expect(
      service.listAttendance({ ...principal, user: { ...principal.user, role: "client" } }, {}),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      service.listAttendance({ ...principal, firmId: "another-firm" }, {}),
    ).rejects.toMatchObject({ status: 403 });
    expect(repo.listAttendance).not.toHaveBeenCalled();
  });
});
