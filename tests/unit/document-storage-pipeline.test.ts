import { describe, expect, it } from "vitest";
import { resolveCapabilities } from "@/server/auth/capabilities";
import type { AuthPrincipal, AuthUser } from "@/server/auth/types";
import type { AuthorizationDataSource } from "@/server/policies/authorization";
import { DocumentDownloadService } from "@/server/storage/document-download";
import {
  DocumentPipelineService,
  type DocumentPipelineRepository,
  type ScanJobRecord,
  type UploadIntentRecord,
} from "@/server/storage/document-pipeline";
import { RetryableScanError, type DocumentScanner } from "@/server/storage/document-scanner";
import { sha256Hex } from "@/server/storage/file-validation";
import type { ObjectStorage, StoredObject, UploadGrant } from "@/server/storage/object-storage";
import { migrateLegacyStorage } from "@/server/storage/storage-migration";

const now = new Date("2026-08-02T00:00:00.000Z");
const pdf = new TextEncoder().encode("%PDF-1.7\nclean test document");

function principal(
  role: AuthUser["role"] = "partner",
  firmId = "firm-1",
  userId = "user-1",
): AuthPrincipal {
  const user: AuthUser = {
    id: userId,
    firmId,
    tokenIdentifier: `issuer|${userId}`,
    name: "Test User",
    email: "test@example.com",
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
    sessionId: "session-1",
    authenticationMethod: "session_cookie",
  };
}

const authorization: AuthorizationDataSource = {
  getCase: async () => null,
  getClient: async () => null,
  getClientByUser: async () => null,
  getDocument: async (id) => ({
    id,
    firmId: "firm-1",
    caseId: null,
    uploadedBy: "user-1",
    intendedSignerUserId: null,
    isTemplate: false,
    isPrivileged: false,
    confidentialityLevel: "confidential",
    deletedAt: null,
  }),
};

class MemoryStorage implements ObjectStorage {
  readonly objects = new Map<
    string,
    { bytes: Uint8Array; contentType: string; metadata: Record<string, string> }
  >();
  lastGrantKey?: string;

  async createUploadGrant(input: {
    key: string;
    contentType: string;
    maxBytes: number;
    intentId: string;
    expiresInSeconds: number;
  }): Promise<UploadGrant> {
    this.lastGrantKey = input.key;
    return {
      url: "https://storage.test/upload",
      method: "POST",
      fields: { key: input.key, "x-amz-meta-upload-intent-id": input.intentId },
      expiresAt: new Date(now.getTime() + input.expiresInSeconds * 1000),
    };
  }

  async createDownloadUrl(key: string): Promise<string> {
    return `https://storage.test/download/${encodeURIComponent(key)}`;
  }

  async headObject(key: string): Promise<StoredObject | null> {
    const object = this.objects.get(key);
    return object
      ? {
          key,
          sizeBytes: object.bytes.byteLength,
          contentType: object.contentType,
          metadata: object.metadata,
        }
      : null;
  }

  async readObject(key: string): Promise<Uint8Array> {
    const object = this.objects.get(key);
    if (!object) throw new Error("Object not found");
    return object.bytes;
  }

  async putObject(
    key: string,
    bytes: Uint8Array,
    contentType: string,
    metadata: Record<string, string> = {},
  ): Promise<void> {
    this.objects.set(key, { bytes, contentType, metadata });
  }

  async copyObject(
    sourceKey: string,
    destinationKey: string,
    metadata?: Record<string, string>,
  ): Promise<void> {
    const source = this.objects.get(sourceKey);
    if (!source) throw new Error("Object not found");
    this.objects.set(destinationKey, { ...source, metadata: metadata ?? source.metadata });
  }

  async deleteObject(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async listKeys(prefix: string): Promise<string[]> {
    return [...this.objects.keys()].filter((key) => key.startsWith(prefix));
  }
}

class MemoryPipelineRepository implements DocumentPipelineRepository {
  intents = new Map<string, UploadIntentRecord>();
  jobs = new Map<string, ScanJobRecord & { status: string }>();

  async createIntent(intent: UploadIntentRecord): Promise<void> {
    this.intents.set(intent.id, intent);
  }

  async getIntent(intentId: string): Promise<UploadIntentRecord | null> {
    return this.intents.get(intentId) ?? null;
  }

