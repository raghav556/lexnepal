import "server-only";
import type { AuditContext } from "@/server/audit/context";
import type { AuthPrincipal } from "@/server/auth/types";
import {
  requireCapability,
  requireCaseAccess,
  requireFirmContext,
} from "@/server/policies/authorization";
import { PostgresSecurityRepository } from "@/server/repositories/security-repository";
import { PostgresMattersRepository } from "@/server/repositories/matters-repository";
import type {
  ConflictOfficialSearchInput,
  ConflictPreviewInput,
} from "@/shared/contracts/conflicts";
import type {
  CaseCreateInput,
  CaseListInput,
  CaseUpdateInput,
  ClientCreateInput,
  ClientStaffUpdateInput,
  KycReviewInput,
} from "@/shared/contracts/matters";
import { AppError } from "@/shared/errors/api-error";
import { getKycService } from "@/server/services/kyc-service";

const repository = new PostgresMattersRepository();
const security = new PostgresSecurityRepository();

export class MattersService {
  async listClients(principal: AuthPrincipal) {
    requireCapability(principal, "clients.view_all");
    return repository.listClients(requireFirmContext(principal).firmId);
  }

  async getClient(principal: AuthPrincipal, clientId: string) {
    const { firmId } = requireFirmContext(principal);
    const row = await repository.getClient(firmId, clientId, principal.user.role === "client");
    if (!row) throw new AppError("NOT_FOUND", "Client was not found", 404);
    if (principal.user.role === "client" && row.userId !== principal.user.id)
      throw new AppError("NOT_FOUND", "Client was not found", 404);
    if (principal.user.role !== "client") requireCapability(principal, "clients.view_all");
    return row;
  }

  async getMyClient(principal: AuthPrincipal) {
    const { firmId, actorId } = requireFirmContext(principal);
    return repository.getClientByUser(firmId, actorId, true);
  }

  /**
   * Client-safe staff summary for advocates/team on the caller's matters only.
   * Does not require users.view_directory.
   */
  async listMyTeam(principal: AuthPrincipal) {
    const { firmId, actorId } = requireFirmContext(principal);
    if (principal.user.role !== "client") {
      throw new AppError(
        "FORBIDDEN",
        "Only client portal accounts can list their matter team",
        403,
      );
    }
    const client = await repository.getClientByUser(firmId, actorId, false);
    if (!client) return [];
    const matters = await repository.listCases(firmId, { clientId: String(client._id) });
    const staffIds = new Set<string>();
    for (const matter of matters) {
      if (matter.assignedLawyerId) staffIds.add(matter.assignedLawyerId);
      for (const memberId of matter.teamMemberIds || []) staffIds.add(memberId);
    }
    if (staffIds.size === 0) return [];
    return repository.listStaffSummaries(firmId, [...staffIds]);
  }

  async createClient(principal: AuthPrincipal, input: ClientCreateInput, audit: AuditContext) {
    requireCapability(principal, "clients.manage");
    return repository.createClient(requireFirmContext(principal).firmId, input, audit);
  }

  async updateClient(
    principal: AuthPrincipal,
    clientId: string,
    input: ClientStaffUpdateInput,
    audit: AuditContext,
  ) {
    requireCapability(principal, "clients.manage");
    return repository.updateClient(requireFirmContext(principal).firmId, clientId, input, audit);
  }

