/**
 * Disposable, database-backed signing verifier. Never uses the preview Client or
 * the database named by DATABASE_URL for writes; see signing-test-database.ts.
 * OTPs stay in this server-side process and are never logged.
 */
import { createHash, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import sharp from "sharp";
import {
  clients,
  documents,
  durableJobEffects,
  durableJobs,
  firms,
  notifications,
  signatureArtifactUploadIntents,
  signatureEnvelopes,
  signatureRecipients,
  users,
} from "../../db/schema";
import { createSigningTestDatabase } from "../../tests/support/signing-test-database";
import type { AuthPrincipal, UserRole } from "../../src/server/auth/types";

function check(value: unknown, label: string): asserts value {
  if (!value) throw new Error(label);
}

function pass(label: string) {
  process.stdout.write(`PASS ${label}\n`);
}

async function denied(action: Promise<unknown>, code: string, label: string) {
  try {
    await action;
  } catch (error) {
    check((error as { code?: string }).code === code, label);
    return;
  }
  throw new Error(label);
}

async function main() {
  const sandbox = await createSigningTestDatabase();
  let closeDatabase: () => Promise<void> = async () => undefined;
  let capturedMailId: string | undefined;
  try {
    const [dbModule, serviceModule, documentModule, storageModule, capabilityModule, jobModule] =
      await Promise.all([
        import("../../src/server/db/client"),
        import("../../src/server/services/envelope-service"),
        import("../../src/server/services/document-service"),
        import("../../src/server/storage/runtime"),
        import("../../src/server/auth/capabilities"),
        import("../../src/server/jobs/runtime"),
      ]);
    closeDatabase = dbModule.closeDatabase;
    const db = dbModule.getDatabase();
    const signing = new serviceModule.EnvelopeService();
    const documentService = new documentModule.DocumentService();
    const storageRuntime = storageModule.getDocumentStorageRuntime();
    const realScan = storageRuntime.scanner.scan.bind(storageRuntime.scanner);
    let scanInvocations = 0;
    const scanProviders = new Set<string>();
    storageRuntime.scanner.scan = async (bytes, mimeType) => {
      const result = await realScan(bytes, mimeType);
      scanInvocations++;
      scanProviders.add(result.provider);
      return result;
    };
    const worker = jobModule.createJobWorker(`signing-verifier-${randomUUID()}`);
    const prefix = `signing-verifier-${randomUUID()}`;
    const png = await sharp({
      create: { width: 64, height: 32, channels: 4, background: "#ffffff" },
    })
      .png()
      .toBuffer();
    const jpeg = await sharp({
      create: { width: 64, height: 32, channels: 3, background: "#ffffff" },
    })
      .jpeg()
      .toBuffer();
    const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

    async function addFirm(label: string) {
      const id = randomUUID();
      await db.insert(firms).values({ id, name: `${prefix} ${label}`, slug: `${prefix}-${label}` });
      return id;
    }
    async function addUser(firmId: string, role: UserRole, label: string) {
      const id = randomUUID();
      const email = `${label}-${id}@signing-verifier.invalid`;
      await db.insert(users).values({
        id,
        firmId,
        tokenIdentifier: `${prefix}|${id}`,
        name: `${label} signer`,
        email,
        role,
      });
      return { id, email, firmId, role };
    }
    function principal(
      account: Awaited<ReturnType<typeof addUser>>,
      email = "caller-supplied@example.invalid",
    ): AuthPrincipal {
      return {
        firmId: account.firmId,
        user: {
          id: account.id,
          firmId: account.firmId,
          tokenIdentifier: `${prefix}|${account.id}`,
          name: "Verifier actor",
          email,
          role: account.role,
          isActive: true,
          isPending: false,
          avatar: null,
          phone: null,
        },
        capabilities: capabilityModule.resolveCapabilities(account.role, undefined),
        sessionId: `verifier-${account.id}`,
        authenticationMethod: "session_cookie",
      };
    }
    async function addClient(account: Awaited<ReturnType<typeof addUser>>) {
      await db.insert(clients).values({
        id: randomUUID(),
        firmId: account.firmId,
        userId: account.id,
        type: "individual",
        fullName: `Verifier ${account.id}`,
        email: account.email,
      });
    }
    async function addDocument(firmId: string, uploadedBy: string, label: string) {
      const id = randomUUID();
      const key = `protected/${firmId}/signing-verifier/${id}/source.png`;
      const sha256 = digest(png);
      await storageRuntime.storage.putObject(key, png, "image/png", { sha256 });
      await db.insert(documents).values({
        id,
        firmId,
        documentNumber: `SIGN-${id}`,
        title: `${prefix} ${label}`,
        type: "contract",
        storageId: key,
        mimeType: "image/png",
        sizeBytes: png.byteLength,
        sha256,
        uploadedBy,
        uploadStatus: "clean",
        confidentialityLevel: "confidential",
      });
      return { id, key, sha256 };
    }
    async function storedDocument(id: string) {
      const [document] = await db.select().from(documents).where(eq(documents.id, id));
      check(document, "Controlled document was not found");
      return document;
    }
    async function requestDirect(documentId: string, signerId: string) {
      await signing.requestSignature(principal(staff), {
        documentId,
        intendedSignerUserId: signerId,
      });
    }
    async function envelope(
      documentId: string,
      recipientUserIds: string[],
      routing: "parallel" | "sequential",
    ) {
      const created = await signing.create(principal(staff), {
        documentId,
        routing,
        recipientUserIds,
      });
      await signing.send(principal(staff), created.envelopeId);
      return created.envelopeId;
    }
    async function previewAndView(documentId: string, signer = clientA) {
      const actor = principal(signer);
      const metadata = await documentService.get(actor, documentId);
      check(metadata, "Authorized document metadata was unavailable");
      const download = await storageRuntime.downloads.createAuthorizedDownload(actor, documentId);
      check(
        download.url.includes("/api/v1/storage/objects/") && download.url.includes("token="),
        "Authorized preview URL was unavailable",
      );
      // Read the disposable protected object server-side. Do not follow the URL:
      // APP_PUBLIC_URL points to the owner's independent localhost:3001 preview.
      const protectedBytes = await storageRuntime.storage.readObject(
        (await storedDocument(documentId)).storageId,
      );
      check(
        digest(protectedBytes) === (await storedDocument(documentId)).sha256,
        "Protected preview content did not match its authoritative hash",
      );
      const viewed = await signing.markViewed(actor, { documentId });
      check(
        Boolean(viewed.viewedAt) && Boolean((await storedDocument(documentId)).viewedAt),
        "Viewed state was not recorded",
      );
    }
    async function issueAndVerify(documentId: string, signer = clientA, envelopeId?: string) {
      const request = { documentId, envelopeId, email: "attacker@example.invalid" };
      const response = await signing.issueOtp(principal(signer), request);
      check(
        typeof response.challengeId === "string" && typeof response.expiresAt === "number",
        "OTP response metadata is incomplete",
      );
      check(
        !("demoCode" in response) && !("code" in response),
        "OTP response exposed a code field",
      );
      const [job] = await db
        .select()
        .from(durableJobs)
        .where(eq(durableJobs.idempotencyKey, `esign-otp:${response.challengeId}`));
      check(job?.type === "communication.email", "OTP email job was not queued");
      const payload = job.payload as { to?: string; text?: string };
      check(
        payload.to === signer.email && payload.to !== request.email,
        "OTP recipient was not server-derived",
      );
      const code = payload.text?.match(/verification code is (\d{6})/)?.[1];
      check(
        code && !JSON.stringify(response).includes(code),
        "OTP appeared in the browser response",
      );
      const inApp = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, signer.id));
      check(
        inApp.every((item) => !JSON.stringify(item).includes(code)),
        "OTP appeared in an in-app notification",
      );
      await denied(
        signing.verifyOtp(principal(signer === clientA ? clientB : clientA), {
          challengeId: response.challengeId,
          code,
        }),
        "NOT_FOUND",
        "Another user verified the OTP",
      );
      await signing.verifyOtp(principal(signer), { challengeId: response.challengeId, code });
      return { response, job, code };
    }
    async function artifact(
      documentId: string,
      bytes: Buffer,
      mimeType: "image/png" | "image/jpeg",
      signer = clientA,
    ) {
      const intent = await signing.createSignatureArtifactIntent(principal(signer), {
        documentId,
        fileName: mimeType === "image/png" ? "draw.png" : "uploaded.jpg",
        mimeType,
        sizeBytes: bytes.byteLength,
        sha256: digest(bytes),
      });
      const grant = intent.upload.fields as { grantId?: string };
      check(grant.grantId, "Signature artifact upload grant was missing");
      await storageRuntime.storage.storeGrantedUpload(grant.grantId, bytes);
      const [pending] = await db
        .select()
        .from(signatureArtifactUploadIntents)
        .where(eq(signatureArtifactUploadIntents.id, intent.intentId));
      check(
        pending?.firmId === signer.firmId &&
          pending.userId === signer.id &&
          pending.documentId === documentId &&
          pending.status === "pending" &&
          pending.quarantineKey.startsWith(`quarantine/${signer.firmId}/`),
        "Artifact intent was not bound to its signer and document in quarantine",
      );
      const scansBeforeCompletion = scanInvocations;
      const completed = await signing.completeSignatureArtifactIntent(
        principal(signer),
        intent.intentId,
      );
      check(
        completed.status === "promoted" && scanInvocations > scansBeforeCompletion,
        "Signature artifact did not complete validation and scan processing",
      );
      const [promoted] = await db
        .select()
        .from(signatureArtifactUploadIntents)
        .where(eq(signatureArtifactUploadIntents.id, intent.intentId));
      check(
        promoted?.status === "promoted" && Boolean(promoted.protectedKey),
        "Signature artifact was not promoted",
      );
      check(
        promoted.protectedKey!.startsWith(
          `protected/${signer.firmId}/signature-artifacts/${signer.id}/${documentId}/`,
        ) &&
          Boolean(await storageRuntime.storage.headObject(promoted.protectedKey!)) &&
          !(await storageRuntime.storage.headObject(promoted.quarantineKey)),
        "Artifact quarantine/promotion storage transition failed",
      );
      return { intentId: intent.intentId, protectedKey: promoted.protectedKey! };
    }

    const firmA = await addFirm("a");
    const firmB = await addFirm("b");
    const staff = await addUser(firmA, "associate", "staff");
    const clientA = await addUser(firmA, "client", "client-a");
    const clientB = await addUser(firmA, "client", "client-b");
    const foreign = await addUser(firmB, "client", "foreign-client");
    await Promise.all([addClient(clientA), addClient(clientB), addClient(foreign)]);
    pass("provisioning");

    const typedDoc = await addDocument(firmA, staff.id, "typed signing");
    const drawDoc = await addDocument(firmA, staff.id, "draw signing");
    const uploadDoc = await addDocument(firmA, staff.id, "uploaded image signing");
    const bDoc = await addDocument(firmA, staff.id, "client-b signing");
    const overlapDoc = await addDocument(firmA, staff.id, "envelope overlap");
    const sequentialDoc = await addDocument(firmA, staff.id, "sequential signing");
    const declineDoc = await addDocument(firmA, staff.id, "decline signing");
    const foreignDoc = await addDocument(firmB, foreign.id, "foreign signing");
    await Promise.all([
      requestDirect(typedDoc.id, clientA.id),
      requestDirect(drawDoc.id, clientA.id),
      requestDirect(uploadDoc.id, clientA.id),
      requestDirect(bDoc.id, clientB.id),
    ]);
    const overlapEnvelope = await envelope(overlapDoc.id, [clientA.id], "parallel");
    const sequentialEnvelope = await envelope(
      sequentialDoc.id,
      [clientA.id, clientB.id],
      "sequential",
    );
    const declineEnvelope = await envelope(declineDoc.id, [clientA.id], "parallel");
    const inbox = await signing.listSigningInbox(principal(clientA));
    check(
      inbox.pendingDirect.some((item) => item.document.id === typedDoc.id),
      "Own direct signing request missing",
    );
    check(
      !inbox.pendingDirect.some((item) => item.document.id === bDoc.id),
      "Foreign direct action leaked",
    );
    check(
      inbox.pendingEnvelopes.filter(
        (item) => item.document?.id === overlapDoc.id && item.envelopeId === overlapEnvelope,
      ).length === 1,
      "Envelope action missing or duplicated",
    );
    check(
      !inbox.pendingDirect.some((item) => item.document.id === overlapDoc.id),
      "Envelope/direct overlap was duplicated",
    );
    const bInbox = await signing.listSigningInbox(principal(clientB));
    check(
      !bInbox.pendingEnvelopes.some((item) => item.envelopeId === sequentialEnvelope),
      "Future sequential recipient was active",
    );
    check(
      !/storageId|protectedKey|quarantineKey|uploadIntentId|protected\/|quarantine\//i.test(
        JSON.stringify(inbox),
      ),
      "Signing inbox leaked private storage internals",
    );
    pass("signer inbox");

    await denied(
      documentService.get(principal(clientB), typedDoc.id),
      "FORBIDDEN",
      "Another Client opened the signing document",
    );
    await denied(
      documentService.get(principal(clientA), foreignDoc.id),
      "NOT_FOUND",
      "Cross-firm document access succeeded",
    );
    await denied(
      signing.sign(principal(clientA), {
        documentId: typedDoc.id,
        signatureMethod: "type",
        typedSignatureText: "Client A",
        consentAccepted: true,
        otpChallengeId: randomUUID(),
      }),
      "CONFLICT",
      "Signing without preview was possible",
    );
    await previewAndView(typedDoc.id);
    pass("preview/viewed");

    const typedOtp = await issueAndVerify(typedDoc.id);
    pass("OTP secrecy");
    pass("email job");
    pass("OTP verify");
    // Only the disposable verifier queue is processed; no worker touches owner data.
    let emailCompleted = false;
    for (let attempt = 0; attempt < 12; attempt++) {
      await worker.runOnce();
      const [current] = await db
        .select()
        .from(durableJobs)
        .where(eq(durableJobs.id, typedOtp.job.id));
      if (current?.status === "completed") {
        emailCompleted = true;
        break;
      }
    }
    check(emailCompleted, "The real communication.email worker did not complete the OTP job");
    const [sentEffect] = await db
      .select()
      .from(durableJobEffects)
      .where(eq(durableJobEffects.jobId, typedOtp.job.id));
    check(sentEffect?.effectKey === "smtp-sent", "The email job was not delivered by SMTP");
    for (let attempt = 0; attempt < 15 && !capturedMailId; attempt++) {
      const response = await fetch("http://127.0.0.1:8025/api/v1/messages?limit=100");
      check(response.ok, "Mailpit capture API was unavailable");
      const listing = (await response.json()) as {
        messages?: Array<{ ID?: string; To?: Array<{ Address?: string }> }>;
      };
      capturedMailId = listing.messages?.find((message) =>
        message.To?.some((to) => to.Address === clientA.email),
      )?.ID;
      if (!capturedMailId) await new Promise((resolve) => setTimeout(resolve, 200));
    }
    check(capturedMailId, "Mailpit did not capture the delivered verifier email");
    pass("SMTP/Mailpit delivery");

    await signing.sign(principal(clientA), {
      documentId: typedDoc.id,
      signatureMethod: "type",
      typedSignatureText: "Client A",
      consentAccepted: true,
      otpChallengeId: typedOtp.response.challengeId,
    });
    const signedTyped = await storedDocument(typedDoc.id);
    check(
      signedTyped.signatureStatus === "signed" &&
        signedTyped.signedByUserId === clientA.id &&
        signedTyped.signatureMethod === "type" &&
        signedTyped.signConsentVersion === "esign-consent-v1" &&
        Boolean(signedTyped.signConsentAt) &&
        Boolean(signedTyped.signedAt) &&
        signedTyped.sha256 === typedDoc.sha256,
      "Typed signature evidence or authoritative SHA was incorrect",
    );
    pass("typed signing");

    await previewAndView(drawDoc.id);
    const drawOtp = await issueAndVerify(drawDoc.id);
    const drawn = await artifact(drawDoc.id, png, "image/png");
    check(drawn.protectedKey !== drawn.intentId, "Protected storage ID was browser-authoritative");
    await signing.sign(principal(clientA), {
      documentId: drawDoc.id,
      signatureMethod: "draw",
      signatureArtifactIntentId: drawn.intentId,
      consentAccepted: true,
      otpChallengeId: drawOtp.response.challengeId,
    });
    check(
      (await storedDocument(drawDoc.id)).signatureArtifactStorageId === drawn.protectedKey &&
        (await storedDocument(drawDoc.id)).sha256 === drawDoc.sha256,
      "Draw signature or SHA preservation failed",
    );
    pass("draw signing");

    await previewAndView(uploadDoc.id);
    const uploadOtp = await issueAndVerify(uploadDoc.id);
    await denied(
      signing.sign(principal(clientA), {
        documentId: uploadDoc.id,
        signatureMethod: "upload",
        signatureArtifactIntentId: drawn.intentId,
        consentAccepted: true,
        otpChallengeId: uploadOtp.response.challengeId,
      }),
      "FORBIDDEN",
      "A signature artifact was accepted for another document",
    );
    const uploaded = await artifact(uploadDoc.id, jpeg, "image/jpeg");
    await signing.sign(principal(clientA), {
      documentId: uploadDoc.id,
      signatureMethod: "upload",
      signatureArtifactIntentId: uploaded.intentId,
      consentAccepted: true,
      otpChallengeId: uploadOtp.response.challengeId,
    });
    check(
      (await storedDocument(uploadDoc.id)).signatureArtifactStorageId === uploaded.protectedKey &&
        (await storedDocument(uploadDoc.id)).sha256 === uploadDoc.sha256,
      "Uploaded-image signature or SHA preservation failed",
    );
    pass("uploaded-image signing");
    pass(`scanner invocation (${[...scanProviders].join(", ")})`);
    pass("SHA integrity");

    const misuseDoc = await addDocument(firmA, staff.id, "artifact transfer denial");
    await requestDirect(misuseDoc.id, clientA.id);
    const transferredArtifact = await artifact(misuseDoc.id, png, "image/png");
    await requestDirect(misuseDoc.id, clientB.id);
    await previewAndView(misuseDoc.id, clientB);
    const bOtp = await issueAndVerify(misuseDoc.id, clientB);
    await denied(
      signing.sign(principal(clientB), {
        documentId: misuseDoc.id,
        signatureMethod: "draw",
        signatureArtifactIntentId: transferredArtifact.intentId,
        consentAccepted: true,
        otpChallengeId: bOtp.response.challengeId,
      }),
      "FORBIDDEN",
      "Another signer adopted the promoted artifact",
    );
    pass("artifact misuse denial");

    const [future] = await db
      .select()
      .from(signatureRecipients)
      .where(
        and(
          eq(signatureRecipients.envelopeId, sequentialEnvelope),
          eq(signatureRecipients.userId, clientB.id),
        ),
      );
    check(
      future?.status === "awaiting_turn",
      "Sequential future recipient did not start awaiting_turn",
    );
    await denied(
      signing.sign(principal(clientB), {
        documentId: sequentialDoc.id,
        envelopeId: sequentialEnvelope,
        signatureMethod: "type",
        typedSignatureText: "Client B",
        consentAccepted: true,
        otpChallengeId: randomUUID(),
      }),
      "FORBIDDEN",
      "Future sequential recipient signed before their turn",
    );
    await previewAndView(sequentialDoc.id);
    const sequentialOtp = await issueAndVerify(sequentialDoc.id, clientA, sequentialEnvelope);
    await signing.sign(principal(clientA), {
      documentId: sequentialDoc.id,
      envelopeId: sequentialEnvelope,
      signatureMethod: "type",
      typedSignatureText: "Client A",
      consentAccepted: true,
      otpChallengeId: sequentialOtp.response.challengeId,
    });
    const [advanced] = await db
      .select()
      .from(signatureRecipients)
      .where(
        and(
          eq(signatureRecipients.envelopeId, sequentialEnvelope),
          eq(signatureRecipients.userId, clientB.id),
        ),
      );
    check(advanced?.status === "pending", "Sequential routing did not advance the second signer");
    check(
      (await storedDocument(sequentialDoc.id)).sha256 === sequentialDoc.sha256,
      "Envelope signing changed the authoritative SHA",
    );
    pass("sequential routing");

    await denied(
      signing.decline(principal(clientB), declineEnvelope, { reason: "Not active" }),
      "FORBIDDEN",
      "Foreign recipient declined the envelope",
    );
    const declined = await signing.decline(principal(clientA), declineEnvelope, {
      reason: "Controlled verifier decline",
    });
    const [declinedEnvelope] = await db
      .select()
      .from(signatureEnvelopes)
      .where(eq(signatureEnvelopes.id, declineEnvelope));
    const [declinedRecipient] = await db
      .select()
      .from(signatureRecipients)
      .where(
        and(
          eq(signatureRecipients.envelopeId, declineEnvelope),
          eq(signatureRecipients.userId, clientA.id),
        ),
      );
    check(
      declined.status === "declined" &&
        declinedEnvelope?.status === "declined" &&
        declinedRecipient?.status === "declined",
      "Active decline did not persist real domain statuses",
    );
    pass("decline");

    await previewAndView(bDoc.id, clientB);
    const signedBOtp = await issueAndVerify(bDoc.id, clientB);
    await signing.sign(principal(clientB), {
      documentId: bDoc.id,
      signatureMethod: "type",
      typedSignatureText: "Client B",
      consentAccepted: true,
      otpChallengeId: signedBOtp.response.challengeId,
    });
    const history = await signing.listSigningInbox(principal(clientA));
    const ownSignedIds = new Set(history.recentlySigned.map((item) => item.document.id));
    check(
      [typedDoc.id, drawDoc.id, uploadDoc.id, sequentialDoc.id].every((id) => ownSignedIds.has(id)),
      "Current signer's completed history is incomplete",
    );
    check(!ownSignedIds.has(bDoc.id), "Another Client's signed record leaked into history");
    check(
      !history.pendingDirect.some((item) => item.document.id === typedDoc.id),
      "Completed document remained a pending direct action",
    );
    check(
      !/storageId|protectedKey|quarantineKey|uploadIntentId|protected\/|quarantine\//i.test(
        JSON.stringify(history),
      ),
      "Signing history leaked private storage internals",
    );
    pass("signed history");
  } finally {
    try {
      if (capturedMailId) {
        // The captured message was addressed to this verifier's unique Client.
        // Never delete the shared Mailpit inbox or other users' messages.
        const deletion = await fetch("http://127.0.0.1:8025/api/v1/messages", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ IDs: [capturedMailId] }),
        });
        check(deletion.ok, "Verifier Mailpit message cleanup failed");
      }
    } finally {
      await sandbox.dispose(closeDatabase);
    }
    pass("cleanup");
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown failure";
  process.stderr.write(`FAIL signing verifier: ${message.replace(/\b\d{6}\b/g, "[redacted]")}\n`);
  process.exitCode = 1;
});
