import { randomUUID } from "node:crypto";
import { getServerEnvironment } from "../../src/server/env";
import { LocalObjectStorage } from "../../src/server/storage/local-object-storage";
import { POST as uploadObject } from "../../src/app/api/v1/storage/uploads/[grantId]/route";
import { GET as downloadObject } from "../../src/app/api/v1/storage/objects/[...key]/route";

const environment = getServerEnvironment();
const storage = new LocalObjectStorage({
  root: environment.STORAGE_ROOT,
  appBaseUrl: environment.APP_PUBLIC_URL,
});
await storage.initialize();

// 1. Upload/write through the grant flow
const intentId = randomUUID();
const key = `quarantine/local-verification/${intentId}.txt`;
const bytes = new TextEncoder().encode("LexNepal local storage verification");
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
if (!grant.url.includes("/api/v1/storage/uploads/")) {
  throw new Error("Grant URL is not served by the app upload endpoint");
}

const uploadResponse = await uploadObject(new Request(grant.url, { method: "POST", body: form }), {
  params: Promise.resolve({ grantId: grant.fields.grantId }),
});
if (!uploadResponse.ok) {
  throw new Error(`App-controlled upload failed with HTTP ${uploadResponse.status}`);
}

// 2. Read back + metadata
const head = await storage.headObject(key);
if (!head || head.sizeBytes !== bytes.byteLength) {
  throw new Error("Uploaded object metadata did not match the source");
}
if (head.metadata["upload-intent-id"] !== intentId) {
  throw new Error("Upload metadata is missing the intent id");
}
const readBack = new TextDecoder().decode(await storage.readObject(key));
if (readBack !== "LexNepal local storage verification") {
  throw new Error("Read did not match the uploaded object");
}

// 3. Download URL is a tokenized app URL (authorization happens at mint time)
const downloadUrl = await storage.createDownloadUrl(key, 60);
if (!downloadUrl.includes("/api/v1/storage/objects/")) {
  throw new Error("Download URL is not served by the app storage endpoint");
}
const token = new URL(downloadUrl).searchParams.get("token") ?? "";
if (!(await storage.resolveDownloadToken(key, token))) {
  throw new Error("Minted download token failed verification");
}
if (await storage.resolveDownloadToken(`protected/other/${key}`, token)) {
  throw new Error("Download token verified against a different key");
}
const downloadPath = new URL(downloadUrl).pathname.split("/api/v1/storage/objects/")[1];
const downloadResponse = await downloadObject(new Request(downloadUrl), {
  params: Promise.resolve({ key: downloadPath.split("/").map(decodeURIComponent) }),
});
if (!downloadResponse.ok || (await downloadResponse.text()) !== readBack) {
  throw new Error("App-controlled download did not match the stored object");
}
const deniedDownload = await downloadObject(
  new Request(`${downloadUrl.split("?", 1)[0]}?token=forged.token`),
  { params: Promise.resolve({ key: downloadPath.split("/").map(decodeURIComponent) }) },
);
if (deniedDownload.status !== 403) {
  throw new Error("App-controlled download did not reject a forged token");
}

// 4. Missing file handling
if (await storage.headObject("quarantine/local-verification/missing.txt")) {
  throw new Error("Missing object should head as null");
}
let missingThrew = false;
try {
  await storage.readObject("quarantine/local-verification/missing.txt");
} catch {
  missingThrew = true;
}
if (!missingThrew) throw new Error("Missing object read should throw");
const missingKey = "quarantine/local-verification/missing.txt";
const missingDownloadUrl = await storage.createDownloadUrl(missingKey, 60);
const missingDownloadPath = new URL(missingDownloadUrl).pathname.split(
  "/api/v1/storage/objects/",
)[1];
const missingDownload = await downloadObject(new Request(missingDownloadUrl), {
  params: Promise.resolve({ key: missingDownloadPath.split("/").map(decodeURIComponent) }),
});
if (missingDownload.status !== 404) {
  throw new Error("App-controlled download did not return 404 for a missing object");
}

// 5. Path traversal rejection
let traversalRejected = false;
try {
  await storage.readObject("quarantine/../../etc/passwd");
} catch {
  traversalRejected = true;
}
if (!traversalRejected) throw new Error("Path traversal key was not rejected");
let grantTraversalRejected = false;
try {
  await storage.headObject(`quarantine/${intentId}/../..%2Fsecret.txt`);
} catch {
  grantTraversalRejected = true;
}
if (!grantTraversalRejected) throw new Error("Encoded traversal key was not rejected");

// 6. Copy + list + delete
const copyKey = `rejected/local-verification/${intentId}.txt`;
await storage.copyObject(key, copyKey, { "rejection-code": "LOCAL_TEST" });
const listed = await storage.listKeys("quarantine/local-verification/");
if (!listed.includes(key)) throw new Error("listKeys did not include the uploaded object");
await storage.deleteObject(copyKey);
if (await storage.headObject(copyKey)) throw new Error("Copied object was not deleted");

// 7. Expired/invalid grant handling
const expiredGrant = await storage.createUploadGrant({
  key: "quarantine/local-verification/expired.txt",
  contentType: "text/plain",
  maxBytes: 10,
  intentId: randomUUID(),
  expiresInSeconds: -1,
});
if (await storage.consumeUploadGrant(expiredGrant.fields.grantId)) {
  throw new Error("Expired grant should not be consumable");
}
if (await storage.consumeUploadGrant(randomUUID())) {
  throw new Error("Unknown grant should not be consumable");
}

try {
  process.stdout.write(
    `${JSON.stringify({ root: environment.STORAGE_ROOT, upload: true, download: true, missingHandling: true, traversalRejected: true, copyListDelete: true })}\n`,
  );
} finally {
  await storage.deleteObject(key);
}
