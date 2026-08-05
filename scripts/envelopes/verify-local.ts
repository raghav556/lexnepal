import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { getLocalAuth } from "../../src/server/auth/local-auth";
import { documents, firmSettings, users } from "../../db/schema";
import { migrateEnvelopeExport } from "../../src/server/services/envelope-migration";
import { GET as listEnvelopes, POST as createEnvelope } from "../../src/app/api/v1/envelopes/route";
import { POST as sendEnvelope } from "../../src/app/api/v1/envelopes/[id]/send/route";
import { POST as voidEnvelope } from "../../src/app/api/v1/envelopes/[id]/void/route";
import { POST as expireEnvelope } from "../../src/app/api/v1/envelopes/[id]/expire/route";
import { POST as declineEnvelope } from "../../src/app/api/v1/envelopes/[id]/decline/route";
import { POST as issueOtp } from "../../src/app/api/v1/envelopes/otp/issue/route";
import { POST as verifyOtp } from "../../src/app/api/v1/envelopes/otp/verify/route";
import { POST as markViewed } from "../../src/app/api/v1/envelopes/mark-viewed/route";
import { POST as signDocument } from "../../src/app/api/v1/envelopes/sign/route";
import { GET as listDocuments } from "../../src/app/api/v1/documents/route";

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

const evidence = {
  issue: false,
  verify: false,
  verifyRejectsBadCode: false,
  decline: false,
  void: false,
  expire: false,
  sign: false,
};

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
    docsBody.data.find((d) => (d as { uploadStatus?: string }).uploadStatus === "clean") ||
    docsBody.data[0];
  if (!cleanDoc) throw new Error("Need at least one document for envelope create proof");

  async function createAndSend(title: string, expiresAt?: string) {
    const createResponse = await createEnvelope(
      new Request("http://local/api/v1/envelopes", {
        method: "POST",
        headers,
        body: JSON.stringify({
          documentId: cleanDoc._id,
          routing: "parallel",
          recipientUserIds: [boundaryUser.id],
          title,
          ...(expiresAt ? { expiresAt } : {}),
        }),
      }),
    );
    if (!createResponse.ok) {
      throw new Error(`Create envelope failed: ${createResponse.status} ${await createResponse.text()}`);
    }
    const created = (await createResponse.json()) as { data: { envelopeId: string } };
    const sendResponse = await sendEnvelope(
      new Request(`http://local/api/v1/envelopes/${created.data.envelopeId}/send`, {
        method: "POST",
        headers,
        body: "{}",
      }),
    );
    if (!sendResponse.ok) {
      throw new Error(`Send envelope failed: ${sendResponse.status} ${await sendResponse.text()}`);
    }
    return created.data.envelopeId;
  }

  const envelopeId = await createAndSend("Verify envelope OTP/sign");

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
  evidence.issue = Boolean(otpIssued.data.challengeId && otpIssued.data.demoCode);

  const badVerifyResponse = await verifyOtp(
    new Request("http://local/api/v1/envelopes/otp/verify", {
      method: "POST",
      headers,
      body: JSON.stringify({
        challengeId: otpIssued.data.challengeId,
        code: "000000",
      }),
    }),
  );
  evidence.verifyRejectsBadCode = !badVerifyResponse.ok;
  if (badVerifyResponse.ok) {
    throw new Error("OTP verify accepted an incorrect code");
  }

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
  evidence.verify = true;

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
  evidence.sign = true;
  console.log("otp/sign path ok");

  const declineId = await createAndSend("Verify decline envelope");
  const declineResponse = await declineEnvelope(
    new Request(`http://local/api/v1/envelopes/${declineId}/decline`, {
      method: "POST",
      headers,
      body: JSON.stringify({ reason: "Local verify decline" }),
    }),
  );
  if (!declineResponse.ok) {
    throw new Error(`Decline failed: ${declineResponse.status} ${await declineResponse.text()}`);
  }
  const declineBody = (await declineResponse.json()) as { data: { status: string } };
  if (declineBody.data.status !== "declined") {
    throw new Error(`Expected declined status, got ${declineBody.data.status}`);
  }
  evidence.decline = true;
  console.log("decline path ok");

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
  evidence.void = true;
  console.log("void path ok");

  const expireId = await createAndSend(
    "Verify expire envelope",
    new Date(Date.now() - 60_000).toISOString(),
  );
  const expireResponse = await expireEnvelope(
    new Request(`http://local/api/v1/envelopes/${expireId}/expire`, {
      method: "POST",
      headers,
      body: "{}",
    }),
  );
  if (!expireResponse.ok) {
    throw new Error(`Expire failed: ${expireResponse.status} ${await expireResponse.text()}`);
  }
  evidence.expire = true;
  console.log("expire path ok");

  const listResponse = await listEnvelopes(new Request("http://local/api/v1/envelopes", { headers }));
  if (!listResponse.ok) throw new Error(`List envelopes failed: ${listResponse.status}`);
  const listBody = (await listResponse.json()) as { data: unknown[] };
  if (!Array.isArray(listBody.data) || listBody.data.length < 1) {
    throw new Error("Envelope list empty after proofs");
  }

  const required = ["issue", "verify", "decline", "void", "expire"] as const;
  for (const key of required) {
    if (!evidence[key]) throw new Error(`R4.6 evidence missing: ${key}`);
  }

  console.log(JSON.stringify({ r46: evidence }));
  console.log("envelopes:verify-local passed");
} finally {
  await closeDatabase().catch(() => undefined);
}