  async markUploadedAndEnqueue(intentId: string, sha256: string): Promise<void> {
    const intent = this.intents.get(intentId)!;
    Object.assign(intent, { status: "scanning", actualSha256: sha256 });
    this.jobs.set("job-1", {
      id: "job-1",
      firmId: intent.firmId,
      uploadIntentId: intent.id,
      attempts: 0,
      maxAttempts: 2,
      status: "pending",
    });
  }

  async claimScanJob(): Promise<ScanJobRecord | null> {
    const job = [...this.jobs.values()].find((candidate) =>
      ["pending", "retry"].includes(candidate.status),
    );
    if (!job) return null;
    job.status = "processing";
    job.attempts += 1;
    return job;
  }

  async markRejected(input: {
    intentId: string;
    jobId?: string;
    code: string;
    details: string;
  }): Promise<void> {
    Object.assign(this.intents.get(input.intentId)!, {
      status: "rejected",
      failureCode: input.code,
      failureDetails: input.details,
    });
    if (input.jobId) this.jobs.get(input.jobId)!.status = "completed";
  }

  async markPromoted(input: {
    intentId: string;
    jobId: string;
    protectedKey: string;
    sha256: string;
  }): Promise<{ documentId: string }> {
    Object.assign(this.intents.get(input.intentId)!, {
      status: "promoted",
      protectedKey: input.protectedKey,
      actualSha256: input.sha256,
      documentId: "document-1",
    });
    this.jobs.get(input.jobId)!.status = "completed";
    return { documentId: "document-1" };
  }

  async retryScanJob(input: { jobId: string; deadLetter: boolean }): Promise<void> {
    const job = this.jobs.get(input.jobId)!;
    job.status = input.deadLetter ? "dead_letter" : "retry";
  }

  async listCleanupCandidates(): Promise<UploadIntentRecord[]> {
    return [];
  }

