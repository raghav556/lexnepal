/** CUI-13 Client Identity Verification contract and frozen-scope guard. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getVerificationWorkflowStages } from "@/views/client/ClientKYCOnboarding";

const page = readFileSync("src/views/client/ClientKYCOnboarding.tsx", "utf8");
const contracts = readFileSync("src/shared/contracts/matters.ts", "utf8");
const queries = readFileSync("src/client/queries/clients.ts", "utf8");
const kycService = readFileSync("src/server/services/kyc-service.ts", "utf8");
const nav = readFileSync("src/lib/client-shell-nav.ts", "utf8");
const fixture = readFileSync("scripts/e2e/seed-e2e-client-ui-preview.ts", "utf8");
const home = readFileSync("src/views/client/ClientDashboard.tsx", "utf8");
const booking = readFileSync("src/views/client/ClientBookingPage.tsx", "utf8");

describe("CUI-13 Client Identity Verification contract", () => {
  it("renders the Client workspace with the locked desktop and mobile navigation mapping", () => {
    expect(page).toContain('title="Identity Verification"');
    expect(page).toContain('data-testid="client-identity-workspace"');
    expect(nav).toContain('if (matchesPath(path, "/client/kyc")) return "identity-verification"');
    expect(nav).toContain('default:\n      return "more"');
  });

  it("uses only real KYC statuses, requirements, and submission fields", () => {
    expect(contracts).toContain('z.enum(["pending", "submitted", "verified", "rejected"])');
    expect(page).toContain('type DocType = "government_id" | "proof_of_address"');
    expect(page).toContain("Government-issued ID");
    expect(page).toContain("Proof of address");
    expect(page).not.toContain("Passport-size Photo");
    expect(page).not.toContain("last 3 months");
    expect(page).not.toContain("Residential Address in Nepal");
    expect(page).toContain('htmlFor="kyc-address"');
    expect(page).toContain('htmlFor="kyc-id-number"');
  });

  it("maps persisted KYC statuses to truthful workflow-stage semantics", () => {
    expect(getVerificationWorkflowStages("pending").map((stage) => stage.state)).toEqual([
      "current",
      "upcoming",
      "upcoming",
      "upcoming",
    ]);
    expect(getVerificationWorkflowStages("submitted").map((stage) => stage.state)).toEqual([
      "complete",
      "complete",
      "complete",
      "current",
    ]);
    expect(getVerificationWorkflowStages("rejected").map((stage) => stage.state)).toEqual([
      "complete",
      "complete",
      "complete",
      "attention",
    ]);
    expect(
      getVerificationWorkflowStages("verified").every((stage) => stage.state === "complete"),
    ).toBe(true);
  });

  it("keeps the real upload-intent and scanning path with its MIME and size boundary", () => {
    expect(page).toContain("commands.uploadKycFile");
    expect(page).toContain(".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png");
    expect(page).toContain("25 * 1024 * 1024");
    expect(contracts).toContain('z.enum(["application/pdf", "image/jpeg", "image/png"])');
    expect(contracts).toContain(".max(25 * 1024 * 1024)");
    expect(queries).toContain('"/api/v1/clients/me/kyc-upload-intents"');
    expect(queries).toContain("waitForCleanIntent");
    expect(kycService).toContain('intent.status !== "promoted"');
  });

  it("preserves Client ownership and review security boundaries", () => {
    expect(kycService).toContain("requireOwnClient(firmId, actorId)");
    expect(kycService).toContain("intent.userId !== actorId");
    expect(kycService).toContain('principal.user.role === "client"');
    expect(kycService).toContain('requireCapability(principal, "kyc.review")');
    expect(kycService).toContain('client.kycStatus === "verified"');
    expect(page).not.toMatch(/Review KYC|Verify client|Reject KYC/);
  });

  it("keeps the owner-protected consent statement and version unchanged", () => {
    expect(page).toContain(
      "I confirm these documents are authentic and belong to me (or I am legally",
    );
    expect(page).toContain(
      "authorized to submit them), and I consent to Srimar Law storing them for",
    );
    expect(page).toContain(
      "identity verification and AML compliance (consent version kyc-consent-v1).",
    );
    expect(kycService).toContain('const KYC_CONSENT_VERSION = "kyc-consent-v1"');
    expect(page).not.toMatch(/Bar Council|Encrypted vault|restricted to compliance staff/i);
  });

  it("uses deterministic submitted fixture files and leaves frozen CUI pages untouched", () => {
    expect(fixture).toContain('kycStatus: "submitted"');
    expect(fixture).toContain('fileName: "Citizenship-Copy.pdf"');
    expect(fixture).toContain('fileName: "Utility-Bill.pdf"');
    expect(page).not.toMatch(/status !== "pending"/);
    expect(home).toContain("ClientDashboard");
    expect(booking).toContain("ClientBookingPage");
  });
});
