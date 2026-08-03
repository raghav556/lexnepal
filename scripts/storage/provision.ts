import { S3Client } from "@aws-sdk/client-s3";
import { getServerEnvironment } from "../../src/server/env";
import { ensurePrivateDocumentBucket } from "../../src/server/storage/provision-s3";

const environment = getServerEnvironment();
if (!environment.OBJECT_STORAGE_BUCKET) throw new Error("OBJECT_STORAGE_BUCKET is required");
const client = new S3Client({
  region: environment.OBJECT_STORAGE_REGION,
  maxAttempts: 4,
  ...(environment.OBJECT_STORAGE_ENDPOINT ? { endpoint: environment.OBJECT_STORAGE_ENDPOINT } : {}),
  ...(environment.OBJECT_STORAGE_FORCE_PATH_STYLE ? { forcePathStyle: true } : {}),
});
await ensurePrivateDocumentBucket({
  client,
  bucket: environment.OBJECT_STORAGE_BUCKET,
  region: environment.OBJECT_STORAGE_REGION,
  provider: environment.OBJECT_STORAGE_PROVIDER,
  serverSideEncryption: environment.OBJECT_STORAGE_SSE === "aes256" ? "AES256" : undefined,
});
process.stdout.write(
  `${JSON.stringify({ bucket: environment.OBJECT_STORAGE_BUCKET, provider: environment.OBJECT_STORAGE_PROVIDER, private: true })}\n`,
);
