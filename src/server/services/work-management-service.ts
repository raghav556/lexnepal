import "server-only";
import type { AuditContext } from "@/server/audit/context";
import type { AuthPrincipal } from "@/server/auth/types";
import { requireCapability, requireCaseAccess, requireFirmContext } from "@/server/policies/authorization";
import { PostgresSecurityRepository } from "@/server/repositories/security-repository";
import { PostgresWorkManagementRepository } from "@/server/repositories/work-management-repository";
import type {
  HearingCreateInput,
  HearingListInput,
  HearingUpdateInput,
  HearingPrepInput,
  ResearchCreateInput,
  ResearchUpdateInput,
  SopCreateInput,
  SopRunInput,
  TaskCommentCreateInput,
  TaskCreateInput,
  TaskListInput,
  TaskUpdateInput,
} from "@/shared/contracts/work-management";
import { AppError } from "@/shared/errors/api-error";

const repository = new PostgresWorkManagementRepository();
const security = new PostgresSecurityRepository();

export class WorkManagementService {
  // ── Hearings ────────────────────────────────────────────────────────────────

  async listHearings(principal: AuthPrincipal, filters: HearingListInput) {
    const { firmId } = requireFirmContext(principal);
    if (filters.caseId) await requireCaseAccess(principal, filters.caseId, security);
    return repository.listHearings(firmId, filters);
  }

  async getHearing(principal: AuthPrincipal, hearingId: string) {
    const { firmId } = requireFirmContext(principal);
    const row = await repository.getHearing(firmId, hearingId);
    if (!row) throw new AppError("NOT_FOUND", "Hearing was not found", 404);
    await requireCaseAccess(principal, row.caseId as string, security);
    return row;
  }

  async createHearing(principal: AuthPrincipal, input: HearingCreateInput, audit: AuditContext) {
    requireCapability(principal, "cases.manage");
    await requireCaseAccess(principal, input.caseId, security);
    return repository.createHearing(requireFirmContext(principal).firmId, input, audit);
  }

  async updateHearing(principal: AuthPrincipal, hearingId: string, input: HearingUpdateInput, audit: AuditContext) {
    requireCapability(principal, "cases.manage");
    const { firmId } = requireFirmContext(principal);
    const existing = await repository.getHearing(firmId, hearingId);
    if (!existing) throw new AppError("NOT_FOUND", "Hearing was not found", 404);
    await requireCaseAccess(principal, existing.caseId as string, security);
    return repository.updateHearing(firmId, hearingId, input, audit);
  }

  // ── Tasks ───────────────────────────────────────────────────────────────────

  async listTasks(principal: AuthPrincipal, filters: TaskListInput) {
    const { firmId } = requireFirmContext(principal);
    const rows = await repository.listTasks(firmId, filters);
    if (principal.capabilities.has("cases.view_all")) return rows;
    if (principal.user.role === "client") {
      const clientRecord = await security.getClientByUser(principal.user.id);
      if (!clientRecord) return [];
      return rows.filter((r) => r.clientVisible && r.caseId);
    }
    return rows.filter(
      (r) => r.assignedTo === principal.user.id || (r.watchers as string[]).includes(principal.user.id),
    );
  }

  async getTask(principal: AuthPrincipal, taskId: string) {
    const { firmId } = requireFirmContext(principal);
    const row = await repository.getTask(firmId, taskId);
    if (!row) throw new AppError("NOT_FOUND", "Task was not found", 404);
    return row;
  }

  async createTask(principal: AuthPrincipal, input: TaskCreateInput, audit: AuditContext) {
    requireCapability(principal, "cases.manage");
    if (input.caseId) await requireCaseAccess(principal, input.caseId, security);
    return repository.createTask(requireFirmContext(principal).firmId, input, audit);
  }

  async updateTask(principal: AuthPrincipal, taskId: string, input: TaskUpdateInput, audit: AuditContext) {
    requireCapability(principal, "cases.manage");
    return repository.updateTask(requireFirmContext(principal).firmId, taskId, input, audit);
  }

