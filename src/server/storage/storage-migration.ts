import "server-only";
import { sha256Hex } from "@/server/storage/file-validation";
import type { ObjectStorage } from "@/server/storage/object-storage";

export interface LegacyStorageFile {
  storageId: string;
  mimeType: string;
  expectedSha256?: string;
}

export interface LegacyStorageSource {
  listFiles(firmId: string): Promise<LegacyStorageFile[]>;
  readFile(storageId: string): Promise<Uint8Array>;
}

export interface StorageMigrationJournal {
  record(input: {
    firmId: string;
    legacyStorageId: string;
    destinationKey: string;
    expectedSha256: string | null;
    actualSha256: string | null;
    sizeBytes: number | null;
    status: "verified" | "failed";
    error?: string;
  }): Promise<void>;
}

export interface StorageMigrationReport {
  sourceCount: number;
  destinationCount: number;
  verifiedCount: number;
  failed: Array<{ storageId: string; reason: string }>;
}

export async function migrateLegacyStorage(input: {
  firmId: string;
  source: LegacyStorageSource;
  destination: ObjectStorage;
  journal: StorageMigrationJournal;
}): Promise<StorageMigrationReport> {
  const files = await input.source.listFiles(input.firmId);
  const destinationPrefix = `protected/${input.firmId}/migration/`;
  let verifiedCount = 0;
  const failed: StorageMigrationReport["failed"] = [];

  for (const file of files) {
    const safeStorageId = encodeURIComponent(file.storageId);
    let destinationKey = `${destinationPrefix}${safeStorageId}`;
    try {
      const bytes = await input.source.readFile(file.storageId);
      const sha256 = sha256Hex(bytes);
      if (file.expectedSha256 && file.expectedSha256.toLowerCase() !== sha256) {
        throw new Error("Source checksum does not match document metadata");
      }
      destinationKey = `${destinationPrefix}${safeStorageId}/${sha256}`;
      await input.destination.putObject(destinationKey, bytes, file.mimeType, {
        "legacy-storage-id": file.storageId,
        sha256,
      });
      const copied = await input.destination.readObject(destinationKey);
      const copiedSha256 = sha256Hex(copied);
      if (copied.byteLength !== bytes.byteLength || copiedSha256 !== sha256) {
        throw new Error("Destination size or checksum verification failed");
      }
      await input.journal.record({
        firmId: input.firmId,
        legacyStorageId: file.storageId,
        destinationKey,
        expectedSha256: file.expectedSha256 ?? sha256,
        actualSha256: copiedSha256,
        sizeBytes: copied.byteLength,
        status: "verified",
      });
      verifiedCount += 1;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown migration failure";
      failed.push({ storageId: file.storageId, reason });
      await input.journal.record({
        firmId: input.firmId,
        legacyStorageId: file.storageId,
        destinationKey,
        expectedSha256: file.expectedSha256 ?? null,
        actualSha256: null,
        sizeBytes: null,
        status: "failed",
        error: reason,
      });
    }
  }
  const destinationCount = (await input.destination.listKeys(destinationPrefix)).length;
  return { sourceCount: files.length, destinationCount, verifiedCount, failed };
}