  async markExpired(intentId: string): Promise<void> {
    this.intents.get(intentId)!.status = "expired";
  }
}

function service(
  repository: MemoryPipelineRepository,
  storage: MemoryStorage,
  scanner: DocumentScanner,
  events: string[] = [],
) {
  return new DocumentPipelineService(repository, storage, authorization, scanner, {
    uploadTtlSeconds: 3600,
    uploadUrlTtlSeconds: 600,
    now: () => now,
    observe: (event) => events.push(event),
  });
}

async function createAndUpload(
  pipeline: DocumentPipelineService,
  storage: MemoryStorage,
  bytes = pdf,
  mimeType = "application/pdf",
): Promise<string> {
  const created = await pipeline.createUploadIntent(principal(), {
    fileName: "evidence.pdf",
    mimeType,
    sizeBytes: bytes.byteLength,
    sha256: sha256Hex(bytes),
  });
  await storage.putObject(storage.lastGrantKey!, bytes, mimeType, {
    "upload-intent-id": created.intentId,
  });
  return created.intentId;
}

describe("quarantine and scanning pipeline", () => {
  it("validates, scans and promotes a clean file", async () => {
    const repository = new MemoryPipelineRepository();
    const storage = new MemoryStorage();
    const pipeline = service(repository, storage, {
      scan: async () => ({ verdict: "clean", provider: "test-av", details: "OK" }),
    });
    const intentId = await createAndUpload(pipeline, storage);
    await expect(pipeline.completeUpload(principal(), intentId)).resolves.toEqual({
      status: "scanning",
    });
    await expect(pipeline.processNextScan("worker-1")).resolves.toBe("clean");
    const intent = repository.intents.get(intentId)!;
    expect(intent.status).toBe("promoted");
    expect(intent.protectedKey).toMatch(/^protected\/firm-1\//);
    expect(intent.actualSha256).toBe(sha256Hex(pdf));
    expect(storage.objects.has(intent.quarantineKey)).toBe(false);
    expect(storage.objects.has(intent.protectedKey!)).toBe(true);
  });

  it("rejects infected content into the rejected prefix", async () => {
    const repository = new MemoryPipelineRepository();
    const storage = new MemoryStorage();
    const pipeline = service(repository, storage, {
      scan: async () => ({ verdict: "infected", provider: "test-av", details: "EICAR FOUND" }),
    });
    const intentId = await createAndUpload(pipeline, storage);
    await pipeline.completeUpload(principal(), intentId);
    await expect(pipeline.processNextScan("worker-1")).resolves.toBe("infected");
    expect(repository.intents.get(intentId)?.status).toBe("rejected");
    expect(await storage.listKeys("rejected/firm-1/")).toHaveLength(1);
  });

  it("rejects MIME/magic-byte mismatches and oversized intent metadata", async () => {
    const repository = new MemoryPipelineRepository();
    const storage = new MemoryStorage();
    const pipeline = service(repository, storage, {
      scan: async () => ({ verdict: "clean", provider: "test-av", details: "OK" }),
    });
    const wrongBytes = new TextEncoder().encode("plain text pretending to be a PDF");
    const intentId = await createAndUpload(pipeline, storage, wrongBytes);
    await expect(pipeline.completeUpload(principal(), intentId)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      details: { reason: "MAGIC_BYTES_MISMATCH" },
    });
    expect(repository.intents.get(intentId)?.status).toBe("rejected");
    await expect(
      pipeline.createUploadIntent(principal(), {
        fileName: "too-large.pdf",
        mimeType: "application/pdf",
        sizeBytes: 50 * 1024 * 1024 + 1,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("retries failed scans with observable state and dead-letters exhausted jobs", async () => {
    const repository = new MemoryPipelineRepository();
    const storage = new MemoryStorage();
    const events: string[] = [];
    const pipeline = service(
      repository,
      storage,
      {
        scan: async () => {
          throw new RetryableScanError("scanner unavailable");
        },
      },
      events,
    );
    const intentId = await createAndUpload(pipeline, storage);
    await pipeline.completeUpload(principal(), intentId);
    await expect(pipeline.processNextScan("worker-1")).resolves.toBe("retry");
    await expect(pipeline.processNextScan("worker-1")).resolves.toBe("dead_letter");
    expect(events).toContain("document.scan.retry");
    expect(events).toContain("document.scan.dead_letter");
    expect(repository.jobs.get("job-1")?.attempts).toBe(2);
  });
});

describe("protected downloads and storage migration", () => {
  it("denies unauthorized document downloads before signing a URL", async () => {
    const storage = new MemoryStorage();
    const deniedAuthorization: AuthorizationDataSource = {
      ...authorization,
      getDocument: async (id) => ({
        id,
        firmId: "firm-1",
        caseId: null,
        uploadedBy: "another-user",
        intendedSignerUserId: null,
        isTemplate: false,
        isPrivileged: false,
        confidentialityLevel: "confidential",
        deletedAt: null,
      }),
    };
    const downloads = new DocumentDownloadService(
      deniedAuthorization,
      {
        getDownloadableDocument: async () => ({
          id: "document-1",
          firmId: "firm-1",
          storageKey: "protected/firm-1/document-1/hash",
          uploadStatus: "clean",
        }),
      },
      storage,
    );
    await expect(
      downloads.createAuthorizedDownload(principal("client", "firm-1", "client-1"), "document-1"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("preserves source count and SHA-256 during legacy storage migration", async () => {
    const storage = new MemoryStorage();
    const files = [
      { storageId: "legacy-1", mimeType: "application/pdf", bytes: pdf },
      {
        storageId: "legacy-2",
        mimeType: "text/plain",
        bytes: new TextEncoder().encode("legal note"),
      },
    ];
    const journal: Array<{ status: string; actualSha256: string | null }> = [];
    const report = await migrateLegacyStorage({
      firmId: "firm-1",
      source: {
        listFiles: async () =>
          files.map((file) => ({
            storageId: file.storageId,
            mimeType: file.mimeType,
            expectedSha256: sha256Hex(file.bytes),
          })),
        readFile: async (storageId) => files.find((file) => file.storageId === storageId)!.bytes,
      },
      destination: storage,
      journal: {
        record: async (entry) => {
          journal.push(entry);
        },
      },
    });
    expect(report).toMatchObject({
      sourceCount: 2,
      destinationCount: 2,
      verifiedCount: 2,
      failed: [],
    });
    expect(journal).toHaveLength(2);
    expect(journal.every((entry) => entry.status === "verified" && entry.actualSha256)).toBe(true);
  });
});
