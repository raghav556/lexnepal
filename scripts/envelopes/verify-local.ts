import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { getLocalAuth } from "../../src/server/auth/local-auth";
import { documents, firmSettings, users } from "../../db/schema";
import { migrateEnvelopeExport } from "../../src/server/services/envelope-migration";
import { GET as listEnvelopes, POST as createEnvelope } from "../../next-app/app/api/v1/envelopes/route";
import { POST as sendEnvelope } from "../../next-app/app/api/v1/envelopes/[id]/send/route";
import { POST as voidEnvelope } from "../../next-app/app/api/v1/envelopes/[id]/void/route";
import { POST as expireEnvelope } from "../../next-app/app/api/v1/envelopes/[id]/expire/route";
import { POST as issueOtp } from "../../next-app/app/api/v1/envelopes/otp/issue/route";
import { POST as verifyOtp } from "../../next-app/app/api/v1/envelopes/otp/verify/route";
import { POST as markViewed } from "../../next-app/app/api/v1/envelopes/mark-viewed/route";
import { POST as signDocument } from "../../next-app/app/api/v1/envelopes/sign/route";
import { GET as listDocuments } from "../../next-app/app/api/v1/documents/route";

const database = getDatabase();
const firmA = "61000000-0000-4000-8000-000000000001";
const firmMap = { convex_firm_a: firmA };
const password = "Local-boundary-only-2026!";
const exportPath = "tests/fixtures/convex-envelopes-export";

async function signIn(email: string) {
  const response = await getLocalAuth().api.signInEmail({
    body: { email, password },
    asResponse: true,
  });
  if (!response.ok) throw new Error(`Sign-in failed for ${email}. Run auth:verify-boundary first.`);
  const cookie = response.headers.get("set-cookie");
  if (!cookie) throw new Error("Session cookie missing");
  return cookie;
}