  async archiveTask(principal: AuthPrincipal, taskId: string, audit: AuditContext) {
    requireCapability(principal, "cases.manage");
    return repository.archiveTask(requireFirmContext(principal).firmId, taskId, audit);
  }

  async restoreTask(principal: AuthPrincipal, taskId: string, audit: AuditContext) {
    requireCapability(principal, "cases.manage");
    return repository.restoreTask(requireFirmContext(principal).firmId, taskId, audit);
  }

  async deleteTask(principal: AuthPrincipal, taskId: string, audit: AuditContext) {
    requireCapability(principal, "cases.manage");
    return repository.deleteTask(requireFirmContext(principal).firmId, taskId, audit);
  }

  async listWorkload(principal: AuthPrincipal) {
    requireCapability(principal, "cases.view_all");
    return repository.listWorkload(requireFirmContext(principal).firmId);
  }

  // ── SOP Templates ────────────────────────────────────────────────────────────

  async listSopTemplates(principal: AuthPrincipal, practiceArea?: string) {
    const { firmId } = requireFirmContext(principal);
    return repository.listSopTemplates(firmId, practiceArea);
  }

  async createSopTemplate(principal: AuthPrincipal, input: SopCreateInput, audit: AuditContext) {
    requireCapability(principal, "cases.manage");
    return repository.createSopTemplate(requireFirmContext(principal).firmId, input, audit);
  }

  async runSop(principal: AuthPrincipal, input: SopRunInput, audit: AuditContext) {
    requireCapability(principal, "cases.manage");
    await requireCaseAccess(principal, input.caseId, security);
    return repository.runSop(requireFirmContext(principal).firmId, input, audit);
  }

  async createHearingPrepTasks(principal: AuthPrincipal, input: HearingPrepInput, audit: AuditContext) {
    requireCapability(principal, "cases.manage");
    return repository.createHearingPrepTasks(requireFirmContext(principal).firmId, input, audit);
  }

  // ── Task Comments ────────────────────────────────────────────────────────────

  async listComments(principal: AuthPrincipal, taskId: string) {
    const { firmId } = requireFirmContext(principal);
    return repository.listComments(firmId, taskId);
  }

  async addComment(principal: AuthPrincipal, input: TaskCommentCreateInput, audit: AuditContext) {
    return repository.addComment(requireFirmContext(principal).firmId, input, audit);
  }

  // ── Research Notes ───────────────────────────────────────────────────────────

  async listResearchNotes(principal: AuthPrincipal) {
    return repository.listResearchNotes(requireFirmContext(principal).firmId);
  }

  async getResearchNote(principal: AuthPrincipal, noteId: string) {
    const { firmId } = requireFirmContext(principal);
    const row = await repository.getResearchNote(firmId, noteId);
    if (!row) throw new AppError("NOT_FOUND", "Research note was not found", 404);
    return row;
  }

  async createResearchNote(principal: AuthPrincipal, input: ResearchCreateInput, audit: AuditContext) {
    requireCapability(principal, "cases.manage");
    return repository.createResearchNote(requireFirmContext(principal).firmId, input, audit);
  }

  async updateResearchNote(principal: AuthPrincipal, noteId: string, input: ResearchUpdateInput, audit: AuditContext) {
    requireCapability(principal, "cases.manage");
    return repository.updateResearchNote(requireFirmContext(principal).firmId, noteId, input, audit);
  }

  async deleteResearchNote(principal: AuthPrincipal, noteId: string, audit: AuditContext) {
    requireCapability(principal, "cases.manage");
    return repository.deleteResearchNote(requireFirmContext(principal).firmId, noteId, audit);
  }

  async scanOverdueReminders(principal: AuthPrincipal, audit: AuditContext) {
    requireCapability(principal, "cases.manage");
    return repository.scanOverdueReminders(requireFirmContext(principal).firmId, audit);
  }
}

let service: WorkManagementService | undefined;
export function getWorkManagementService() {
  service ??= new WorkManagementService();
  return service;
}
