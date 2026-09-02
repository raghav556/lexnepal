import "server-only";
import { createHash } from "node:crypto";
import type { AuditContext } from "@/server/audit/context";
import type { AuthPrincipal } from "@/server/auth/types";
import { getDatabase } from "@/server/db/client";
import { auditLog } from "@/server/db/schema";
import { getJobRepository } from "@/server/jobs/runtime";
import { requireCaseAccess, requireFirmContext } from "@/server/policies/authorization";
import { CommunicationRepository } from "@/server/repositories/communication-repository";
import { MySqlSecurityRepository } from "@/server/repositories/security-repository";
import type {
  EmailSendInput,
  MessageCreateInput,
  MessageListInput,
  MessageMarkReadInput,
  MessageUnreadInput,
} from "@/shared/contracts/communication";
import { AppError } from "@/shared/errors/api-error";

const repository = new CommunicationRepository();
const security = new MySqlSecurityRepository();
const database = getDatabase();

export class CommunicationService {
  async listMessages(principal: AuthPrincipal, input: MessageListInput) {
    const { firmId } = requireFirmContext(principal);
    await requireCaseAccess(principal, input.caseId, security);
    const page = await repository.listMessages(firmId, {
      ...input,
      includeInternal: principal.user.role !== "client",
    });
    return { page, isDone: true, continueCursor: "" };
  }

  async unreadCounts(principal: AuthPrincipal, input: MessageUnreadInput) {
    const { firmId } = requireFirmContext(principal);
    const allowed: string[] = [];
    for (const caseId of input.caseIds) {
      try {
        await requireCaseAccess(principal, caseId, security);
        allowed.push(caseId);
      } catch {
        // Skip inaccessible matters — do not leak counts.
      }
    }
    return repository.unreadCountsByCase(firmId, principal.user.id, allowed, {
      clientVisibleOnly: principal.user.role === "client",
    });
  }

  async sendMessage(principal: AuthPrincipal, input: MessageCreateInput, audit: AuditContext) {
    const { firmId } = requireFirmContext(principal);
    await requireCaseAccess(principal, input.caseId, security);
    if (input.isInternal && principal.user.role === "client") {
      throw new AppError("FORBIDDEN", "Only staff may send internal messages", 403);
    }
    return repository.createMessage(
      firmId,
      {
        id: principal.user.id,
        name: principal.user.name || principal.user.email || "User",
        role: principal.user.role,
      },
      input,
      audit,
    );
  }

  async markMessagesRead(principal: AuthPrincipal, input: MessageMarkReadInput) {
    const { firmId } = requireFirmContext(principal);
    await requireCaseAccess(principal, input.caseId, security);
    return repository.markMessagesRead(firmId, input.caseId, principal.user.id);
  }

  async listNotifications(principal: AuthPrincipal) {
    const { firmId } = requireFirmContext(principal);
    return repository.listNotifications(firmId, principal.user.id);
  }

  async markNotificationRead(principal: AuthPrincipal, notificationId: string) {
    const { firmId } = requireFirmContext(principal);
    return repository.markNotificationRead(firmId, notificationId, principal.user.id);
  }

  async markAllNotificationsRead(principal: AuthPrincipal) {
    const { firmId } = requireFirmContext(principal);
    return repository.markAllNotificationsRead(firmId, principal.user.id);
  }

  async sendEmail(principal: AuthPrincipal, input: EmailSendInput, audit: AuditContext) {
    if (principal.user.role === "client") {
      throw new AppError("FORBIDDEN", "Clients cannot send outbound firm email", 403);
    }
    const { firmId } = requireFirmContext(principal);
    const digest = createHash("sha256")
      .update(`${input.to}|${input.subject}|${input.body}|${input.relatedId ?? ""}`)
      .digest("hex");
    const { job, created } = await getJobRepository().enqueue({
      firmId,
      actorUserId: principal.user.id,
      type: "communication.email",
      idempotencyKey: `comms.email:${digest}`,
      payload: {
        to: input.to,
        subject: input.subject,
        text: input.body,
      },
      maxAttempts: 5,
      timeoutSeconds: 60,
    });

    await database.insert(auditLog).values({
      firmId: audit.firmId,
      userId: audit.actorId,
      action: "comms.email",
      resource: "email",
      resourceId: input.relatedId ?? job.id,
      details: JSON.stringify({
        to: input.to,
        subject: input.subject,
        provider: "smtp",
        status: "queued_local",
        jobId: job.id,
        created,
        preview: input.body.slice(0, 200),
      }),
      ipAddress: audit.ipAddress,
      requestId: audit.requestId,
      createdAt: audit.occurredAt,
      updatedAt: audit.occurredAt,
    });

    return {
      success: true as const,
      delivered: false,
      jobId: job.id,
      created,
      message: "Email queued for local SMTP delivery (Mailpit in local development).",
    };
  }
}

let service: CommunicationService | undefined;
export function getCommunicationService() {
  service ??= new CommunicationService();
  return service;
}
