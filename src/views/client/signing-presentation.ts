/** Client-only view of the signer-scoped inbox. No document or signer authority is inferred here. */
export type SigningDocument = {
  _id: string;
  id: string;
  title: string;
  mimeType: string;
  sizeBytes?: number;
  signedAt?: string | null;
  signatureMethod?: "draw" | "type" | "upload" | null;
  signConsentVersion?: string | null;
};

export type PendingSigningAction =
  | {
      kind: "envelope";
      envelopeId: string;
      recipientId: string;
      envelopeTitle: string;
      routing: "sequential" | "parallel";
      order: number;
      expiresAt?: string;
      document: SigningDocument;
    }
  | { kind: "direct"; document: SigningDocument };

export type SignedSigningAction =
  | { kind: "envelope"; envelopeId: string; document: SigningDocument }
  | { kind: "direct"; document: SigningDocument };

export type SigningInbox = {
  pendingEnvelopes: Extract<PendingSigningAction, { kind: "envelope" }>[];
  pendingDirect: Extract<PendingSigningAction, { kind: "direct" }>[];
  recentlySigned: SignedSigningAction[];
};

export function pendingSigningActions(inbox?: SigningInbox): PendingSigningAction[] {
  if (!inbox) return [];
  // The authorized server inbox already suppresses direct/envelope overlap.
  return [...inbox.pendingEnvelopes, ...inbox.pendingDirect];
}

export function visibleSignedActions(inbox?: SigningInbox): SignedSigningAction[] {
  if (!inbox) return [];
  const envelopedDocuments = new Set(
    inbox.recentlySigned
      .filter((action) => action.kind === "envelope")
      .map((action) => action.document.id),
  );
  return inbox.recentlySigned
    .filter((action) => action.kind === "envelope" || !envelopedDocuments.has(action.document.id))
    .sort((a, b) => {
      const aDate = a.document.signedAt ? Date.parse(a.document.signedAt) : 0;
      const bDate = b.document.signedAt ? Date.parse(b.document.signedAt) : 0;
      return bDate - aDate;
    });
}

export function signedActionKey(action: SignedSigningAction): string {
  return action.kind === "envelope"
    ? `${action.envelopeId}:${action.document.id}`
    : `direct:${action.document.id}`;
}
