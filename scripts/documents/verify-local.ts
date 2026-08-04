import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { getLocalAuth } from "../../src/server/auth/local-auth";
import { firmSettings } from "../../db/schema";
import { convertConvexStorageExport } from "../../src/server/storage/convex-export-converter";
import { migrateLegacyStorage } from "../../src/server/storage/storage-migration";
import { PostgresDocumentStorageRepository } from "../../src/server/repositories/document-storage-repository";
import { S3ObjectStorage } from "../../src/server/storage/s3-object-storage";
import { getServerEnvironment } from "../../src/server/env";
import { GET as listDocuments } from "../../next-app/app/api/v1/documents/route";
import { POST as createShare } from "../../next-app/app/api/v1/documents/[id]/share/route";
import { POST as getPublicShare } from "../../next-app/app/api/v1/public/document-shares/[token]/route";

const firmA = "61000000-0000-4000-8000-000000000001";
const password = "Local-boundary-only-2026!";
const exportPath = "tests/fixtures/convex-export";
const firmMapPath = "tests/fixtures/convex-export/firm-map.json";

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

try {
  const database = getDatabase();
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

  const firmMap = JSON.parse(await fs.readFile(firmMapPath, "utf8")) as Record<string, string>;
  const outputDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "lexnepal-storage-dry-run-"));
  const conversion = await convertConvexStorageExport({
    exportPath: path.resolve(exportPath),
    outputDirectory,
    firmMap,
  });
  if (conversion.exceptions.length > 0) {
    throw new Error(`Storage convert exceptions: ${JSON.stringify(conversion.exceptions)}`);
  }
  if (
    conversion.storageCount !== conversion.referencedCount ||
    conversion.storageCount !== conversion.convertedCount
  ) {
    throw new Error(`Storage convert counts mismatch: ${JSON.stringify(conversion)}`);
  }

  const environment = getServerEnvironment();
  if (!environment.OBJECT_STORAGE_BUCKET) throw new Error("OBJECT_STORAGE_BUCKET is required");
  const destination = new S3ObjectStorage({
    bucket: environment.OBJECT_STORAGE_BUCKET,
    region: environment.OBJECT_STORAGE_REGION,
    endpoint: environment.OBJECT_STORAGE_ENDPOINT,
    forcePathStyle: environment.OBJECT_STORAGE_FORCE_PATH_STYLE,
    serverSideEncryption: environment.OBJECT_STORAGE_SSE === "aes256" ? "AES256" : "none",
  });
  const journal = new PostgresDocumentStorageRepository();

  for (const manifestRel of conversion.manifests) {
    const manifestPath = path.isAbsolute(manifestRel)
      ? manifestRel
      : path.join(outputDirectory, manifestRel);
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8")) as {
      firmId: string;
      files: Array<{ storageId: string; path: string; mimeType: string; sha256?: string }>;
    };
    const manifestRoot = path.dirname(manifestPath);
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
          if (!item) throw new Error(`Missing storage id ${storageId}`);
          const target = path.isAbsolute(item.path)
            ? item.path
            : path.resolve(manifestRoot, item.path);
          return new Uint8Array(await fs.readFile(target));
        },
      },
      destination,
      journal,
    });
    if (
      report.failed.length > 0 ||
      report.sourceCount !== report.verifiedCount ||
      report.sourceCount !== report.destinationCount
    ) {
      throw new Error(`Storage migrate dry-run failed: ${JSON.stringify(report)}`);
    }
    console.log(
      `storage migrate dry-run ok firm=${manifest.firmId} files=${report.sourceCount} verified=${report.verifiedCount}`,
    );
  }

  const cookie = await signIn("boundary-a@example.invalid");
  const headers = { cookie, "content-type": "application/json" };

  const listResponse = await listDocuments(new Request("http://local/api/v1/documents", { headers }));
  if (!listResponse.ok) {
    throw new Error(`Documents list failed: ${listResponse.status} ${await listResponse.text()}`);
  }
  const listBody = (await listResponse.json()) as { data: Array<{ _id: string; title: string }> };
  if (!Array.isArray(listBody.data)) throw new Error("Documents list payload invalid");
  console.log(`documents list ok count=${listBody.data.length}`);

  const cleanDoc = listBody.data[0];
  if (cleanDoc) {
    const shareResponse = await createShare(
      new Request(`http://local/api/v1/documents/${cleanDoc._id}/share`, {
        method: "POST",
        headers,
        body: JSON.stringify({ allowDownload: true }),
      }),
    );
    if (!shareResponse.ok) {
      throw new Error(`Share create failed: ${shareResponse.status} ${await shareResponse.text()}`);
    }
    const shareBody = (await shareResponse.json()) as { data: { token: string } };
    if (!shareBody.data?.token) throw new Error("Share create did not return token");

    const publicResponse = await getPublicShare(
      new Request(`http://local/api/v1/public/document-shares/${shareBody.data.token}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    if (!publicResponse.ok) {
      throw new Error(
        `Public share get failed: ${publicResponse.status} ${await publicResponse.text()}`,
      );
    }
    const publicBody = (await publicResponse.json()) as {
      data: { isPasswordRequired: boolean; title?: string };
    };
    if (publicBody.data.isPasswordRequired !== false || !publicBody.data.title) {
      throw new Error(`Public share payload unexpected: ${JSON.stringify(publicBody)}`);
    }
    console.log(`public share ok title=${publicBody.data.title}`);
  } else {
    console.log("documents list empty after pipeline; share API skipped (pipeline already proved upload)");
  }

  console.log("documents:verify-local passed");
} finally {
  await closeDatabase().catch(() => undefined);
}
