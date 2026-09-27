import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { useIssueOtp } from "@/client/queries/envelopes";
import {
  pendingSigningActions,
  signedActionKey,
  visibleSignedActions,
  type SigningInbox,
} from "@/views/client/signing-presentation";

const pdfText: string[] = [];
const savedNames: string[] = [];
vi.mock("jspdf", () => ({
  default: class {
    setFontSize() {}
    setFont() {}
    setTextColor() {}
    text(value: string) {
      pdfText.push(value);
    }
    splitTextToSize(value: string) {
      return [value];
    }
    save(name: string) {
      savedNames.push(name);
    }
  },
}));

import { generateSignatureEventSummaryPDF } from "@/lib/pdf-generator";

type OtpIssueResult = Awaited<ReturnType<ReturnType<typeof useIssueOtp>>>;
const otpResultHasNoDemoCode: "demoCode" extends keyof OtpIssueResult ? false : true = true;

const document = (id: string, title = id) => ({
  id,
  _id: id,
  title,
  mimeType: "application/pdf",
});

describe("CUI-14 signer action presentation", () => {
  it("retains one server-authorized pending action with its envelope context", () => {
    const inbox: SigningInbox = {
      pendingEnvelopes: [
        {
          kind: "envelope",
          envelopeId: "envelope-a",
          recipientId: "recipient-a",
          envelopeTitle: "Engagement",
          routing: "parallel",
          order: 0,
          expiresAt: "2026-10-20T00:00:00.000Z",
          document: document("doc-a"),
        },
      ],
      pendingDirect: [{ kind: "direct", document: document("doc-b") }],
      recentlySigned: [],
    };
    const pending = pendingSigningActions(inbox);
    expect(pending).toHaveLength(2);
    expect(pending[0]).toMatchObject({
      kind: "envelope",
      envelopeId: "envelope-a",
      recipientId: "recipient-a",
      routing: "parallel",
      document: { id: "doc-a" },
    });
    expect(pending[1]).toMatchObject({ kind: "direct", document: { id: "doc-b" } });
    expect(pending.filter((action) => action.document.id === "doc-a")).toHaveLength(1);
  });

  it("suppresses document-level history when an envelope event exists but preserves distinct envelopes", () => {
    const inbox: SigningInbox = {
      pendingEnvelopes: [],
      pendingDirect: [],
      recentlySigned: [
        { kind: "direct", document: document("doc-a") },
        { kind: "envelope", envelopeId: "envelope-1", document: document("doc-a") },
        { kind: "envelope", envelopeId: "envelope-2", document: document("doc-a") },
        { kind: "direct", document: document("doc-b") },
      ],
    };
    const history = visibleSignedActions(inbox);
    expect(history).toHaveLength(3);
    expect(history.filter((action) => action.document.id === "doc-a")).toHaveLength(2);
    expect(history.map(signedActionKey)).toEqual(
      expect.arrayContaining(["envelope-1:doc-a", "envelope-2:doc-a", "direct:doc-b"]),
    );
  });

  it("does not advertise a browser-returned demo OTP in the client response type", () => {
    expect(otpResultHasNoDemoCode).toBe(true);
  });

  it("creates a neutral browser summary and omits unavailable envelope event fields", () => {
    pdfText.length = 0;
    savedNames.length = 0;
    generateSignatureEventSummaryPDF({
      title: "NDA Agreement.pdf",
      signedAt: "2026-09-20T10:00:00.000Z",
      signerName: "Synthetic Client",
    });
    expect(pdfText).toContain("Signature Event Summary");
    expect(pdfText).not.toContain("Certificate of Completion");
    expect(pdfText).not.toContain("Method:");
    expect(pdfText).not.toContain("Consent version:");
    expect(pdfText.join(" ")).not.toContain("SHA-256");
    expect(savedNames).toEqual(["signature-event-summary.pdf"]);
  });

  it("preserves the exact pre-existing consent wording and version", () => {
    const source = readFileSync("src/views/client/ClientSignaturesPage.tsx", "utf8").replace(
      /\s+/g,
      " ",
    );
    expect(source).toContain(
      "I have reviewed this document and consent to record my legally binding electronic acknowledgment (consent version esign-consent-v1). A cryptographic SHA-256 integrity fingerprint will be stored with this record.",
    );
  });

  it("keeps only one root dialog and the secured client routes", () => {
    const source = readFileSync("src/views/client/ClientSignaturesPage.tsx", "utf8");
    expect(source.match(/<Dialog\s/g)).toHaveLength(1);
    expect(source).toContain("pendingSigningActions(inbox)");
    expect(source).toContain("visibleSignedActions(inbox)");
    expect(source).toContain("/api/v1/envelopes/signature-artifact-intents");
    expect(source).not.toContain("documentSha256:");
    expect(source).not.toContain("demoCode");
    expect(source).toContain('accept="image/png,image/jpeg"');
    expect(source).not.toMatch(
      /Verified certificates|verified completion certificates|signature vault/,
    );
  });
});
