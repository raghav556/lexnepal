import "server-only";
import type { AuditContext } from "@/server/audit/context";
import type { AuthPrincipal } from "@/server/auth/types";
import { requireFirmContext } from "@/server/policies/authorization";
import { DmRepository } from "@/server/repositories/dm-repository";
import type {
  DmMessageCreateInput,
  DmMessageListInput,
  DmThreadCreateInput,
} from "@/shared/contracts/dm";
import { AppError } from "@/shared/errors/api-error";

const STAFF_ROLES = new Set([
  "partner",
  "senior_associate",
  "associate",
  "paralegal",
  "intern",
  "admin",
]);

const repository = new DmRepository();

function requireStaff(principal: AuthPrincipal) {
  if (!STAFF_ROLES.has(principal.user.role)) {
    throw new AppError("FORBIDDEN", "Only staff may use team DMs", 403);
  }
}

export class DmService {
  async listThreads(principal: AuthPrincipal) {
    requireStaff(principal);
    const { firmId } = requireFirmContext(principal);
    return repository.listThreads(firmId, principal.user.id);
  }

  async getOrCreateThread(principal: AuthPrincipal, input: DmThreadCreateInput) {
    requireStaff(principal);
    const { firmId } = requireFirmContext(principal);
    return repository.getOrCreateThread(firmId, principal.user.id, input.peerUserId);
  }

  async listMessages(principal: AuthPrincipal, threadId: string, input: DmMessageListInput) {
    requireStaff(principal);
    const { firmId } = requireFirmContext(principal);
    await repository.requireThreadAccess(firmId, threadId, principal.user.id);
    const page = await repository.listMessages(firmId, threadId, input.limit ?? 50);
    return { page, isDone: true, continueCursor: "" };
  }

  async sendMessage(
    principal: AuthPrincipal,
    threadId: string,
    input: DmMessageCreateInput,
    audit: AuditContext,
  ) {
    requireStaff(principal);
    const { firmId } = requireFirmContext(principal);
    await repository.requireThreadAccess(firmId, threadId, principal.user.id);
    return repository.createMessage(
      firmId,
      threadId,
      {
        id: principal.user.id,
        name: principal.user.name || principal.user.email || "Staff",
      },
      input,
      audit,
    );
  }

  async markRead(principal: AuthPrincipal, threadId: string) {
    requireStaff(principal);
    const { firmId } = requireFirmContext(principal);
    await repository.requireThreadAccess(firmId, threadId, principal.user.id);
    return repository.markThreadRead(firmId, threadId, principal.user.id);
  }
}

let service: DmService | undefined;
export function getDmService() {
  service ??= new DmService();
  return service;
}
