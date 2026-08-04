import "server-only";
import type { AuthPrincipal } from "@/server/auth/types";
import { requireFirmContext } from "@/server/policies/authorization";
import { HrRepository } from "@/server/repositories/hr-repository";
import type {
  AttendanceListInput,
  AttendanceUpsertInput,
  LeaveCreateInput,
  LeaveListInput,
  LeaveReviewInput,
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

function requireAdmin(principal: AuthPrincipal) {
  if (principal.user.role !== "admin") {
    throw new AppError("FORBIDDEN", "Admin access required", 403);
  }
}

export class HrService {
  async listAttendance(principal: AuthPrincipal, filters: AttendanceListInput) {
    requireStaff(principal);
    const { firmId } = requireFirmContext(principal);
    return repository.listAttendance(firmId, filters);
  }

  async upsertAttendance(principal: AuthPrincipal, input: AttendanceUpsertInput) {
    requireStaff(principal);
    const { firmId } = requireFirmContext(principal);
    return repository.upsertAttendance(firmId, input);
  }

  async listLeaveRequests(principal: AuthPrincipal, filters: LeaveListInput) {
    requireStaff(principal);
    const { firmId } = requireFirmContext(principal);
    return repository.listLeaveRequests(firmId, filters);
  }

  async createLeaveRequest(principal: AuthPrincipal, input: LeaveCreateInput) {
    requireStaff(principal);
    const { firmId } = requireFirmContext(principal);
    return repository.createLeaveRequest(firmId, principal.user.id, input);
  }

  async reviewLeaveRequest(principal: AuthPrincipal, input: LeaveReviewInput) {
    requireAdmin(principal);
    const { firmId } = requireFirmContext(principal);
    return repository.reviewLeaveRequest(
      firmId,
      input.leaveRequestId,
      input.status,
      principal.user.id,
    );
  }

  async generatePayroll(principal: AuthPrincipal) {
    requireAdmin(principal);
    const { firmId } = requireFirmContext(principal);
    return repository.generatePayroll(firmId);
  }

  async setBaseSalary(principal: AuthPrincipal, input: SetBaseSalaryInput) {
    requireAdmin(principal);
    const { firmId } = requireFirmContext(principal);
    return repository.setBaseSalary(firmId, input);
  }
}

let service: HrService | undefined;
export function getHrService() {
  service ??= new HrService();
  return service;
}
