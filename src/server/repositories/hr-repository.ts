import { returningInsert, returningMutation, returningUpsert } from "@/server/db/mysql-returning";
import "server-only";
import { and, asc, desc, eq, isNull, ne, type SQL } from "drizzle-orm";
import type { AuditContext } from "@/server/audit/context";
import { getDatabase } from "@/server/db/client";
import {
  attendance,
  auditLog,
  firmSettings,
  leaveBalances,
  leaveRequests,
  payrollRunLines,
  payrollRuns,
  users,
} from "@/server/db/schema";
import type {
  AttendanceDto,
  AttendanceListInput,
  AttendanceUpsertInput,
  HrLeavePolicyDto,
  LeaveBalanceDto,
  LeaveBalanceListInput,
  LeaveBalanceUpsertInput,
  LeaveCreateInput,
  LeaveListInput,
  LeaveRequestDto,
  LeaveType,
  PayrollRowDto,
  PayrollRunCreateInput,
  PayrollRunDto,
  PayrollRunLineDto,
  PayrollRunListInput,
  PayslipDto,
  SetBaseSalaryInput,
} from "@/shared/contracts/hr";
import {
  BALANCED_LEAVE_TYPES,
  countLeaveChargeDays,
  isBalanceTrackedType,
  leaveChargeDays,
} from "@/shared/hr/leave-days";
import { formatHrClock, parseHrClock } from "@/shared/hr/timezone";
import { AppError } from "@/shared/errors/api-error";

const database = getDatabase();
const HR_LEAVE_POLICY_KEY = "hrLeavePolicy";

export const DEFAULT_HR_LEAVE_POLICY: HrLeavePolicyDto = {
  skipWeekendsOnApprove: true,
  defaults: {
    annual: 18,
    sick: 12,
  },
};

type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0];

async function writeAudit(
  tx: Transaction,
  audit: AuditContext,
  action: string,
  resource: string,
  resourceId: string | null,
  details: string | null,
) {
  await tx.insert(auditLog).values({
    firmId: audit.firmId,
    userId: audit.actorId,
    action,
    resource,
    resourceId,
    details,
    ipAddress: audit.ipAddress,
    requestId: audit.requestId,
    createdAt: audit.occurredAt,
    updatedAt: audit.occurredAt,
  });
}

function asDateString(value: string | Date): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function parseClock(date: string, clock?: string): Date | null {
  return parseHrClock(date, clock);
}

function formatClock(value: Date | null): string | undefined {
  if (!value) return undefined;
  return formatHrClock(value);
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

function parseLeavePolicy(value: unknown): HrLeavePolicyDto {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_HR_LEAVE_POLICY, defaults: { ...DEFAULT_HR_LEAVE_POLICY.defaults } };
  }
  const raw = value as Record<string, unknown>;
  const defaults: Partial<Record<LeaveType, number>> = {
    ...DEFAULT_HR_LEAVE_POLICY.defaults,
  };
  if (raw.defaults && typeof raw.defaults === "object" && !Array.isArray(raw.defaults)) {
    for (const [key, days] of Object.entries(raw.defaults as Record<string, unknown>)) {
      if (
        (BALANCED_LEAVE_TYPES as readonly string[]).includes(key) &&
        typeof days === "number" &&
        Number.isFinite(days) &&
        days >= 0
      ) {
        defaults[key as LeaveType] = Math.floor(days);
      }
    }
  }
  return {
    skipWeekendsOnApprove:
      typeof raw.skipWeekendsOnApprove === "boolean"
        ? raw.skipWeekendsOnApprove
        : DEFAULT_HR_LEAVE_POLICY.skipWeekendsOnApprove,
    defaults,
  };
}

function yearFromIso(isoDate: string): number {
  return Number(isoDate.slice(0, 4));
}

export class HrRepository {
  async getLeavePolicy(firmId: string): Promise<HrLeavePolicyDto> {
    const [row] = await database
      .select({ value: firmSettings.value })
      .from(firmSettings)
      .where(
        and(
          eq(firmSettings.firmId, firmId),
          eq(firmSettings.key, HR_LEAVE_POLICY_KEY),
          isNull(firmSettings.deletedAt),
        ),
      )
      .limit(1);
    return parseLeavePolicy(row?.value);
  }

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

