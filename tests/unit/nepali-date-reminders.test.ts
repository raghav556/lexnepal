import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuditContext } from "@/server/audit/context";

const fixture = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[], values: vi.fn(), update: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/audit/write-audit", () => ({ writeAuditLog: vi.fn() }));
vi.mock("@/server/db/client", () => ({ getDatabase: () => ({
  select: () => ({ from: () => ({ where: () => ({ limit: async () => fixture.rows }) }) }),
  transaction: async (run: (tx: unknown) => Promise<void>) => run({
    insert: () => ({ values: fixture.values }),
    update: () => ({ set: fixture.update.mockReturnValue({ where: async () => {} }) }),
  }),
}) }));
import { MySqlWorkManagementRepository } from "@/server/repositories/work-management-repository";

describe("Existing reminder scan uses Nepal civil days without changing persisted instants", () => {
  const now = new Date("2026-10-19T18:20:00Z"); // 20 October, 00:05 NPT
  const audit = { occurredAt: now } as AuditContext;
  const task = { id: "synthetic-task", assignedTo: "synthetic-user", title: "Synthetic deadline", dueDate: new Date("2026-10-19T19:00:00Z"), dueDateBs: "WRONG LEGACY TEXT" };
  beforeEach(() => { vi.clearAllMocks(); fixture.rows = []; });
  it("sends for today's Nepal day even when UTC/server-local dates differ", async () => {
    fixture.rows = [task];
    expect(await new MySqlWorkManagementRepository().scanOverdueReminders("synthetic-firm", audit)).toEqual({ sent: 1 });
    expect(fixture.values).toHaveBeenCalledWith(expect.objectContaining({ body: '"Synthetic deadline" is due or overdue (20 Oct 2026 A.D. (3 Kartik 2083 B.S.)).' }));
    expect(fixture.update).toHaveBeenCalledWith({ lastDueReminderAt: now, updatedAt: now });
    expect(task.dueDate.toISOString()).toBe("2026-10-19T19:00:00.000Z");
  });
  it("does not resend on the same Nepal day across a UTC day boundary", async () => {
    fixture.rows = [{ ...task, lastDueReminderAt: new Date("2026-10-19T18:16:00Z") }];
    expect(await new MySqlWorkManagementRepository().scanOverdueReminders("synthetic-firm", { occurredAt: new Date("2026-10-20T01:00:00Z") } as AuditContext)).toEqual({ sent: 0 });
    expect(fixture.values).not.toHaveBeenCalled();
  });
  it("allows a new Nepal day despite the same UTC day", async () => {
    fixture.rows = [{ ...task, lastDueReminderAt: new Date("2026-10-19T18:14:00Z") }];
    expect(await new MySqlWorkManagementRepository().scanOverdueReminders("synthetic-firm", audit)).toEqual({ sent: 1 });
  });
  it("retains future and missing-date exclusions", async () => {
    fixture.rows = [{ ...task, dueDate: new Date("2026-10-20T18:15:00Z") }, { ...task, dueDate: null }];
    expect(await new MySqlWorkManagementRepository().scanOverdueReminders("synthetic-firm", audit)).toEqual({ sent: 0 });
    expect(fixture.values).not.toHaveBeenCalled();
  });
});
