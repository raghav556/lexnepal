import "server-only";
import { AppError } from "@/shared/errors/api-error";
import type { AuthPrincipal, Capability } from "@/server/auth/types";

export interface CaseAccessRecord {
  id: string;
  firmId: string;
  clientId: string;
  assignedLawyerId: string;
  teamMemberIds: readonly string[];
}

export interface ClientAccessRecord {
  id: string;
  firmId: string;
  userId: string | null;
}

export interface DocumentAccessRecord {
  id: string;
  firmId: string;
  caseId: string | null;
  uploadedBy: string;
  intendedSignerUserId: string | null;
  isTemplate: boolean;
  isPrivileged: boolean;
  confidentialityLevel: "public" | "internal" | "confidential" | "privileged";
  deletedAt: Date | null;
}

export interface AuthorizationDataSource {
  getCase(caseId: string): Promise<CaseAccessRecord | null>;
  getClient(clientId: string): Promise<ClientAccessRecord | null>;
  getClientByUser(userId: string): Promise<ClientAccessRecord | null>;
  getDocument(documentId: string): Promise<DocumentAccessRecord | null>;
}

export function requireFirmContext(principal: AuthPrincipal): { firmId: string; actorId: string } {
  if (!principal.firmId || principal.user.firmId !== principal.firmId) {
    throw new AppError("FORBIDDEN", "A valid firm context is required", 403);
  }
  return { firmId: principal.firmId, actorId: principal.user.id };
}

export function requireCapability(principal: AuthPrincipal, capability: Capability): AuthPrincipal {
  if (!principal.capabilities.has(capability)) {
    throw new AppError("FORBIDDEN", `Access denied: missing permission ${capability}`, 403);
  }
  return principal;
}

export function requireSameFirm(principal: AuthPrincipal, resourceFirmId: string): void {
  const { firmId } = requireFirmContext(principal);
  if (resourceFirmId !== firmId) {
    throw new AppError("FORBIDDEN", "Cross-firm access is denied", 403);
  }
}

export async function requireClientOwnership(
  principal: AuthPrincipal,
  clientId: string,
  source: AuthorizationDataSource,
): Promise<ClientAccessRecord> {
  const client = await source.getClient(clientId);
  if (!client) throw new AppError("NOT_FOUND", "Client was not found", 404);
  if (client.firmId !== principal.firmId)
    throw new AppError("NOT_FOUND", "Client was not found", 404);
  if (client.userId !== principal.user.id) {
    throw new AppError("FORBIDDEN", "The client account does not own this record", 403);
  }
  return client;
}

export async function requireCaseAccess(
  principal: AuthPrincipal,
  caseId: string,
  source: AuthorizationDataSource,
): Promise<CaseAccessRecord> {
  const matter = await source.getCase(caseId);
  if (!matter) throw new AppError("NOT_FOUND", "Case was not found", 404);
  if (matter.firmId !== principal.firmId)
    throw new AppError("NOT_FOUND", "Case was not found", 404);
  if (principal.capabilities.has("cases.view_all")) return matter;
  if (
    matter.assignedLawyerId === principal.user.id ||
    matter.teamMemberIds.includes(principal.user.id)
  ) {
    return matter;
  }
  if (principal.user.role === "client") {
    const client = await source.getClientByUser(principal.user.id);
    if (client && client.id === matter.clientId && client.firmId === principal.firmId)
      return matter;
  }
  throw new AppError("FORBIDDEN", "Access to this case is denied", 403);
}

export async function requireDocumentAccess(
  principal: AuthPrincipal,
  documentId: string,
  source: AuthorizationDataSource,
): Promise<DocumentAccessRecord> {
  requireCapability(principal, "documents.read");
  const document = await source.getDocument(documentId);
  if (!document) throw new AppError("NOT_FOUND", "Document was not found", 404);
  if (document.firmId !== principal.firmId)
    throw new AppError("NOT_FOUND", "Document was not found", 404);
  if (document.deletedAt) throw new AppError("NOT_FOUND", "Document was not found", 404);

  if (document.isPrivileged && !["admin", "partner"].includes(principal.user.role)) {
    throw new AppError("FORBIDDEN", "Privileged document access is restricted", 403);
  }
  if (principal.user.role !== "client") return document;
  if (document.isTemplate || ["internal", "privileged"].includes(document.confidentialityLevel)) {
    throw new AppError("FORBIDDEN", "Access to this document is denied", 403);
  }
  if (
    document.uploadedBy === principal.user.id ||
    document.intendedSignerUserId === principal.user.id
  ) {
    return document;
  }
  if (document.caseId) {
    await requireCaseAccess(principal, document.caseId, source);
    return document;
  }
  throw new AppError("FORBIDDEN", "Access to this document is denied", 403);
}