try {
  await database
    .insert(firmSettings)
    .values({
      firmId: firmA,
      key: "rolePermissions",
      value: {
        associate: [
          "users.view_directory",
          "clients.view_all",
          "clients.manage",
          "cases.view_all",
          "cases.manage",
          "documents.read",
          "documents.upload",
          "documents.share",
          "documents.delete",
        ],
      },
    })
    .onConflictDoUpdate({
      target: [firmSettings.firmId, firmSettings.key],
      set: {
        value: {
          associate: [
            "users.view_directory",
            "clients.view_all",
            "clients.manage",
            "cases.view_all",
            "cases.manage",
            "documents.read",
            "documents.upload",
            "documents.share",
            "documents.delete",
          ],
        },
        updatedAt: new Date(),
      },
    });

  const [creator] = await database
    .select({ id: users.id })
    .from(users)
    .where(eq(users.legacyConvexId, "convex_identity_user_1"))
    .limit(1);
  if (!creator) {
    throw new Error("Identity fixture user missing. Run migration:identity first.");
  }

  await database
    .insert(documents)
    .values({
      firmId: firmA,
      documentNumber: `ENV-FIXTURE-${Date.now()}`,
      title: "Envelope fixture document",
      type: "contract",
      storageId: `protected/${firmA}/fixture-env-doc`,
      mimeType: "application/pdf",
      sizeBytes: 128,
      uploadedBy: creator.id,
      isTemplate: false,
      isPrivileged: false,
      uploadStatus: "clean",
      confidentialityLevel: "confidential",
      legacyConvexId: "convex_env_doc_a",
      requiresSignature: false,
    })
    .onConflictDoNothing();

  // Ensure legacy id exists even if conflict was on another unique key
  const [fixtureDoc] = await database
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.legacyConvexId, "convex_env_doc_a"))
    .limit(1);
  if (!fixtureDoc) {
    await database.insert(documents).values({
      firmId: firmA,
      documentNumber: `ENV-FIXTURE-LEGACY-${Date.now()}`,
      title: "Envelope fixture document",
      type: "contract",
      storageId: `protected/${firmA}/fixture-env-doc-${Date.now()}`,
      mimeType: "application/pdf",
      sizeBytes: 128,
      uploadedBy: creator.id,
      isTemplate: false,
      isPrivileged: false,
      uploadStatus: "clean",
      confidentialityLevel: "confidential",
      legacyConvexId: "convex_env_doc_a",
    });
  }

  const first = await migrateEnvelopeExport({ exportPath, firmMap });
  const second = await migrateEnvelopeExport({ exportPath, firmMap });
  if (!first.reconciliation.passed) {
    throw new Error(`First envelope migration failed: ${JSON.stringify(first, null, 2)}`);
  }
  if (!second.reconciliation.passed) {
    throw new Error(`Second envelope migration failed: ${JSON.stringify(second, null, 2)}`);
  }
  console.log("envelope migration reconcile ok");

  const cookie = await signIn("boundary-a@example.invalid");
  const headers = { cookie, "content-type": "application/json" };

  const [boundaryUser] = await database
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, "boundary-a@example.invalid"))
    .limit(1);
  if (!boundaryUser) throw new Error("boundary-a user missing");

  const docsResponse = await listDocuments(new Request("http://local/api/v1/documents", { headers }));
  if (!docsResponse.ok) throw new Error(`Documents list failed: ${docsResponse.status}`);
  const docsBody = (await docsResponse.json()) as { data: Array<{ _id: string; uploadStatus?: string }> };
  const cleanDoc =
    docsBody.data.find((d) => (d as any).uploadStatus === "clean") || docsBody.data[0];
  if (!cleanDoc) throw new Error("Need at least one document for envelope create proof");

  const createResponse = await createEnvelope(
    new Request("http://local/api/v1/envelopes", {
      method: "POST",
      headers,
      body: JSON.stringify({
        documentId: cleanDoc._id,
        routing: "parallel",
        recipientUserIds: [boundaryUser.id],
        title: "Verify envelope OTP/sign",
      }),
    }),
  );
  if (!createResponse.ok) {
    throw new Error(`Create envelope failed: ${createResponse.status} ${await createResponse.text()}`);
  }
  const created = (await createResponse.json()) as { data: { envelopeId: string } };
  const envelopeId = created.data.envelopeId;

  const sendResponse = await sendEnvelope(
    new Request(`http://local/api/v1/envelopes/${envelopeId}/send`, {
      method: "POST",
      headers,
      body: "{}",
    }),
  );
  if (!sendResponse.ok) {
    throw new Error(`Send envelope failed: ${sendResponse.status} ${await sendResponse.text()}`);
  }

  const otpIssueResponse = await issueOtp(
    new Request("http://local/api/v1/envelopes/otp/issue", {
      method: "POST",
      headers,
      body: JSON.stringify({ documentId: cleanDoc._id, envelopeId }),
    }),
  );
  if (!otpIssueResponse.ok) {
    throw new Error(`OTP issue failed: ${otpIssueResponse.status} ${await otpIssueResponse.text()}`);
  }
  const otpIssued = (await otpIssueResponse.json()) as {
    data: { challengeId: string; demoCode: string };
  };

  const otpVerifyResponse = await verifyOtp(
    new Request("http://local/api/v1/envelopes/otp/verify", {
      method: "POST",
      headers,
      body: JSON.stringify({
        challengeId: otpIssued.data.challengeId,
        code: otpIssued.data.demoCode,
      }),
    }),
  );
  if (!otpVerifyResponse.ok) {
    throw new Error(`OTP verify failed: ${otpVerifyResponse.status} ${await otpVerifyResponse.text()}`);
  }

  const viewedResponse = await markViewed(
    new Request("http://local/api/v1/envelopes/mark-viewed", {
      method: "POST",
      headers,
      body: JSON.stringify({ documentId: cleanDoc._id }),
    }),
  );
  if (!viewedResponse.ok) {
    throw new Error(`Mark viewed failed: ${viewedResponse.status} ${await viewedResponse.text()}`);
  }

  const sha256 = createHash("sha256").update(`verify|${cleanDoc._id}`).digest("hex");
  const signResponse = await signDocument(
    new Request("http://local/api/v1/envelopes/sign", {
      method: "POST",
      headers,
      body: JSON.stringify({
        documentId: cleanDoc._id,
        signatureMethod: "type",
        typedSignatureText: "Boundary Verifier",
        consentAccepted: true,
        documentSha256: sha256,
        otpChallengeId: otpIssued.data.challengeId,
        envelopeId,
      }),
    }),
  );
  if (!signResponse.ok) {
    throw new Error(`Sign failed: ${signResponse.status} ${await signResponse.text()}`);
  }
  console.log("otp/sign path ok");

  const voidCreate = await createEnvelope(
    new Request("http://local/api/v1/envelopes", {
      method: "POST",
      headers,
      body: JSON.stringify({
        documentId: cleanDoc._id,
        routing: "parallel",
        recipientUserIds: [boundaryUser.id],
        title: "Verify void envelope",
      }),
    }),
  );
  const voidCreated = (await voidCreate.json()) as { data: { envelopeId: string } };
  const voidResponse = await voidEnvelope(
    new Request(`http://local/api/v1/envelopes/${voidCreated.data.envelopeId}/void`, {
      method: "POST",
      headers,
      body: JSON.stringify({ reason: "Local verify void" }),
    }),
  );
  if (!voidResponse.ok) {
    throw new Error(`Void failed: ${voidResponse.status} ${await voidResponse.text()}`);
  }
  console.log("void path ok");

  const expireCreate = await createEnvelope(
    new Request("http://local/api/v1/envelopes", {
      method: "POST",
      headers,
      body: JSON.stringify({
        documentId: cleanDoc._id,
        routing: "parallel",
        recipientUserIds: [boundaryUser.id],
        title: "Verify expire envelope",
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
      }),
    }),
  );
  const expireCreated = (await expireCreate.json()) as { data: { envelopeId: string } };
  await sendEnvelope(
    new Request(`http://local/api/v1/envelopes/${expireCreated.data.envelopeId}/send`, {
      method: "POST",
      headers,
      body: "{}",
    }),
  );
  const expireResponse = await expireEnvelope(
    new Request(`http://local/api/v1/envelopes/${expireCreated.data.envelopeId}/expire`, {
      method: "POST",
      headers,
      body: "{}",
    }),
  );
  if (!expireResponse.ok) {
    throw new Error(`Expire failed: ${expireResponse.status} ${await expireResponse.text()}`);
  }
  console.log("expire path ok");

  const listResponse = await listEnvelopes(new Request("http://local/api/v1/envelopes", { headers }));
  if (!listResponse.ok) throw new Error(`List envelopes failed: ${listResponse.status}`);
  const listBody = (await listResponse.json()) as { data: unknown[] };
  if (!Array.isArray(listBody.data) || listBody.data.length < 1) {
    throw new Error("Envelope list empty after proofs");
  }

  console.log("envelopes:verify-local passed");
} finally {
  await closeDatabase().catch(() => undefined);
}
