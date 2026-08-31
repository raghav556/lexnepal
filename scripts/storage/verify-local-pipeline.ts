import { sha256Hex } from "../../src/server/storage/file-validation";
import { resolveCapabilities } from "../../src/server/auth/capabilities";
import type { AuthPrincipal, AuthUser } from "../../src/server/auth/types";
import { getDatabase } from "../../src/server/db/client";
import { firms, users } from "../../src/server/db/schema";
import { getServerEnvironment } from "../../src/server/env";
import { createJobWorker } from "../../src/server/jobs/runtime";
import { PostgresDocumentStorageRepository } from "../../src/server/repositories/document-storage-repository";
import { S3ObjectStorage } from "../../src/server/storage/s3-object-storage";
import { getDocumentStorageRuntime } from "../../src/server/storage/runtime";

const firmA = "61000000-0000-4000-8000-000000000001";
const firmB = "61000000-0000-4000-8000-000000000002";
const userA = "62000000-0000-4000-8000-000000000001";
const userB = "62000000-0000-4000-8000-000000000002";
const database = getDatabase();

await database
  .insert(firms)
  .values([
    { id: firmA, name: "Phase 6 Firm A", slug: "phase-6-firm-a" },
    { id: firmB, name: "Phase 6 Firm B", slug: "phase-6-firm-b" },
  ])
  .onConflictDoNothing();
await database
  .insert(users)
  .values([
    {
      id: userA,
      firmId: firmA,
      tokenIdentifier: "phase6:user-a",
      name: "Phase 6 User A",
      email: "phase6-a@example.invalid",
      role: "admin",
      isActive: true,
      isPending: false,
    },
    {
      id: userB,
      firmId: firmB,
      tokenIdentifier: "phase6:user-b",
      name: "Phase 6 User B",
      email: "phase6-b@example.invalid",
      role: "admin",
      isActive: true,
      isPending: false,
    },
  ])
  .onConflictDoNothing();

const principalA = principal(firmA, userA);
const principalB = principal(firmB, userB);
const runtime = getDocumentStorageRuntime();
const repository = new PostgresDocumentStorageRepository();
const environment = getServerEnvironment();
if (!environment.OBJECT_STORAGE_BUCKET) throw new Error("OBJECT_STORAGE_BUCKET is required");
const storage = new S3ObjectStorage({
  bucket: environment.OBJECT_STORAGE_BUCKET,
  region: environment.OBJECT_STORAGE_REGION,
  endpoint: environment.OBJECT_STORAGE_ENDPOINT,
  forcePathStyle: environment.OBJECT_STORAGE_FORCE_PATH_STYLE,
  serverSideEncryption: environment.OBJECT_STORAGE_SSE === "aes256" ? "AES256" : "none",
});

const cleanBytes = new TextEncoder().encode("%PDF-1.7\nLexNepal clean Phase 6 document\n");
const cleanIntentId = await upload(principalA, "phase-6-clean.pdf", "application/pdf", cleanBytes);
let crossFirmCompletionDenied = false;
try {
  await runtime.pipeline.completeUpload(principalB, cleanIntentId);
} catch (error) {
  crossFirmCompletionDenied = isAuthorizationFailure(error);
}
if (!crossFirmCompletionDenied) throw new Error("Cross-firm upload completion was not denied");

await runtime.pipeline.completeUpload(principalA, cleanIntentId);
const cleanScan = await processUntilSettled(cleanIntentId, "promoted", "phase-6-live-clean");
if (cleanScan !== "clean") throw new Error(`Expected a clean scan, received ${cleanScan}`);
const cleanIntent = await repository.getIntent(cleanIntentId);
if (!cleanIntent?.documentId || cleanIntent.status !== "promoted" || !cleanIntent.protectedKey) {
  throw new Error("Clean upload was not promoted into a document");
}
if (await storage.headObject(cleanIntent.quarantineKey)) {
  throw new Error("Clean upload remained in quarantine after promotion");
}
if (!(await storage.headObject(cleanIntent.protectedKey))) {
  throw new Error("Promoted clean object is missing from protected storage");
}
const authorizedDownload = await runtime.downloads.createAuthorizedDownload(
  principalA,
  cleanIntent.documentId,
);
const downloadedBytes = new Uint8Array(await (await fetch(authorizedDownload.url)).arrayBuffer());
if (sha256Hex(downloadedBytes) !== sha256Hex(cleanBytes)) {
  throw new Error("Authorized download checksum did not match the upload");
}
let crossFirmDownloadDenied = false;
try {
  await runtime.downloads.createAuthorizedDownload(principalB, cleanIntent.documentId);
} catch (error) {
  crossFirmDownloadDenied = isAuthorizationFailure(error);
}
if (!crossFirmDownloadDenied) throw new Error("Cross-firm document download was not denied");
let unauthorizedDownloadDenied = false;
try {
  await runtime.downloads.createAuthorizedDownload(
    principal(firmA, "62000000-0000-4000-8000-000000000099", "client"),
    cleanIntent.documentId,
  );
} catch (error) {
  unauthorizedDownloadDenied = isAuthorizationFailure(error);
}
if (!unauthorizedDownloadDenied) throw new Error("Unauthorized document download was not denied");

