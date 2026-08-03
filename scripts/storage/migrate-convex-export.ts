import fs from "node:fs/promises";
import path from "node:path";
import { getServerEnvironment } from "../../src/server/env";
import { PostgresDocumentStorageRepository } from "../../src/server/repositories/document-storage-repository";
import { S3ObjectStorage } from "../../src/server/storage/s3-object-storage";
import { migrateLegacyStorage } from "../../src/server/storage/storage-migration";

interface Manifest {
  firmId: string;
  files: Array<{ storageId: string; path: string; mimeType: string; sha256?: string }>;
}

const manifestArgument = process.argv[2];
if (!manifestArgument)
  throw new Error("Usage: npm run storage:migrate -- <convex-storage-manifest.json>");
const manifestPath = path.resolve(manifestArgument);
const manifestRoot = path.dirname(manifestPath);
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8")) as Manifest;
if (!manifest.firmId || !Array.isArray(manifest.files))
  throw new Error("Storage manifest is invalid");
const environment = getServerEnvironment();
if (!environment.OBJECT_STORAGE_BUCKET) throw new Error("OBJECT_STORAGE_BUCKET is required");
const destination = new S3ObjectStorage({
  bucket: environment.OBJECT_STORAGE_BUCKET,
  region: environment.OBJECT_STORAGE_REGION,
  endpoint: environment.OBJECT_STORAGE_ENDPOINT,
  forcePathStyle: environment.OBJECT_STORAGE_FORCE_PATH_STYLE,
  serverSideEncryption: environment.OBJECT_STORAGE_SSE === "aes256" ? "AES256" : "none",
});
const byId = new Map(manifest.files.map((file) => [file.storageId, file]));
const report = await migrateLegacyStorage({
  firmId: manifest.firmId,
  source: {
    listFiles: async () =>
      manifest.files.map((file) => ({
        storageId: file.storageId,
        mimeType: file.mimeType,
        expectedSha256: file.sha256,
      })),
    readFile: async (storageId) => {
      const item = byId.get(storageId);
      if (!item) throw new Error(`Storage ID ${storageId} is missing from the manifest`);
      const target = path.resolve(manifestRoot, item.path);
      const relative = path.relative(manifestRoot, target);
      if (relative.startsWith("..") || path.isAbsolute(relative))
        throw new Error("Manifest path escapes its export directory");
      return new Uint8Array(await fs.readFile(target));
    },
  },
  destination,
  journal: new PostgresDocumentStorageRepository(),
});
process.stdout.write(`${JSON.stringify(report)}\n`);
if (
  report.failed.length > 0 ||
  report.sourceCount !== report.verifiedCount ||
  report.sourceCount !== report.destinationCount
) {
  process.exitCode = 1;
}
