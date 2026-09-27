import { randomUUID, createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { createSigningTestDatabase } from "../support/signing-test-database";
import {
  documents,
  durableJobs,
  firms,
  notifications,
  signatureArtifactUploadIntents,
  signingChallenges,
  users,
} from "../../db/schema";
import type { AuthPrincipal, UserRole } from "../../src/server/auth/types";
import { documentSignSchema } from "../../src/shared/contracts/envelopes";

type Runtime = {
  db: ReturnType<typeof import("../../src/server/db/client").getDatabase>;
  close: typeof import("../../src/server/db/client").closeDatabase;
  service: import("../../src/server/services/envelope-service").EnvelopeService;
  artifacts: import("../../src/server/services/signature-artifact-service").SignatureArtifactService;
  repository: typeof import("../../src/server/repositories/envelope-repository").EnvelopeRepository;
  storage: ReturnType<typeof import("../../src/server/storage/runtime").getDocumentStorageRuntime>;
  resetEnvironment: typeof import("../../src/server/env").resetServerEnvironmentForTests;
  capabilities: typeof import("../../src/server/auth/capabilities").resolveCapabilities;
};

let runtime: Runtime;
let sandbox: Awaited<ReturnType<typeof createSigningTestDatabase>>;
let firmA: string;
let firmB: string;
let clientA: string;
let clientB: string;
let foreignClient: string;
let staffA: string;
const originalEnvironment = { ...process.env };
const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4]);
const jpeg = new Uint8Array([255, 216, 255, 224, 1, 2, 3, 4]);

function restoreEnvironment(
  name: "DATABASE_URL" | "STORAGE_ROOT" | "LEXNEPAL_SKIP_LOCAL_CLAMAV" | "LEXNEPAL_SKIP_SMTP",
) {
  const original = originalEnvironment[name];
  if (original === undefined) delete process.env[name];
  else process.env[name] = original;
}