let oversizedDenied = false;
try {
  await runtime.pipeline.createUploadIntent(principalA, {
    fileName: "phase-6-oversized.pdf",
    mimeType: "application/pdf",
    sizeBytes: 50 * 1024 * 1024 + 1,
  });
} catch (error) {
  oversizedDenied =
    Boolean(error) &&
    typeof error === "object" &&
    ((error as { code?: string }).code === "VALIDATION_FAILED" ||
      String((error as Error).message ?? "")
        .toLowerCase()
        .includes("50 mb"));
}
if (!oversizedDenied) throw new Error("Oversized upload intent was not rejected");

const eicarBytes = new TextEncoder().encode(
  ["X5O!P%@AP[4\\PZX54(P^)", "7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"].join(""),
);
const infectedIntentId = await upload(principalA, "phase-6-eicar.txt", "text/plain", eicarBytes);
await runtime.pipeline.completeUpload(principalA, infectedIntentId);
const infectedScan = await processUntilSettled(
  infectedIntentId,
  "rejected",
  "phase-6-live-infected",
);
if (infectedScan !== "infected") {
  throw new Error(`Expected an infected scan, received ${infectedScan}`);
}
const infectedIntent = await repository.getIntent(infectedIntentId);
if (infectedIntent?.status !== "rejected") throw new Error("EICAR upload was not rejected");
if (await storage.headObject(infectedIntent.quarantineKey)) {
  throw new Error("Rejected upload remained in quarantine");
}
const rejectedObjects = await storage.listKeys(`rejected/${firmA}/${infectedIntentId}/`);
if (rejectedObjects.length !== 1) throw new Error("Rejected EICAR object is missing");

process.stdout.write(
  `${JSON.stringify({
    clean: {
      intentId: cleanIntentId,
      documentId: cleanIntent.documentId,
      sha256: sha256Hex(cleanBytes),
      promoted: true,
      downloaded: true,
    },
    infected: { intentId: infectedIntentId, rejected: true },
    oversized: { denied: oversizedDenied },
    authorization: {
      unauthorizedDownloadDenied,
      crossFirmCompletionDenied,
      crossFirmDownloadDenied,
    },
  })}\n`,
);

async function upload(
  actor: AuthPrincipal,
  fileName: string,
  mimeType: string,
  bytes: Uint8Array,
): Promise<string> {
  const created = await runtime.pipeline.createUploadIntent(actor, {
    fileName,
    mimeType,
    sizeBytes: bytes.byteLength,
    sha256: sha256Hex(bytes),
  });
  const form = new FormData();
  for (const [name, value] of Object.entries(created.upload.fields)) form.set(name, value);
  form.set("file", new Blob([bytes], { type: mimeType }), fileName);
  const response = await fetch(created.upload.url, { method: "POST", body: form });
  if (!response.ok) throw new Error(`MinIO upload failed with HTTP ${response.status}`);
  return created.intentId;
}

function principal(firmId: string, id: string, role: AuthUser["role"] = "admin"): AuthPrincipal {
  const user: AuthUser = {
    id,
    firmId,
    tokenIdentifier: `phase6:${id}`,
    name: "Phase 6 Administrator",
    email: `${id}@example.invalid`,
    role,
    isActive: true,
    isPending: false,
    avatar: null,
    phone: null,
  };
  return {
    user,
    firmId,
    capabilities: resolveCapabilities(role, undefined),
    sessionId: `phase6-session-${id}`,
    authenticationMethod: "session_cookie",
  };
}

function isAuthorizationFailure(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; status?: number };
  return (
    candidate.code === "FORBIDDEN" ||
    candidate.code === "NOT_FOUND" ||
    candidate.status === 403 ||
    candidate.status === 404
  );
}

async function processUntilSettled(
  intentId: string,
  expectedStatus: "promoted" | "rejected",
  workerId: string,
): Promise<"clean" | "infected"> {
  // Local queues can accumulate unrelated jobs (e.g. Mailpit email from CMS verify).
  // Drain generously; only stop after a short idle streak so a just-enqueued scan can appear.
  let idleStreak = 0;
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const intent = await repository.getIntent(intentId);
    if (intent?.status === expectedStatus) {
      return expectedStatus === "promoted" ? "clean" : "infected";
    }
    const result = await createJobWorker(`${workerId}-${attempt}`).runOnce();
    if (result === "idle") {
      idleStreak += 1;
      if (idleStreak >= 8) break;
      await new Promise((resolve) => setTimeout(resolve, 75));
      continue;
    }
    idleStreak = 0;
  }
  throw new Error(`Upload intent ${intentId} did not reach ${expectedStatus}`);
}