  /**
   * Grant client portal access: ensure a client-role identity exists, link `clients.userId`,
   * and (re)send the setup email when the account is still pending.
   */
  async grantPortalAccess(principal: AuthPrincipal, clientId: string, audit: AuditContext) {
    requireCapability(principal, "clients.manage");
    const firmId = requireFirmContext(principal).firmId;
    const client = await repository.getClient(firmId, clientId, false);
    if (!client) throw new AppError("NOT_FOUND", "Client was not found", 404);

    const email = typeof client.email === "string" ? client.email.trim() : "";
    if (!email) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Add an email on this CRM client before granting portal access",
        400,
      );
    }

    const fullName = String(client.fullName);
    const phone = typeof client.phone === "string" ? client.phone : null;
    const existingUserId = typeof client.userId === "string" ? client.userId : null;

    const { getIdentityService } = await import("@/server/services/identity-service");
    const identity = getIdentityService();
    const identityRepo = new (
      await import("@/server/repositories/identity-repository")
    ).PostgresIdentityRepository();

    let userId: string | null = existingUserId;
    let created = false;
    let linked = false;

    if (userId) {
      const other = await repository.findOtherClientLinkedToUser(firmId, userId, clientId);
      if (other) {
        throw new AppError(
          "CONFLICT",
          `Portal user is already linked to another client (${other.fullName})`,
          409,
        );
      }
    } else {
      const invited = await identity.inviteOrGetClientIdentity(
        principal,
        {
          name: fullName,
          email,
          phone,
        },
        audit,
      );
      userId = invited.user.id;
      created = invited.created;

      const other = await repository.findOtherClientLinkedToUser(firmId, userId, clientId);
      if (other) {
        throw new AppError(
          "CONFLICT",
          `That email's portal account is already linked to ${other.fullName}`,
          409,
        );
      }

      await repository.updateClient(firmId, clientId, { userId }, audit);
      linked = true;
    }

    const user = await identityRepo.getUser(firmId, userId);
    if (!user) throw new AppError("NOT_FOUND", "Linked portal user was not found", 404);

    // New invites already receive setup mail from provisionLocalIdentity — avoid a duplicate.
    if (!created) {
      await identity.sendPasswordReset(principal, userId, audit);
    }

    return {
      client: await repository.getClient(firmId, clientId, false),
      user,
      created,
      linked,
      inviteSent: true as const,
      alreadyLinked: Boolean(existingUserId) && !linked,
    };
  }

  async updateMyClient(
    principal: AuthPrincipal,
    input: { phone?: string | null; address?: string | null },
    audit: AuditContext,
  ) {
    const { firmId, actorId } = requireFirmContext(principal);
    return repository.updateOwnClient(firmId, actorId, input, audit);
  }

  async listCases(principal: AuthPrincipal, filters: CaseListInput) {
    const { firmId } = requireFirmContext(principal);
    const rows = await repository.listCases(firmId, filters);
    if (principal.capabilities.has("cases.view_all")) return rows;
    if (principal.user.role === "client") {
      const client = await repository.getClientByUser(firmId, principal.user.id, false);
      return client ? rows.filter((row) => row.clientId === client._id) : [];
    }
    return rows.filter(
      (row) =>
        row.assignedLawyerId === principal.user.id || row.teamMemberIds.includes(principal.user.id),
    );
  }

  async getCase(principal: AuthPrincipal, caseId: string, withDetails = false) {
    await requireCaseAccess(principal, caseId, security);
    const row = await repository.getCase(requireFirmContext(principal).firmId, caseId, withDetails);
    if (!row) throw new AppError("NOT_FOUND", "Case was not found", 404);
    return row;
  }

  async createCase(principal: AuthPrincipal, input: CaseCreateInput, audit: AuditContext) {
    requireCapability(principal, "cases.manage");
    return repository.createCase(requireFirmContext(principal).firmId, input, audit);
  }

  async updateCase(
    principal: AuthPrincipal,
    caseId: string,
    input: CaseUpdateInput,
    audit: AuditContext,
  ) {
    requireCapability(principal, "cases.manage");
    await requireCaseAccess(principal, caseId, security);
    return repository.updateCase(requireFirmContext(principal).firmId, caseId, input, audit);
  }

  async searchConflicts(
    principal: AuthPrincipal,
    input: ConflictOfficialSearchInput,
    audit: AuditContext,
  ) {
    requireCapability(principal, "conflicts.manage");
    return repository.searchAndLogConflicts(
      requireFirmContext(principal).firmId,
      input.query,
      audit,
      {
        runByName: principal.user.name ?? principal.user.email ?? "Authorized user",
        scope: input.scope,
        matterContext: input.matterContext,
      },
    );
  }

  async previewConflicts(principal: AuthPrincipal, input: ConflictPreviewInput) {
    requireCapability(principal, "conflicts.manage");
    return repository.previewConflicts(
      requireFirmContext(principal).firmId,
      input.query,
      input.scope,
    );
  }

  async getConflictStats(principal: AuthPrincipal) {
    requireCapability(principal, "conflicts.manage");
    return repository.getConflictStats(requireFirmContext(principal).firmId);
  }

  async listConflictChecks(principal: AuthPrincipal) {
    requireCapability(principal, "conflicts.manage");
    return repository.listConflictChecks(requireFirmContext(principal).firmId);
  }

  async decideConflict(
    principal: AuthPrincipal,
    checkId: string,
    input: { status: "cleared" | "conflict"; notes?: string | null },
    audit: AuditContext,
  ) {
    requireCapability(principal, "conflicts.manage");
    return repository.decideConflictCheck(
      requireFirmContext(principal).firmId,
      checkId,
      input.status,
      input.notes,
      audit,
    );
  }

  async markCaseConflict(
    principal: AuthPrincipal,
    caseId: string,
    cleared: boolean,
    audit: AuditContext,
  ) {
    requireCapability(principal, "conflicts.manage");
    await requireCaseAccess(principal, caseId, security);
    return repository.markCaseConflict(
      requireFirmContext(principal).firmId,
      caseId,
      cleared,
      audit,
    );
  }

  reviewKyc(
    principal: AuthPrincipal,
    clientId: string,
    input: KycReviewInput,
    audit: AuditContext,
  ) {
    return getKycService().review(principal, clientId, input, audit);
  }
}

let service: MattersService | undefined;
export function getMattersService() {
  service ??= new MattersService();
  return service;
}
