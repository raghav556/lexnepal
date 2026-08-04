import "server-only";
import { and, asc, eq, isNull, ne, type SQL } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { attendance, leaveRequests, users } from "@/server/db/schema";
import type {
  AttendanceDto,
  AttendanceListInput,
  AttendanceUpsertInput,
  LeaveCreateInput,
  LeaveListInput,
  LeaveRequestDto,
  PayrollRowDto,
  SetBaseSalaryInput,
} from "@/shared/contracts/hr";
import { AppError } from "@/shared/errors/api-error";

const database = getDatabase();

function asDateString(value: string | Date): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function parseClock(date: string, clock?: string): Date | null {
  if (!clock?.trim()) return null;
  const trimmed = clock.trim();
  const iso = Date.parse(trimmed);
  if (!Number.isNaN(iso) && trimmed.includes("T")) return new Date(iso);
  const combined = Date.parse(`${date} ${trimmed}`);
  if (!Number.isNaN(combined)) return new Date(combined);
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const d = new Date(`${date}T00:00:00`);
    if (!Number.isNaN(d.valueOf())) {
      d.setHours(hours, minutes, 0, 0);
      return d;
    }
  }
  return null;
}

function formatClock(value: Date | null): string | undefined {
  if (!value) return undefined;
  return value.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function toAttendanceDto(row: typeof attendance.$inferSelect): AttendanceDto {
  return {
    id: row.id,
    _id: row.id,
    firmId: row.firmId,
    userId: row.userId,
    date: asDateString(row.attendanceDate as unknown as string | Date),
    clockIn: formatClock(row.clockIn),
    clockOut: formatClock(row.clockOut),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toLeaveDto(row: typeof leaveRequests.$inferSelect): LeaveRequestDto {
  return {
    id: row.id,
    _id: row.id,
    firmId: row.firmId,
    userId: row.userId,
    type: row.type,
    fromDate: asDateString(row.fromDate as unknown as string | Date),
    toDate: asDateString(row.toDate as unknown as string | Date),
    reason: row.reason,
    status: row.status,
    reviewedBy: row.reviewedBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class HrRepository {
  async listAttendance(firmId: string, filters: AttendanceListInput): Promise<AttendanceDto[]> {
    const clauses: SQL[] = [eq(attendance.firmId, firmId), isNull(attendance.deletedAt)];
    if (filters.userId) clauses.push(eq(attendance.userId, filters.userId));
    if (filters.date) clauses.push(eq(attendance.attendanceDate, filters.date));
    const rows = await database
      .select()
      .from(attendance)
      .where(and(...clauses))
      .orderBy(asc(attendance.attendanceDate));
    return rows.map(toAttendanceDto);
  }

  async upsertAttendance(firmId: string, input: AttendanceUpsertInput): Promise<AttendanceDto> {
    const [targetUser] = await database
      .select({ id: users.id, firmId: users.firmId })
      .from(users)
      .where(and(eq(users.id, input.userId), eq(users.firmId, firmId), isNull(users.deletedAt)))
      .limit(1);
    if (!targetUser) throw new AppError("NOT_FOUND", "User not found in firm", 404);

    const clockIn = parseClock(input.date, input.clockIn);
    const clockOut = parseClock(input.date, input.clockOut);
    const now = new Date();

    const [row] = await database
      .insert(attendance)
      .values({
        firmId,
        userId: input.userId,
        attendanceDate: input.date,
        clockIn,
        clockOut,
        status: input.status,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [attendance.firmId, attendance.userId, attendance.attendanceDate],
        set: {
          clockIn,
          clockOut,
          status: input.status,
          updatedAt: now,
          deletedAt: null,
        },
      })
      .returning();

    if (!row) throw new AppError("INTERNAL_ERROR", "Failed to upsert attendance", 500);
    return toAttendanceDto(row);
  }

  async listLeaveRequests(firmId: string, filters: LeaveListInput): Promise<LeaveRequestDto[]> {
    const clauses: SQL[] = [eq(leaveRequests.firmId, firmId), isNull(leaveRequests.deletedAt)];
    if (filters.userId) clauses.push(eq(leaveRequests.userId, filters.userId));
    if (filters.status) clauses.push(eq(leaveRequests.status, filters.status));
    const rows = await database
      .select()
      .from(leaveRequests)
      .where(and(...clauses))
      .orderBy(asc(leaveRequests.fromDate));
    return rows.map(toLeaveDto);
  }

  async createLeaveRequest(
    firmId: string,
    userId: string,
    input: LeaveCreateInput,
  ): Promise<LeaveRequestDto> {
    if (input.toDate < input.fromDate) {
      throw new AppError("VALIDATION_FAILED", "toDate must be on or after fromDate", 400);
    }
    const now = new Date();
    const [row] = await database
      .insert(leaveRequests)
      .values({
        firmId,
        userId,
        type: input.type,
        fromDate: input.fromDate,
        toDate: input.toDate,
        reason: input.reason ?? null,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    if (!row) throw new AppError("INTERNAL_ERROR", "Failed to create leave request", 500);
    return toLeaveDto(row);
  }

  async reviewLeaveRequest(
    firmId: string,
    leaveRequestId: string,
    status: "approved" | "rejected",
    reviewerId: string,
  ): Promise<LeaveRequestDto> {
    const [existing] = await database
      .select()
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.id, leaveRequestId),
          eq(leaveRequests.firmId, firmId),
          isNull(leaveRequests.deletedAt),
        ),
      )
      .limit(1);
    if (!existing) throw new AppError("NOT_FOUND", "Leave request not found", 404);

    const [row] = await database
      .update(leaveRequests)
      .set({
        status,
        reviewedBy: reviewerId,
        updatedAt: new Date(),
      })
      .where(eq(leaveRequests.id, leaveRequestId))
      .returning();
    if (!row) throw new AppError("INTERNAL_ERROR", "Failed to review leave request", 500);
    return toLeaveDto(row);
  }

  async generatePayroll(firmId: string): Promise<PayrollRowDto[]> {
    const staff = await database
      .select({
        id: users.id,
        name: users.name,
        role: users.role,
        baseSalary: users.baseSalary,
        isActive: users.isActive,
      })
      .from(users)
      .where(and(eq(users.firmId, firmId), isNull(users.deletedAt), ne(users.role, "client")));

    return staff
      .filter((u) => u.isActive && Number(u.baseSalary ?? 0) > 0)
      .map((u) => {
        const gross = Math.round(Number(u.baseSalary ?? 0));
        const pfEmployee = Math.round(gross * 0.1);
        const pfEmployer = Math.round(gross * 0.1);
        const ssfEmployer = Math.round(gross * 0.0333);
        const taxable = Math.max(0, gross - pfEmployee);
        let tax = 0;
        if (taxable > 500000) tax += (taxable - 500000) * 0.2;
        else if (taxable > 200000) tax += (taxable - 200000) * 0.1;
        tax = Math.round(tax);
        const net = gross - pfEmployee - tax;
        return {
          userId: u.id,
          name: u.name || "Staff",
          role: u.role,
          gross,
          pf: pfEmployee,
          pfEmployer,
          ssf: ssfEmployer,
          tax,
          net,
        };
      });
  }

  async setBaseSalary(firmId: string, input: SetBaseSalaryInput): Promise<{ success: true }> {
    const [target] = await database
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, input.userId), eq(users.firmId, firmId), isNull(users.deletedAt)))
      .limit(1);
    if (!target) throw new AppError("NOT_FOUND", "User not found in firm", 404);

    await database
      .update(users)
      .set({
        baseSalary: String(input.baseSalary),
        updatedAt: new Date(),
      })
      .where(eq(users.id, input.userId));
    return { success: true };
  }
}