function principal(
  userId: string,
  firmId = firmA,
  role: UserRole = "client",
  email = "browser-supplied@example.invalid",
): AuthPrincipal {
  return {
    user: {
      id: userId,
      firmId,
      tokenIdentifier: `test|${userId}`,
      name: "Test signer",
      email,
      role,
      isActive: true,
      isPending: false,
      avatar: null,
      phone: null,
    },
    firmId,
    capabilities: runtime.capabilities(role, undefined),
    sessionId: `session-${userId}`,
    authenticationMethod: "session_cookie",
  };
}
async function addFirm() {
  const id = randomUUID();
  await runtime.db
    .insert(firms)
    .values({ id, name: `Signing test ${id}`, slug: `signing-test-${id}` });
  return id;
}
async function addUser(firmId: string, role: UserRole, label: string) {
  const id = randomUUID();
  const email = `${label}-${id}@example.invalid`;
  await runtime.db
    .insert(users)
    .values({ id, firmId, tokenIdentifier: `signing-test|${id}`, name: label, email, role });
  return { id, email };
}
async function addDocument(
  firmId: string,
  uploadedBy: string,
  intendedSignerUserId: string | null,
  label: string,
  options: { status?: "pending" | "signed"; viewed?: boolean; requiresSignature?: boolean } = {},
) {
  const id = randomUUID();
  const authoritativeSha = sha(`authoritative:${id}`);
  await runtime.db.insert(documents).values({
    id,
    firmId,
    documentNumber: `SIGN-TEST-${id}`,
    title: label,
    type: "contract",
    storageId: `protected/${firmId}/test/${id}`,
    mimeType: "application/pdf",
    sizeBytes: 32,
    sha256: authoritativeSha,
    uploadedBy,
    uploadStatus: "clean",
    confidentialityLevel: "confidential",
    requiresSignature: options.requiresSignature ?? true,
    signatureStatus: options.status ?? "pending",
    intendedSignerUserId,
    viewedAt: options.viewed ? new Date() : null,
  });
  return { id, sha256: authoritativeSha, title: label };
}
async function addEnvelope(
  documentId: string,
  recipientIds: string[],
  routing: "sequential" | "parallel" = "parallel",
) {
  const created = await runtime.service.create(principal(staffA, firmA, "associate"), {
    documentId,
    routing,
    recipientUserIds: recipientIds,
  });
  await runtime.service.send(principal(staffA, firmA, "associate"), created.envelopeId);
  return created.envelopeId;
}
async function issued(documentId: string, envelopeId?: string, signer = clientA, firmId = firmA) {
  const result = await runtime.service.issueOtp(principal(signer, firmId), {
    documentId,
    envelopeId,
  });
  const [job] = await runtime.db
    .select()
    .from(durableJobs)
    .where(
      and(
        eq(durableJobs.type, "communication.email"),
        eq(durableJobs.idempotencyKey, `esign-otp:${result.challengeId}`),
      ),
    )
    .limit(1);
  expect(job).toBeDefined();
  const payload = job.payload as { to: string; text: string };
  const code = payload.text.match(/\b\d{6}\b/)?.[0];
  expect(code).toMatch(/^\d{6}$/);
  return { result, job, payload, code: code! };
}
async function verified(documentId: string, envelopeId?: string, signer = clientA, firmId = firmA) {
  const otp = await issued(documentId, envelopeId, signer, firmId);
  await runtime.service.verifyOtp(principal(signer, firmId), {
    challengeId: otp.result.challengeId,
    code: otp.code,
  });
  return otp.result.challengeId;
}
async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code });
}
async function putArtifact(
  documentId: string,
  bytes: Uint8Array,
  mimeType: "image/png" | "image/jpeg",
  envelopeId?: string,
) {
  const intent = await runtime.service.createSignatureArtifactIntent(principal(clientA), {
    documentId,
    envelopeId,
    fileName: mimeType === "image/png" ? "draw.png" : "uploaded.jpg",
    mimeType,
    sizeBytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
  const grant = intent.upload.fields as { grantId: string };
  await runtime.storage.storage.storeGrantedUpload(grant.grantId, bytes);
  return intent.intentId;
}

beforeAll(async () => {
  Object.assign(process.env, { NODE_ENV: "test" });
  process.env.LEXNEPAL_SKIP_LOCAL_CLAMAV = "1";
  sandbox = await createSigningTestDatabase();
  const [
    dbModule,
    serviceModule,
    artifactModule,
    repoModule,
    storageModule,
    envModule,
    capabilityModule,
  ] = await Promise.all([
    import("../../src/server/db/client"),
    import("../../src/server/services/envelope-service"),
    import("../../src/server/services/signature-artifact-service"),
    import("../../src/server/repositories/envelope-repository"),
    import("../../src/server/storage/runtime"),
    import("../../src/server/env"),
    import("../../src/server/auth/capabilities"),
  ]);
  runtime = {
    db: dbModule.getDatabase(),
    close: dbModule.closeDatabase,
    service: new serviceModule.EnvelopeService(),
    artifacts: new artifactModule.SignatureArtifactService(),
    repository: repoModule.EnvelopeRepository,
    storage: storageModule.getDocumentStorageRuntime(),
    resetEnvironment: envModule.resetServerEnvironmentForTests,
    capabilities: capabilityModule.resolveCapabilities,
  };
  firmA = await addFirm();
  firmB = await addFirm();
  clientA = (await addUser(firmA, "client", "client-a")).id;
  clientB = (await addUser(firmA, "client", "client-b")).id;
  staffA = (await addUser(firmA, "associate", "staff-a")).id;
  foreignClient = (await addUser(firmB, "client", "foreign-client")).id;
}, 120_000);

afterAll(async () => {
  vi.useRealTimers();
  if (sandbox) await sandbox.dispose(runtime?.close ?? (async () => undefined));
  restoreEnvironment("DATABASE_URL");
  restoreEnvironment("STORAGE_ROOT");
  restoreEnvironment("LEXNEPAL_SKIP_LOCAL_CLAMAV");
  restoreEnvironment("LEXNEPAL_SKIP_SMTP");
});

describe("client signing security against isolated real MySQL", () => {
  it("issues a private OTP by durable email to the authoritative user and no in-app notification", async () => {
    const doc = await addDocument(firmA, clientA, clientA, "OTP delivery", { viewed: true });
    const before = await runtime.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, clientA));
    const { result, payload, code } = await issued(doc.id);
    const [account] = await runtime.db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, clientA));
    expect(result).toEqual({ challengeId: expect.any(String), expiresAt: expect.any(Number) });
    expect(JSON.stringify(result)).not.toContain(code);
    expect(result).not.toHaveProperty("demoCode");
    expect(payload.to).toBe(account.email);
    expect(payload.to).not.toBe(principal(clientA).user.email);
    const after = await runtime.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, clientA));
    expect(after).toHaveLength(before.length);
    await expectCode(
      runtime.service.verifyOtp(principal(clientB), { challengeId: result.challengeId, code }),
      "NOT_FOUND",
    );
    const forgedInput = { documentId: doc.id, email: "attacker@example.invalid" };
    const forgedResult = await runtime.service.issueOtp(principal(clientA), forgedInput);
    const [forgedJob] = await runtime.db
      .select()
      .from(durableJobs)
      .where(eq(durableJobs.idempotencyKey, `esign-otp:${forgedResult.challengeId}`));
    expect((forgedJob.payload as { to: string }).to).toBe(account.email);
  });

  it("binds OTP to document and envelope context, expiry, attempts and verified window", async () => {
    const docA = await addDocument(firmA, clientA, clientA, "OTP A", { viewed: true });
    const docB = await addDocument(firmA, clientA, clientA, "OTP B", { viewed: true });
    const otp = await issued(docA.id);
    await runtime.service.verifyOtp(principal(clientA), {
      challengeId: otp.result.challengeId,
      code: otp.code,
    });
    await expectCode(
      runtime.repository.assertOtpVerified(firmA, clientA, docB.id, otp.result.challengeId),
      "FORBIDDEN",
    );
    await expectCode(
      runtime.service.sign(principal(clientA), {
        documentId: docB.id,
        signatureMethod: "type",
        typedSignatureText: "Client A",
        consentAccepted: true,
        otpChallengeId: otp.result.challengeId,
      }),
      "FORBIDDEN",
    );
    const envelopeA = await addEnvelope(docA.id, [clientA]);
    const envelopeB = await addEnvelope(docA.id, [clientA]);
    const envelopeOtp = await issued(docA.id, envelopeA);
    await runtime.service.verifyOtp(principal(clientA), {
      challengeId: envelopeOtp.result.challengeId,
      code: envelopeOtp.code,
    });
    await expectCode(
      runtime.repository.assertOtpVerified(
        firmA,
        clientA,
        docA.id,
        envelopeOtp.result.challengeId,
        envelopeB,
      ),
      "FORBIDDEN",
    );
    await expectCode(
      runtime.service.sign(principal(clientA), {
        documentId: docA.id,
        envelopeId: envelopeB,
        signatureMethod: "type",
        typedSignatureText: "Client A",
        consentAccepted: true,
        otpChallengeId: envelopeOtp.result.challengeId,
      }),
      "FORBIDDEN",
    );
    await expectCode(
      runtime.repository.assertOtpVerified(firmA, clientA, docA.id, envelopeOtp.result.challengeId),
      "FORBIDDEN",
    );
    await expectCode(
      runtime.service.sign(principal(clientA), {
        documentId: docA.id,
        signatureMethod: "type",
        typedSignatureText: "Client A",
        consentAccepted: true,
        otpChallengeId: envelopeOtp.result.challengeId,
      }),
      "FORBIDDEN",
    );
    await runtime.db
      .update(signingChallenges)
      .set({ verifiedAt: new Date(Date.now() - 16 * 60_000) })
      .where(eq(signingChallenges.id, envelopeOtp.result.challengeId));
    await expectCode(
      runtime.repository.assertOtpVerified(
        firmA,
        clientA,
        docA.id,
        envelopeOtp.result.challengeId,
        envelopeA,
      ),
      "CONFLICT",
    );
    const expired = await issued(docB.id);
    await runtime.db
      .update(signingChallenges)
      .set({ expiresAt: new Date(Date.now() - 1_000) })
      .where(eq(signingChallenges.id, expired.result.challengeId));
    await expectCode(
      runtime.service.verifyOtp(principal(clientA), {
        challengeId: expired.result.challengeId,
        code: expired.code,
      }),
      "CONFLICT",
    );
    const attempts = await issued(docB.id);
    for (let index = 0; index < 5; index++)
      await expectCode(
        runtime.service.verifyOtp(principal(clientA), {
          challengeId: attempts.result.challengeId,
          code: "not-a-code",
        }),
        "BAD_REQUEST",
      );
    await expectCode(
      runtime.service.verifyOtp(principal(clientA), {
        challengeId: attempts.result.challengeId,
        code: attempts.code,
      }),
      "RATE_LIMITED",
    );
  });

  it("fails closed when SMTP is disabled", async () => {
    const doc = await addDocument(firmA, clientA, clientA, "SMTP off", { viewed: true });
    const before = await runtime.db
      .select()
      .from(signingChallenges)
      .where(eq(signingChallenges.documentId, doc.id));
    const jobsBefore = await runtime.db
      .select()
      .from(durableJobs)
      .where(eq(durableJobs.type, "communication.email"));
    process.env.LEXNEPAL_SKIP_SMTP = "1";
    runtime.resetEnvironment();
    try {
      await expectCode(
        runtime.service.issueOtp(principal(clientA), { documentId: doc.id }),
        "SERVICE_UNAVAILABLE",
      );
    } finally {
      restoreEnvironment("LEXNEPAL_SKIP_SMTP");
      runtime.resetEnvironment();
    }
    const after = await runtime.db
      .select()
      .from(signingChallenges)
      .where(eq(signingChallenges.documentId, doc.id));
    expect(after).toHaveLength(before.length);
    const jobsAfter = await runtime.db
      .select()
      .from(durableJobs)
      .where(eq(durableJobs.type, "communication.email"));
    expect(jobsAfter).toHaveLength(jobsBefore.length);
  });

  it("preserves authoritative SHA for direct and envelope typed signing, including caller spoofing", async () => {
    for (const mode of ["direct", "envelope"] as const) {
      const doc = await addDocument(firmA, clientA, clientA, `${mode} SHA`);
      const envelopeId = mode === "envelope" ? await addEnvelope(doc.id, [clientA]) : undefined;
      const viewed = await runtime.service.markViewed(principal(clientA), { documentId: doc.id });
      expect(viewed.viewedAt).toBeTruthy();
      const challengeId = await verified(doc.id, envelopeId);
      const parsed = documentSignSchema.parse({
        documentId: doc.id,
        envelopeId,
        signatureMethod: "type",
        typedSignatureText: "Client A",
        consentAccepted: true,
        otpChallengeId: challengeId,
        documentSha256: "f".repeat(64),
      });
      expect(parsed).not.toHaveProperty("documentSha256");
      await runtime.service.sign(principal(clientA), parsed);
      const [stored] = await runtime.db.select().from(documents).where(eq(documents.id, doc.id));
      expect(stored.sha256).toBe(doc.sha256);
      expect(stored.signatureMethod).toBe("type");
      expect(stored.signatureArtifactStorageId).toBeNull();
    }
  });

  it("binds promoted PNG/JPEG artifacts to signer, firm, document and envelope", async () => {
    for (const [method, bytes, mimeType] of [
      ["draw", png, "image/png"],
      ["upload", jpeg, "image/jpeg"],
    ] as const) {
      const doc = await addDocument(firmA, clientA, clientA, `${method} artifact`, {
        viewed: true,
      });
      const intentId = await putArtifact(doc.id, bytes, mimeType);
      const [pending] = await runtime.db
        .select()
        .from(signatureArtifactUploadIntents)
        .where(eq(signatureArtifactUploadIntents.id, intentId));
      expect(pending).toMatchObject({
        firmId: firmA,
        userId: clientA,
        documentId: doc.id,
        envelopeId: null,
        status: "pending",
      });
      await expectCode(
        runtime.service.getSignatureArtifactIntent(principal(clientB), intentId),
        "NOT_FOUND",
      );
      await expectCode(
        runtime.service.getSignatureArtifactIntent(principal(clientB, firmB), intentId),
        "NOT_FOUND",
      );
      const challengeId = await verified(doc.id);
      const sign = (artifact: string) =>
        runtime.service.sign(principal(clientA), {
          documentId: doc.id,
          signatureMethod: method,
          signatureArtifactIntentId: artifact,
          consentAccepted: true,
          otpChallengeId: challengeId,
        });
      await expectCode(sign(intentId), "FORBIDDEN");
      await expectCode(sign(randomUUID()), "FORBIDDEN");
      const result = await runtime.service.completeSignatureArtifactIntent(
        principal(clientA),
        intentId,
      );
      expect(result.status).toBe("promoted");
      const [promoted] = await runtime.db
        .select()
        .from(signatureArtifactUploadIntents)
        .where(eq(signatureArtifactUploadIntents.id, intentId));
      expect(promoted.protectedKey).toMatch(/^protected\//);
      await runtime.service.sign(
        principal(clientA),
        documentSignSchema.parse({
          documentId: doc.id,
          signatureMethod: method,
          signatureArtifactIntentId: intentId,
          signatureArtifactStorageId: "attacker-key",
          consentAccepted: true,
          otpChallengeId: challengeId,
        }),
      );
      const [stored] = await runtime.db.select().from(documents).where(eq(documents.id, doc.id));
      expect(stored.signatureArtifactStorageId).toBe(promoted.protectedKey);
      expect(stored.sha256).toBe(doc.sha256);
      const wrongDoc = await addDocument(firmA, clientA, clientA, `${method} wrong document`, {
        viewed: true,
      });
      const wrongChallenge = await verified(wrongDoc.id);
      await expectCode(
        runtime.service.sign(principal(clientA), {
          documentId: wrongDoc.id,
          signatureMethod: method,
          signatureArtifactIntentId: intentId,
          consentAccepted: true,
          otpChallengeId: wrongChallenge,
        }),
        "FORBIDDEN",
      );
    }
  });

  it("rejects infected artifacts and enforces envelope context", async () => {
    const doc = await addDocument(firmA, clientA, clientA, "malware artifact", { viewed: true });
    const envelopeA = await addEnvelope(doc.id, [clientA]);
    const envelopeB = await addEnvelope(doc.id, [clientA]);
    const intentId = await putArtifact(doc.id, png, "image/png", envelopeA);
    const [bound] = await runtime.db
      .select()
      .from(signatureArtifactUploadIntents)
      .where(eq(signatureArtifactUploadIntents.id, intentId));
    expect(bound.envelopeId).toBe(envelopeA);
    const scan = vi
      .spyOn(runtime.storage.scanner, "scan")
      .mockResolvedValueOnce({ verdict: "infected", provider: "test", details: "test detection" });
    try {
      expect(
        (await runtime.service.completeSignatureArtifactIntent(principal(clientA), intentId))
          .status,
      ).toBe("rejected");
    } finally {
      scan.mockRestore();
    }
    const challengeId = await verified(doc.id, envelopeA);
    await expectCode(
      runtime.service.sign(principal(clientA), {
        documentId: doc.id,
        envelopeId: envelopeA,
        signatureMethod: "draw",
        signatureArtifactIntentId: intentId,
        consentAccepted: true,
        otpChallengeId: challengeId,
      }),
      "FORBIDDEN",
    );
    const cleanIntent = await putArtifact(doc.id, png, "image/png", envelopeA);
    await runtime.service.completeSignatureArtifactIntent(principal(clientA), cleanIntent);
    const otherChallenge = await verified(doc.id, envelopeB);
    await expectCode(
      runtime.service.sign(principal(clientA), {
        documentId: doc.id,
        envelopeId: envelopeB,
        signatureMethod: "draw",
        signatureArtifactIntentId: cleanIntent,
        consentAccepted: true,
        otpChallengeId: otherChallenge,
      }),
      "FORBIDDEN",
    );
  });

  it("does not let another signer or firm complete or consume a promoted artifact", async () => {
    const doc = await addDocument(firmA, clientA, clientA, "artifact ownership", { viewed: true });
    const intentId = await putArtifact(doc.id, png, "image/png");
    await expectCode(
      runtime.service.completeSignatureArtifactIntent(principal(clientB), intentId),
      "NOT_FOUND",
    );
    await expectCode(
      runtime.service.getSignatureArtifactIntent(principal(foreignClient, firmB), intentId),
      "NOT_FOUND",
    );
    expect(
      await runtime.service.getSignatureArtifactIntent(principal(clientA), intentId),
    ).toMatchObject({ status: "pending" });
    await runtime.service.completeSignatureArtifactIntent(principal(clientA), intentId);
    const ownStatus = await runtime.service.getSignatureArtifactIntent(
      principal(clientA),
      intentId,
    );
    expect(ownStatus.status).toBe("promoted");
    expect(ownStatus).not.toHaveProperty("protectedKey");

    // Reassign the direct request. B can now sign this document, but cannot
    // adopt A's already-promoted artifact for the same document.
    await runtime.db
      .update(documents)
      .set({ intendedSignerUserId: clientB })
      .where(eq(documents.id, doc.id));
    const challengeB = await verified(doc.id, undefined, clientB);
    await expectCode(
      runtime.service.sign(principal(clientB), {
        documentId: doc.id,
        signatureMethod: "draw",
        signatureArtifactIntentId: intentId,
        consentAccepted: true,
        otpChallengeId: challengeB,
      }),
      "FORBIDDEN",
    );
    const foreignDoc = await addDocument(
      firmB,
      foreignClient,
      foreignClient,
      "foreign artifact use",
      {
        viewed: true,
      },
    );
    const foreignChallenge = await verified(foreignDoc.id, undefined, foreignClient, firmB);
    await expectCode(
      runtime.service.sign(principal(foreignClient, firmB), {
        documentId: foreignDoc.id,
        signatureMethod: "draw",
        signatureArtifactIntentId: intentId,
        consentAccepted: true,
        otpChallengeId: foreignChallenge,
      }),
      "FORBIDDEN",
    );
  });

  it("returns a signer-only inbox without future actions, duplicates or storage identifiers", async () => {
    const own = await addDocument(firmA, clientA, clientA, "A direct", { viewed: true });
    const foreign = await addDocument(firmA, clientB, clientB, "B direct", { viewed: true });
    const privileged = await addDocument(firmA, clientA, clientA, "Restricted signing title", {
      viewed: true,
    });
    await runtime.db
      .update(documents)
      .set({ isPrivileged: true, confidentialityLevel: "privileged" })
      .where(eq(documents.id, privileged.id));
    const envelopeDoc = await addDocument(firmA, clientA, clientA, "A envelope", { viewed: true });
    await addEnvelope(envelopeDoc.id, [clientA, clientB], "sequential");
    const signedA = await addDocument(firmA, clientA, clientA, "A signed", {
      status: "signed",
      viewed: true,
    });
    const signedB = await addDocument(firmA, clientB, clientB, "B signed", {
      status: "signed",
      viewed: true,
    });
    await runtime.db
      .update(documents)
      .set({ signedByUserId: clientA, signedAt: new Date() })
      .where(eq(documents.id, signedA.id));
    await runtime.db
      .update(documents)
      .set({ signedByUserId: clientB, signedAt: new Date() })
      .where(eq(documents.id, signedB.id));
    const inbox = await runtime.service.listSigningInbox(principal(clientA));
    expect(inbox.pendingDirect.some((action) => action.document.id === own.id)).toBe(true);
    expect(inbox.pendingDirect.some((action) => action.document.id === foreign.id)).toBe(false);
    expect(inbox.pendingDirect.some((action) => action.document.id === privileged.id)).toBe(false);
    expect(
      inbox.pendingEnvelopes.filter((action) => action.document?.id === envelopeDoc.id),
    ).toHaveLength(1);
    expect(inbox.pendingDirect.some((action) => action.document.id === envelopeDoc.id)).toBe(false);
    expect(inbox.recentlySigned.some((action) => action.document.id === signedA.id)).toBe(true);
    expect(inbox.recentlySigned.some((action) => action.document.id === signedB.id)).toBe(false);
    const bInbox = await runtime.service.listSigningInbox(principal(clientB));
    expect(bInbox.pendingEnvelopes.some((action) => action.document?.id === envelopeDoc.id)).toBe(
      false,
    );
    expect(JSON.stringify(inbox)).not.toMatch(
      /storageId|protectedKey|uploadIntentId|quarantineKey/i,
    );

    const sharedDocument = await addDocument(firmA, staffA, clientA, "Sequential history", {
      viewed: true,
    });
    const sharedEnvelopeId = await addEnvelope(sharedDocument.id, [clientA, clientB], "sequential");
    await expectCode(
      runtime.service.markViewed(principal(clientB), { documentId: sharedDocument.id }),
      "FORBIDDEN",
    );
    await runtime.service.markViewed(principal(clientA), { documentId: sharedDocument.id });
    await runtime.service.sign(principal(clientA), {
      documentId: sharedDocument.id,
      envelopeId: sharedEnvelopeId,
      signatureMethod: "type",
      typedSignatureText: "Client A signature",
      consentAccepted: true,
      otpChallengeId: await verified(sharedDocument.id, sharedEnvelopeId),
    });
    await runtime.service.markViewed(principal(clientB), { documentId: sharedDocument.id });
    await runtime.service.sign(principal(clientB), {
      documentId: sharedDocument.id,
      envelopeId: sharedEnvelopeId,
      signatureMethod: "type",
      typedSignatureText: "Client B private signature",
      consentAccepted: true,
      otpChallengeId: await verified(sharedDocument.id, sharedEnvelopeId, clientB),
    });
    const firstSignerHistory = await runtime.service.listSigningInbox(principal(clientA));
    const historicalAction = firstSignerHistory.recentlySigned.find(
      (action) => action.document.id === sharedDocument.id && action.kind === "envelope",
    );
    expect(historicalAction).toBeDefined();
    expect(JSON.stringify(historicalAction)).not.toContain("Client B private signature");

    const parallelDocument = await addDocument(firmA, staffA, null, "Parallel recipients");
    await addEnvelope(parallelDocument.id, [clientA, clientB], "parallel");
    await expect(
      runtime.service.markViewed(principal(clientA), { documentId: parallelDocument.id }),
    ).resolves.toHaveProperty("viewedAt");
  });

  it("denies Client management, foreign signing, future signing, decline and cross-firm requests", async () => {
    const aDoc = await addDocument(firmA, clientA, clientA, "A authorization", { viewed: true });
    const bDoc = await addDocument(firmA, clientB, clientB, "B authorization", { viewed: true });
    const foreignUser = (await addUser(firmB, "client", "foreign-signer")).id;
    const foreignDoc = await addDocument(firmB, foreignUser, foreignUser, "foreign firm", {
      viewed: true,
    });
    const a = principal(clientA);
    await expectCode(
      runtime.service.create(a, {
        documentId: aDoc.id,
        routing: "parallel",
        recipientUserIds: [clientA],
      }),
      "FORBIDDEN",
    );
    const envelopeId = await addEnvelope(bDoc.id, [clientB]);
    await expectCode(runtime.service.send(a, envelopeId), "FORBIDDEN");
    await expectCode(runtime.service.void(a, envelopeId, { reason: "tamper" }), "FORBIDDEN");
    const fakeOtp = randomUUID();
    await expectCode(
      runtime.service.sign(a, {
        documentId: bDoc.id,
        signatureMethod: "type",
        typedSignatureText: "A",
        consentAccepted: true,
        otpChallengeId: fakeOtp,
      }),
      "FORBIDDEN",
    );
    await expectCode(
      runtime.repository.signDocument(firmA, clientA, {
        documentId: bDoc.id,
        signatureMethod: "type",
        typedSignatureText: "A",
        consentAccepted: true,
        otpChallengeId: fakeOtp,
      }),
      "FORBIDDEN",
    );
    await expectCode(
      runtime.service.sign(a, {
        documentId: bDoc.id,
        envelopeId,
        signatureMethod: "type",
        typedSignatureText: "A",
        consentAccepted: true,
        otpChallengeId: fakeOtp,
      }),
      "FORBIDDEN",
    );
    await expectCode(
      runtime.repository.signDocument(firmA, clientA, {
        documentId: bDoc.id,
        envelopeId,
        signatureMethod: "type",
        typedSignatureText: "A",
        consentAccepted: true,
        otpChallengeId: fakeOtp,
      }),
      "FORBIDDEN",
    );
    const sequentialDoc = await addDocument(firmA, clientA, clientA, "sequential", {
      viewed: true,
    });
    const sequentialId = await addEnvelope(sequentialDoc.id, [clientA, clientB], "sequential");
    await expectCode(
      runtime.service.sign(principal(clientB), {
        documentId: sequentialDoc.id,
        envelopeId: sequentialId,
        signatureMethod: "type",
        typedSignatureText: "B",
        consentAccepted: true,
        otpChallengeId: fakeOtp,
      }),
      "FORBIDDEN",
    );
    await expectCode(
      runtime.repository.signDocument(firmA, clientB, {
        documentId: sequentialDoc.id,
        envelopeId: sequentialId,
        signatureMethod: "type",
        typedSignatureText: "B",
        consentAccepted: true,
        otpChallengeId: fakeOtp,
      }),
      "FORBIDDEN",
    );
    await expectCode(
      runtime.service.decline(principal(clientB), sequentialId, { reason: "not my turn" }),
      "FORBIDDEN",
    );
    await expectCode(
      runtime.service.sign(a, {
        documentId: foreignDoc.id,
        signatureMethod: "type",
        typedSignatureText: "A",
        consentAccepted: true,
        otpChallengeId: fakeOtp,
      }),
      "NOT_FOUND",
    );
    await expectCode(
      runtime.repository.signDocument(firmA, clientA, {
        documentId: foreignDoc.id,
        signatureMethod: "type",
        typedSignatureText: "A",
        consentAccepted: true,
        otpChallengeId: fakeOtp,
      }),
      "NOT_FOUND",
    );
  });
});
