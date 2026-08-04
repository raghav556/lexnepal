import "server-only";
import type { AuthPrincipal } from "@/server/auth/types";
import {
  requireCapability,
  requireDocumentAccess,
  requireFirmContext,
} from "@/server/policies/authorization";
import { EnvelopeRepository } from "@/server/repositories/envelope-repository";
import { PostgresSecurityRepository } from "@/server/repositories/security-repository";
import type {
  DocumentMarkViewedInput,
  DocumentRequestSignatureInput,
  DocumentSignInput,
  EnvelopeCreateInput,
  EnvelopeDeclineInput,
  EnvelopeOtpIssueInput,
  EnvelopeOtpVerifyInput,
  EnvelopeVoidInput,
} from "@/shared/contracts/envelopes";

const security = new PostgresSecurityRepository();

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
    const { firmId, actorId } = requireFirmContext(principal);
    await requireDocumentAccess(principal, input.documentId, security);
    return EnvelopeRepository.issueOtp(firmId, actorId, input);
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
