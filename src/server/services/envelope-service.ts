import "server-only";
import type { AuthPrincipal } from "@/server/auth/types";
import {
  requireCapability,
  requireDocumentAccess,
  requireFirmContext,
} from "@/server/policies/authorization";
import { EnvelopeRepository } from "@/server/repositories/envelope-repository";
import { MySqlSecurityRepository } from "@/server/repositories/security-repository";
import { isSmtpConfigured } from "@/server/env";
import { getSignatureArtifactService } from "@/server/services/signature-artifact-service";
import { AppError } from "@/shared/errors/api-error";
import type {
  DocumentMarkViewedInput,
  DocumentRequestSignatureInput,
  DocumentSignInput,
  EnvelopeCreateInput,
  EnvelopeDeclineInput,
  EnvelopeOtpIssueInput,
  EnvelopeOtpVerifyInput,
  EnvelopeVoidInput,
  SignatureArtifactIntentInput,
} from "@/shared/contracts/envelopes";

const security = new MySqlSecurityRepository();

export class EnvelopeService {
  async listSigners(principal: AuthPrincipal) {
    requireCapability(principal, "documents.share");
    const { firmId } = requireFirmContext(principal);
    return EnvelopeRepository.listPortalSigners(firmId);
  }

  async list(principal: AuthPrincipal) {
    requireCapability(principal, "documents.share");
    const { firmId } = requireFirmContext(principal);
    return EnvelopeRepository.listEnvelopes(firmId);
  }

  async listMyPending(principal: AuthPrincipal) {
    const { firmId, actorId } = requireFirmContext(principal);
    return EnvelopeRepository.listMyPendingActions(firmId, actorId);
  }

  async listSigningInbox(principal: AuthPrincipal) {
    requireCapability(principal, "documents.read");
    const { firmId, actorId } = requireFirmContext(principal);
    const inbox = await EnvelopeRepository.listSigningInbox(firmId, actorId);
    const documentIds = new Set([
      ...inbox.pendingEnvelopes.map((action) => action.document?.id),
      ...inbox.pendingDirect.map((action) => action.document.id),
      ...inbox.recentlySigned.map((action) => action.document.id),
    ]);
    const authorized = new Set<string>();
    for (const documentId of documentIds) {
      if (!documentId) continue;
      try {
        await requireDocumentAccess(principal, documentId, security);
        authorized.add(documentId);
      } catch (error) {
        if (!(error instanceof AppError) || !["FORBIDDEN", "NOT_FOUND"].includes(error.code))
          throw error;
      }
    }
    return {
      pendingEnvelopes: inbox.pendingEnvelopes.filter(
        (action) => action.document && authorized.has(action.document.id),
      ),
      pendingDirect: inbox.pendingDirect.filter((action) => authorized.has(action.document.id)),
      recentlySigned: inbox.recentlySigned.filter((action) => authorized.has(action.document.id)),
    };
  }

  async create(principal: AuthPrincipal, input: EnvelopeCreateInput) {
    requireCapability(principal, "documents.share");
    await requireDocumentAccess(principal, input.documentId, security);
    const { firmId, actorId } = requireFirmContext(principal);
    return EnvelopeRepository.createEnvelope(firmId, input, actorId);
  }

  async send(principal: AuthPrincipal, envelopeId: string) {
    requireCapability(principal, "documents.share");
    const { firmId } = requireFirmContext(principal);
    return EnvelopeRepository.sendEnvelope(firmId, envelopeId);
  }

  async void(principal: AuthPrincipal, envelopeId: string, input: EnvelopeVoidInput) {
    requireCapability(principal, "documents.share");
    const { firmId } = requireFirmContext(principal);
    return EnvelopeRepository.voidEnvelope(firmId, envelopeId, input.reason);
  }

  async expire(principal: AuthPrincipal, envelopeId: string) {
    requireCapability(principal, "documents.share");
    const { firmId } = requireFirmContext(principal);
    return EnvelopeRepository.expireEnvelope(firmId, envelopeId);
  }

  async remind(principal: AuthPrincipal, envelopeId: string) {
    requireCapability(principal, "documents.share");
    const { firmId } = requireFirmContext(principal);
    return EnvelopeRepository.remindEnvelope(firmId, envelopeId);
  }

  async decline(principal: AuthPrincipal, envelopeId: string, input: EnvelopeDeclineInput) {
    const { firmId, actorId } = requireFirmContext(principal);
    return EnvelopeRepository.declineEnvelope(firmId, envelopeId, actorId, input.reason);
  }

  async issueOtp(principal: AuthPrincipal, input: EnvelopeOtpIssueInput) {
    if (!isSmtpConfigured())
      throw new AppError("SERVICE_UNAVAILABLE", "Verification delivery is unavailable", 503);
    const { firmId, actorId } = requireFirmContext(principal);
    await requireDocumentAccess(principal, input.documentId, security);
    return EnvelopeRepository.issueOtp(firmId, actorId, input);
  }

  async createSignatureArtifactIntent(
    principal: AuthPrincipal,
    input: SignatureArtifactIntentInput,
  ) {
    await requireDocumentAccess(principal, input.documentId, security);
    return getSignatureArtifactService().createIntent(principal, input);
  }

  async completeSignatureArtifactIntent(principal: AuthPrincipal, intentId: string) {
    return getSignatureArtifactService().completeIntent(principal, intentId);
  }

  async getSignatureArtifactIntent(principal: AuthPrincipal, intentId: string) {
    return getSignatureArtifactService().getIntentStatus(principal, intentId);
  }

  async verifyOtp(principal: AuthPrincipal, input: EnvelopeOtpVerifyInput) {
    const { firmId, actorId } = requireFirmContext(principal);
    return EnvelopeRepository.verifyOtp(firmId, actorId, input);
  }

  async requestSignature(principal: AuthPrincipal, input: DocumentRequestSignatureInput) {
    requireCapability(principal, "documents.share");
    await requireDocumentAccess(principal, input.documentId, security);
    const { firmId } = requireFirmContext(principal);
    return EnvelopeRepository.requestSignature(
      firmId,
      input.documentId,
      input.intendedSignerUserId,
    );
  }

  async markViewed(principal: AuthPrincipal, input: DocumentMarkViewedInput) {
    const { firmId, actorId } = requireFirmContext(principal);
    await requireDocumentAccess(principal, input.documentId, security);
    return EnvelopeRepository.markDocumentViewed(firmId, input.documentId, actorId);
  }

  async sign(principal: AuthPrincipal, input: DocumentSignInput) {
    const { firmId, actorId } = requireFirmContext(principal);
    await requireDocumentAccess(principal, input.documentId, security);
    return EnvelopeRepository.signDocument(firmId, actorId, input);
  }
}

let service: EnvelopeService | undefined;
export function getEnvelopeService() {
  service ??= new EnvelopeService();
  return service;
}
