import { randomUUID } from "node:crypto";
import { getServerEnvironment } from "../../src/server/env";
import { S3ObjectStorage } from "../../src/server/storage/s3-object-storage";

const environment = getServerEnvironment();
if (environment.OBJECT_STORAGE_PROVIDER !== "minio") {
  throw new Error("Local storage verification requires OBJECT_STORAGE_PROVIDER=minio");
}
if (!environment.OBJECT_STORAGE_BUCKET) throw new Error("OBJECT_STORAGE_BUCKET is required");

const storage = new S3ObjectStorage({
  bucket: environment.OBJECT_STORAGE_BUCKET,
  region: environment.OBJECT_STORAGE_REGION,
  endpoint: environment.OBJECT_STORAGE_ENDPOINT,
  forcePathStyle: environment.OBJECT_STORAGE_FORCE_PATH_STYLE,
  serverSideEncryption: environment.OBJECT_STORAGE_SSE === "aes256" ? "AES256" : "none",
});

const intentId = randomUUID();
const key = `quarantine/local-verification/${intentId}.txt`;
const bytes = new TextEncoder().encode("LexNepal MinIO verification");
const grant = await storage.createUploadGrant({
  key,
  contentType: "text/plain",
  maxBytes: 1024,
  intentId,
  expiresInSeconds: 60,
});

const form = new FormData();
for (const [name, value] of Object.entries(grant.fields ?? {})) form.set(name, value);
form.set("file", new Blob([bytes], { type: "text/plain" }), "verification.txt");

const uploadResponse = await fetch(grant.url, { method: "POST", body: form });
if (!uploadResponse.ok) {
  throw new Error(`Presigned upload failed with HTTP ${uploadResponse.status}`);
}

try {
  const stored = await storage.headObject(key);
  if (!stored || stored.sizeBytes !== bytes.byteLength) {
    throw new Error("Uploaded object metadata did not match the source");
  }
  const downloadUrl = await storage.createDownloadUrl(key, 60);
  const downloadResponse = await fetch(downloadUrl);
  if (!downloadResponse.ok || (await downloadResponse.text()) !== "LexNepal MinIO verification") {
    throw new Error("Presigned download did not match the uploaded object");
  }
  process.stdout.write(
    `${JSON.stringify({ bucket: environment.OBJECT_STORAGE_BUCKET, presignedUpload: true, presignedDownload: true })}\n`,
  );
} finally {
  await storage.deleteObject(key);
}