  async upsertAttendance(
    firmId: string,
    input: AttendanceUpsertInput,
    audit: AuditContext,
  ): Promise<AttendanceDto> {
    const [targetUser] = await database
      .select({ id: users.id, firmId: users.firmId })
      .from(users)
      .where(and(eq(users.id, input.userId), eq(users.firmId, firmId), isNull(users.deletedAt)))
      .limit(1);
    if (!targetUser) throw new AppError("NOT_FOUND", "User not found in firm", 404);

    const clockIn = parseClock(input.date, input.clockIn);
    const clockOut = parseClock(input.date, input.clockOut);

    return database.transaction(async (tx) => {
      const [row] = await returningUpsert(
        tx
          .insert(attendance)
          .values({
            firmId,
            userId: input.userId,
            attendanceDate: input.date,
            clockIn,
            clockOut,
            status: input.status,
            createdAt: audit.occurredAt,
            updatedAt: audit.occurredAt,
          })
          .onDuplicateKeyUpdate({
            set: {
              clockIn,
              clockOut,
              status: input.status,
              updatedAt: audit.occurredAt,
              deletedAt: null,
            },
          }),
        () =>
          tx
            .select()
            .from(attendance)
            .where(
              and(
                eq(attendance.firmId, firmId),
                eq(attendance.userId, input.userId),
                eq(attendance.attendanceDate, input.date),
              ),
            )
            .limit(1),
      );

      if (!row) throw new AppError("INTERNAL_ERROR", "Failed to upsert attendance", 500);
      await writeAudit(
        tx,
        audit,
        "hr.attendance_upserted",
        "attendance",
        row.id,
        `${input.userId}:${input.date}:${input.status}`,
      );
      return toAttendanceDto(row);
    });
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

  async listLeaveBalances(
    firmId: string,
    filters: LeaveBalanceListInput,
  ): Promise<LeaveBalanceDto[]> {
    const year = filters.year ?? new Date().getUTCFullYear();
    const policy = await this.getLeavePolicy(firmId);
    const skipWeekends = policy.skipWeekendsOnApprove;

    const staffClauses: SQL[] = [
      eq(users.firmId, firmId),
      isNull(users.deletedAt),
      ne(users.role, "client"),
    ];
    if (filters.userId) staffClauses.push(eq(users.id, filters.userId));
    const staff = await database
      .select({ id: users.id })
      .from(users)
      .where(and(...staffClauses));
    const userIds = staff.map((u) => u.id);
    if (userIds.length === 0) return [];

    const balanceClauses: SQL[] = [
      eq(leaveBalances.firmId, firmId),
      eq(leaveBalances.year, year),
      isNull(leaveBalances.deletedAt),
    ];
    if (filters.userId) balanceClauses.push(eq(leaveBalances.userId, filters.userId));
    const balanceRows = await database
      .select()
      .from(leaveBalances)
      .where(and(...balanceClauses));

    const leaveClauses: SQL[] = [eq(leaveRequests.firmId, firmId), isNull(leaveRequests.deletedAt)];
    if (filters.userId) leaveClauses.push(eq(leaveRequests.userId, filters.userId));
    const leaveRows = await database
      .select()
      .from(leaveRequests)
      .where(and(...leaveClauses));

    const overrideKey = (userId: string, type: LeaveType) => `${userId}:${type}`;
    const overrides = new Map(
      balanceRows.map((row) => [overrideKey(row.userId, row.type), row.entitledDays]),
    );

    const usage = new Map<string, { used: number; pending: number }>();
    const bump = (
      userId: string,
      type: LeaveType,
      status: "approved" | "pending",
      days: number,
    ) => {
      const key = overrideKey(userId, type);
      const cur = usage.get(key) ?? { used: 0, pending: 0 };
      if (status === "approved") cur.used += days;
      else cur.pending += days;
      usage.set(key, cur);
    };

    for (const leave of leaveRows) {
      if (leave.status !== "approved" && leave.status !== "pending") continue;
      if (!isBalanceTrackedType(leave.type)) continue;
      const from = asDateString(leave.fromDate as unknown as string | Date);
      const to = asDateString(leave.toDate as unknown as string | Date);
      if (yearFromIso(from) !== year && yearFromIso(to) !== year) {
        // still count overlapping days in selected year
      }
      const days = leaveChargeDays(from, to, { skipWeekends }).filter(
        (d) => yearFromIso(d) === year,
      ).length;
      if (days === 0) continue;
      bump(leave.userId, leave.type, leave.status, days);
    }

    const typesToShow = new Set<LeaveType>([
      ...BALANCED_LEAVE_TYPES,
      ...balanceRows.map((r) => r.type),
    ]);

    const result: LeaveBalanceDto[] = [];
    for (const userId of userIds) {
      for (const type of typesToShow) {
        if (!isBalanceTrackedType(type)) continue;
        const override = overrides.get(overrideKey(userId, type));
        const defaultEntitled = policy.defaults[type];
        const entitled =
          override !== undefined
            ? override
            : typeof defaultEntitled === "number"
              ? defaultEntitled
              : null;
        if (entitled === null) continue;
        const usedPending = usage.get(overrideKey(userId, type)) ?? { used: 0, pending: 0 };
        const remaining = Math.max(0, entitled - usedPending.used - usedPending.pending);
        result.push({
          userId,
          type,
          year,
          entitledDays: entitled,
          usedDays: usedPending.used,
          pendingDays: usedPending.pending,
          remainingDays: remaining,
          source: override !== undefined ? "override" : "default",
        });
      }
    }

    return result.sort((a, b) =>
      a.userId === b.userId ? a.type.localeCompare(b.type) : a.userId.localeCompare(b.userId),
    );
  }

  async upsertLeaveBalance(
    firmId: string,
    input: LeaveBalanceUpsertInput,
    audit: AuditContext,
  ): Promise<LeaveBalanceDto> {
    if (!isBalanceTrackedType(input.type)) {
      throw new AppError("VALIDATION_FAILED", "Unpaid leave does not use balances", 400);
    }
    const [target] = await database
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, input.userId), eq(users.firmId, firmId), isNull(users.deletedAt)))
      .limit(1);
    if (!target) throw new AppError("NOT_FOUND", "User not found in firm", 404);

    await database.transaction(async (tx) => {
      await tx
        .insert(leaveBalances)
        .values({
          firmId,
          userId: input.userId,
          type: input.type,
          year: input.year,
          entitledDays: input.entitledDays,
          createdAt: audit.occurredAt,
          updatedAt: audit.occurredAt,
        })
        .onDuplicateKeyUpdate({
          set: {
            entitledDays: input.entitledDays,
            updatedAt: audit.occurredAt,
            deletedAt: null,
          },
        });
      await writeAudit(
        tx,
        audit,
        "hr.leave_balance_set",
        "leave_balances",
        input.userId,
        `${input.type}:${input.year}:${input.entitledDays}`,
      );
    });

    const match = (
      await this.listLeaveBalances(firmId, {
        userId: input.userId,
        year: input.year,
      })
    ).find((b) => b.type === input.type);
    if (!match) throw new AppError("INTERNAL_ERROR", "Failed to load leave balance", 500);
    return match;
  }

  async createLeaveRequest(
    firmId: string,
    userId: string,
    input: LeaveCreateInput,
    audit: AuditContext,
  ): Promise<LeaveRequestDto> {
    if (input.toDate < input.fromDate) {
      throw new AppError("VALIDATION_FAILED", "toDate must be on or after fromDate", 400);
    }

    const policy = await this.getLeavePolicy(firmId);
    const skipWeekends = policy.skipWeekendsOnApprove;
    const year = yearFromIso(input.fromDate);
    const requestDays = countLeaveChargeDays(input.fromDate, input.toDate, { skipWeekends });

    if (isBalanceTrackedType(input.type) && requestDays > 0) {
      const balances = await this.listLeaveBalances(firmId, { userId, year });
      const balance = balances.find((b) => b.type === input.type);
      if (balance && requestDays > balance.remainingDays) {
        throw new AppError(
          "VALIDATION_FAILED",
          `Insufficient ${input.type} leave balance: need ${requestDays} day(s), remaining ${balance.remainingDays}`,
          400,
        );
      }
    }

    return database.transaction(async (tx) => {
      const [row] = await returningInsert(
        tx
          .insert(leaveRequests)
          .values({
            firmId,
            userId,
            type: input.type,
            fromDate: input.fromDate,
            toDate: input.toDate,
            reason: input.reason ?? null,
            status: "pending",
            createdAt: audit.occurredAt,
            updatedAt: audit.occurredAt,
          })
          .$returningId(),
        (id) => tx.select().from(leaveRequests).where(eq(leaveRequests.id, id)).limit(1),
      );
      if (!row) throw new AppError("INTERNAL_ERROR", "Failed to create leave request", 500);
      await writeAudit(
        tx,
        audit,
        "hr.leave_created",
        "leave_requests",
        row.id,
        `${input.type}:${input.fromDate}:${input.toDate}`,
      );
      return toLeaveDto(row);
    });
  }

  async reviewLeaveRequest(
    firmId: string,
    leaveRequestId: string,
    status: "approved" | "rejected",
    reviewerId: string,
    audit: AuditContext,
  ): Promise<LeaveRequestDto> {
    const policy = await this.getLeavePolicy(firmId);
    const skipWeekends = policy.skipWeekendsOnApprove;

    return database.transaction(async (tx) => {
      const [existing] = await tx
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
      if (existing.status !== "pending") {
        throw new AppError("VALIDATION_FAILED", "Leave request is already reviewed", 400);
      }

      const [row] = await returningMutation(
        tx
          .update(leaveRequests)
          .set({
            status,
            reviewedBy: reviewerId,
            updatedAt: audit.occurredAt,
          })
          .where(eq(leaveRequests.id, leaveRequestId)),
        () => tx.select().from(leaveRequests).where(eq(leaveRequests.id, leaveRequestId)),
      );
      if (!row) throw new AppError("INTERNAL_ERROR", "Failed to review leave request", 500);

      if (status === "approved") {
        const from = asDateString(existing.fromDate as unknown as string | Date);
        const to = asDateString(existing.toDate as unknown as string | Date);
        const dates = leaveChargeDays(from, to, { skipWeekends });
        for (const date of dates) {
          await tx
            .insert(attendance)
            .values({
              firmId,
              userId: existing.userId,
              attendanceDate: date,
              clockIn: null,
              clockOut: null,
              status: "leave",
              createdAt: audit.occurredAt,
              updatedAt: audit.occurredAt,
            })
            .onDuplicateKeyUpdate({
              set: {
                status: "leave",
                clockIn: null,
                clockOut: null,
                updatedAt: audit.occurredAt,
                deletedAt: null,
              },
            });
        }
        await writeAudit(
          tx,
          audit,
          "hr.leave_attendance_synced",
          "attendance",
          row.id,
          `days:${dates.length}`,
        );
      }

      await writeAudit(
        tx,
        audit,
        status === "approved" ? "hr.leave_approved" : "hr.leave_rejected",
        "leave_requests",
        row.id,
        status,
      );
      return toLeaveDto(row);
    });
  }

  async generatePayroll(firmId: string, audit: AuditContext): Promise<PayrollRowDto[]> {
    const rows = await this.computePayrollRows(firmId);
    await database.transaction(async (tx) => {
      await writeAudit(tx, audit, "hr.payroll_generated", "payroll", null, `rows:${rows.length}`);
    });
    return rows;
  }

  async listPayrollRuns(
    firmId: string,
    filters: PayrollRunListInput = {},
  ): Promise<PayrollRunDto[]> {
    const clauses: SQL[] = [eq(payrollRuns.firmId, firmId), isNull(payrollRuns.deletedAt)];
    if (filters.status) clauses.push(eq(payrollRuns.status, filters.status));
    const runs = await database
      .select()
      .from(payrollRuns)
      .where(and(...clauses))
      .orderBy(desc(payrollRuns.periodStart), desc(payrollRuns.createdAt));

    const result: PayrollRunDto[] = [];
    for (const run of runs) {
      const lines = await database
        .select({ id: payrollRunLines.id })
        .from(payrollRunLines)
        .where(
          and(
            eq(payrollRunLines.runId, run.id),
            eq(payrollRunLines.firmId, firmId),
            isNull(payrollRunLines.deletedAt),
          ),
        );
      result.push(toPayrollRunDto(run, lines.length));
    }
    return result;
  }

  async getPayrollRun(
    firmId: string,
    runId: string,
    options: { manage: boolean; viewerUserId: string },
  ): Promise<PayrollRunDto> {
    const [run] = await database
      .select()
      .from(payrollRuns)
      .where(
        and(
          eq(payrollRuns.id, runId),
          eq(payrollRuns.firmId, firmId),
          isNull(payrollRuns.deletedAt),
        ),
      )
      .limit(1);
    if (!run) throw new AppError("NOT_FOUND", "Payroll run not found", 404);
    if (!options.manage && run.status !== "finalized") {
      throw new AppError("NOT_FOUND", "Payroll run not found", 404);
    }

    const lineClauses: SQL[] = [
      eq(payrollRunLines.runId, runId),
      eq(payrollRunLines.firmId, firmId),
      isNull(payrollRunLines.deletedAt),
    ];
    if (!options.manage) lineClauses.push(eq(payrollRunLines.userId, options.viewerUserId));

    const lines = await database
      .select()
      .from(payrollRunLines)
      .where(and(...lineClauses))
      .orderBy(asc(payrollRunLines.name));

    if (!options.manage && lines.length === 0) {
      throw new AppError("NOT_FOUND", "Payroll run not found", 404);
    }

    return {
      ...toPayrollRunDto(run, lines.length),
      lines: lines.map(toPayrollRunLineDto),
    };
  }

  async createPayrollRun(
    firmId: string,
    input: PayrollRunCreateInput,
    actorId: string,
    audit: AuditContext,
  ): Promise<PayrollRunDto> {
    if (input.periodEnd < input.periodStart) {
      throw new AppError("VALIDATION_FAILED", "periodEnd must be on or after periodStart", 400);
    }

    const [existingFinal] = await database
      .select({ id: payrollRuns.id })
      .from(payrollRuns)
      .where(
        and(
          eq(payrollRuns.firmId, firmId),
          eq(payrollRuns.periodStart, input.periodStart),
          eq(payrollRuns.periodEnd, input.periodEnd),
          eq(payrollRuns.status, "finalized"),
          isNull(payrollRuns.deletedAt),
        ),
      )
      .limit(1);
    if (existingFinal) {
      throw new AppError(
        "VALIDATION_FAILED",
        "A finalized payroll run already exists for this period",
        400,
      );
    }

    const rows = await this.computePayrollRows(firmId);
    if (rows.length === 0) {
      throw new AppError(
        "VALIDATION_FAILED",
        "No staff with base salary set — cannot create payroll run",
        400,
      );
    }

    const label = input.label?.trim() || `${input.periodStart.slice(0, 7)} payroll`;

    return database.transaction(async (tx) => {
      // Soft-delete prior drafts for the same period so regenerate is clean.
      await tx
        .update(payrollRuns)
        .set({ deletedAt: audit.occurredAt, updatedAt: audit.occurredAt })
        .where(
          and(
            eq(payrollRuns.firmId, firmId),
            eq(payrollRuns.periodStart, input.periodStart),
            eq(payrollRuns.periodEnd, input.periodEnd),
            eq(payrollRuns.status, "draft"),
            isNull(payrollRuns.deletedAt),
          ),
        );

      const [run] = await returningInsert(
        tx
          .insert(payrollRuns)
          .values({
            firmId,
            periodStart: input.periodStart,
            periodEnd: input.periodEnd,
            label,
            status: "draft",
            generatedBy: actorId,
            createdAt: audit.occurredAt,
            updatedAt: audit.occurredAt,
          })
          .$returningId(),
        (id) => tx.select().from(payrollRuns).where(eq(payrollRuns.id, id)).limit(1),
      );
      if (!run) throw new AppError("INTERNAL_ERROR", "Failed to create payroll run", 500);

      for (const row of rows) {
        await tx.insert(payrollRunLines).values({
          firmId,
          runId: run.id,
          userId: row.userId,
          name: row.name,
          role: row.role,
          gross: row.gross,
          pf: row.pf,
          pfEmployer: row.pfEmployer,
          ssf: row.ssf,
          tax: row.tax,
          net: row.net,
          createdAt: audit.occurredAt,
          updatedAt: audit.occurredAt,
        });
      }

      await writeAudit(
        tx,
        audit,
        "hr.payroll_run_created",
        "payroll_runs",
        run.id,
        `${input.periodStart}:${input.periodEnd}:${rows.length}`,
      );

      return toPayrollRunDto(run, rows.length);
    });
  }

  async finalizePayrollRun(
    firmId: string,
    runId: string,
    actorId: string,
    audit: AuditContext,
  ): Promise<PayrollRunDto> {
    return database.transaction(async (tx) => {
      const [run] = await tx
        .select()
        .from(payrollRuns)
        .where(
          and(
            eq(payrollRuns.id, runId),
            eq(payrollRuns.firmId, firmId),
            isNull(payrollRuns.deletedAt),
          ),
        )
        .limit(1);
      if (!run) throw new AppError("NOT_FOUND", "Payroll run not found", 404);
      if (run.status !== "draft") {
        throw new AppError("VALIDATION_FAILED", "Only draft payroll runs can be finalized", 400);
      }

      const [conflict] = await tx
        .select({ id: payrollRuns.id })
        .from(payrollRuns)
        .where(
          and(
            eq(payrollRuns.firmId, firmId),
            eq(payrollRuns.periodStart, run.periodStart),
            eq(payrollRuns.periodEnd, run.periodEnd),
            eq(payrollRuns.status, "finalized"),
            isNull(payrollRuns.deletedAt),
            ne(payrollRuns.id, runId),
          ),
        )
        .limit(1);
      if (conflict) {
        throw new AppError(
          "VALIDATION_FAILED",
          "A finalized payroll run already exists for this period",
          400,
        );
      }

      const [updated] = await returningMutation(
        tx
          .update(payrollRuns)
          .set({
            status: "finalized",
            finalizedBy: actorId,
            finalizedAt: audit.occurredAt,
            updatedAt: audit.occurredAt,
          })
          .where(eq(payrollRuns.id, runId)),
        () => tx.select().from(payrollRuns).where(eq(payrollRuns.id, runId)),
      );
      if (!updated) throw new AppError("INTERNAL_ERROR", "Failed to finalize payroll run", 500);

      const lines = await tx
        .select({ id: payrollRunLines.id })
        .from(payrollRunLines)
        .where(
          and(
            eq(payrollRunLines.runId, runId),
            eq(payrollRunLines.firmId, firmId),
            isNull(payrollRunLines.deletedAt),
          ),
        );

      await writeAudit(
        tx,
        audit,
        "hr.payroll_run_finalized",
        "payroll_runs",
        runId,
        `lines:${lines.length}`,
      );
      return toPayrollRunDto(updated, lines.length);
    });
  }

  async listPayslips(firmId: string, userId: string): Promise<PayslipDto[]> {
    const rows = await database
      .select({
        run: payrollRuns,
        line: payrollRunLines,
      })
      .from(payrollRunLines)
      .innerJoin(payrollRuns, eq(payrollRunLines.runId, payrollRuns.id))
      .where(
        and(
          eq(payrollRunLines.firmId, firmId),
          eq(payrollRunLines.userId, userId),
          eq(payrollRuns.firmId, firmId),
          eq(payrollRuns.status, "finalized"),
          isNull(payrollRunLines.deletedAt),
          isNull(payrollRuns.deletedAt),
        ),
      )
      .orderBy(desc(payrollRuns.periodStart));

    return rows.map(({ run, line }) => ({
      runId: run.id,
      periodStart: asDateString(run.periodStart as unknown as string | Date),
      periodEnd: asDateString(run.periodEnd as unknown as string | Date),
      label: run.label,
      finalizedAt: run.finalizedAt?.toISOString() ?? null,
      line: toPayrollRunLineDto(line),
    }));
  }

  private async computePayrollRows(firmId: string): Promise<PayrollRowDto[]> {
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

  async setBaseSalary(
    firmId: string,
    input: SetBaseSalaryInput,
    audit: AuditContext,
  ): Promise<{ success: true }> {
    return database.transaction(async (tx) => {
      const [target] = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, input.userId), eq(users.firmId, firmId), isNull(users.deletedAt)))
        .limit(1);
      if (!target) throw new AppError("NOT_FOUND", "User not found in firm", 404);

      await tx
        .update(users)
        .set({
          baseSalary: String(input.baseSalary),
          updatedAt: audit.occurredAt,
        })
        .where(eq(users.id, input.userId));
      await writeAudit(tx, audit, "hr.salary_set", "users", input.userId, String(input.baseSalary));
      return { success: true as const };
    });
  }
}

function toPayrollRunDto(row: typeof payrollRuns.$inferSelect, lineCount: number): PayrollRunDto {
  return {
    id: row.id,
    _id: row.id,
    periodStart: asDateString(row.periodStart as unknown as string | Date),
    periodEnd: asDateString(row.periodEnd as unknown as string | Date),
    label: row.label,
    status: row.status,
    generatedBy: row.generatedBy,
    finalizedBy: row.finalizedBy,
    finalizedAt: row.finalizedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lineCount,
  };
}

function toPayrollRunLineDto(row: typeof payrollRunLines.$inferSelect): PayrollRunLineDto {
  return {
    id: row.id,
    runId: row.runId,
    userId: row.userId,
    name: row.name,
    role: row.role,
    gross: row.gross,
    pf: row.pf,
    pfEmployer: row.pfEmployer,
    ssf: row.ssf,
    tax: row.tax,
    net: row.net,
  };
}
