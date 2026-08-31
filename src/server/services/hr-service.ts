import "server-only";
import type { AuditContext } from "@/server/audit/context";
import type { AuthPrincipal } from "@/server/auth/types";
import { requireCapability, requireFirmContext } from "@/server/policies/authorization";
import { HrRepository } from "@/server/repositories/hr-repository";
import { notifyLeaveReviewed, notifyLeaveSubmitted } from "@/server/services/hr-notifications";
import type {
  AttendanceListInput,
  AttendanceUpsertInput,
  LeaveBalanceListInput,
  LeaveBalanceUpsertInput,
  LeaveCreateInput,
  LeaveListInput,
  LeaveReviewInput,
  PayrollRunCreateInput,
  PayrollRunListInput,
  SetBaseSalaryInput,
} from "@/shared/contracts/hr";
import { AppError } from "@/shared/errors/api-error";

const STAFF_ROLES = new Set([
  "admin",
  "partner",
  "senior_associate",
  "associate",
  "paralegal",
  "intern",
]);

const repository = new HrRepository();

function requireStaff(principal: AuthPrincipal) {
  if (!STAFF_ROLES.has(principal.user.role)) {
    throw new AppError("FORBIDDEN", "Staff access required", 403);
  }
}

function scopedSelfFilter<T extends { userId?: string }>(principal: AuthPrincipal, filters: T): T {
  if (principal.capabilities.has("hr.manage")) return filters;
  return { ...filters, userId: principal.user.id };
}

export class HrService {
  async listAttendance(principal: AuthPrincipal, filters: AttendanceListInput) {
    requireStaff(principal);
    const { firmId } = requireFirmContext(principal);
    return repository.listAttendance(firmId, scopedSelfFilter(principal, filters));
  }

  async upsertAttendance(
    principal: AuthPrincipal,
    input: AttendanceUpsertInput,
    audit: AuditContext,
  ) {
    requireStaff(principal);
    const { firmId } = requireFirmContext(principal);
    const isSelf = input.userId === principal.user.id;
    if (!isSelf) {
      requireCapability(principal, "hr.manage");
    }
    return repository.upsertAttendance(firmId, input, audit);
  }

  async listLeaveRequests(principal: AuthPrincipal, filters: LeaveListInput) {
    requireStaff(principal);
    const { firmId } = requireFirmContext(principal);
    return repository.listLeaveRequests(firmId, scopedSelfFilter(principal, filters));
  }

  async createLeaveRequest(principal: AuthPrincipal, input: LeaveCreateInput, audit: AuditContext) {
    requireStaff(principal);
    const { firmId } = requireFirmContext(principal);
    const leave = await repository.createLeaveRequest(firmId, principal.user.id, input, audit);
    await notifyLeaveSubmitted({
      firmId,
      actorUserId: principal.user.id,
      actorName: principal.user.name || principal.user.email || "Staff",
      leave,
    });
    return leave;
  }

  async reviewLeaveRequest(principal: AuthPrincipal, input: LeaveReviewInput, audit: AuditContext) {
    requireCapability(principal, "hr.manage");
    const { firmId } = requireFirmContext(principal);
    const leave = await repository.reviewLeaveRequest(
      firmId,
      input.leaveRequestId,
      input.status,
      principal.user.id,
      audit,
    );
    await notifyLeaveReviewed({
      firmId,
      actorUserId: principal.user.id,
      leave,
    });
    return leave;
  }

  async listLeaveBalances(principal: AuthPrincipal, filters: LeaveBalanceListInput) {
    requireStaff(principal);
    const { firmId } = requireFirmContext(principal);
    return repository.listLeaveBalances(firmId, scopedSelfFilter(principal, filters));
  }

  async upsertLeaveBalance(
    principal: AuthPrincipal,
    input: LeaveBalanceUpsertInput,
    audit: AuditContext,
  ) {
    requireCapability(principal, "hr.manage");
    const { firmId } = requireFirmContext(principal);
    return repository.upsertLeaveBalance(firmId, input, audit);
  }

  async generatePayroll(principal: AuthPrincipal, audit: AuditContext) {
    requireCapability(principal, "hr.manage");
    const { firmId } = requireFirmContext(principal);
    return repository.generatePayroll(firmId, audit);
  }

  async listPayrollRuns(principal: AuthPrincipal, filters: PayrollRunListInput = {}) {
    requireCapability(principal, "hr.manage");
    const { firmId } = requireFirmContext(principal);
    return repository.listPayrollRuns(firmId, filters);
  }

  async getPayrollRun(principal: AuthPrincipal, runId: string) {
    requireStaff(principal);
    const { firmId } = requireFirmContext(principal);
    const manage = principal.capabilities.has("hr.manage");
    return repository.getPayrollRun(firmId, runId, {
      manage,
      viewerUserId: principal.user.id,
    });
  }

  async createPayrollRun(
    principal: AuthPrincipal,
    input: PayrollRunCreateInput,
    audit: AuditContext,
  ) {
    requireCapability(principal, "hr.manage");
    const { firmId } = requireFirmContext(principal);
    return repository.createPayrollRun(firmId, input, principal.user.id, audit);
  }

  async finalizePayrollRun(principal: AuthPrincipal, runId: string, audit: AuditContext) {
    requireCapability(principal, "hr.manage");
    const { firmId } = requireFirmContext(principal);
    return repository.finalizePayrollRun(firmId, runId, principal.user.id, audit);
  }

  async listPayslips(principal: AuthPrincipal) {
    requireStaff(principal);
    const { firmId } = requireFirmContext(principal);
    return repository.listPayslips(firmId, principal.user.id);
  }

  async setBaseSalary(principal: AuthPrincipal, input: SetBaseSalaryInput, audit: AuditContext) {
    requireCapability(principal, "hr.manage");
    const { firmId } = requireFirmContext(principal);
    return repository.setBaseSalary(firmId, input, audit);
  }
}

let service: HrService | undefined;
export function getHrService() {
  service ??= new HrService();
  return service;
}
