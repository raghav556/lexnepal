import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { getDocumentStorageRuntime } from "@/server/storage/runtime";
import { documentArchiveSchema } from "@/shared/contracts/documents";

export const POST = withApiHandler("/api/v1/documents/download-zip", async ({ request }) => {
  const principal = await requireSession(request);
  const input = documentArchiveSchema.parse(await request.json());
  const archive = await getDocumentStorageRuntime().archives.createAuthorizedArchive(
    principal,
    input.documentIds,
  );
  const body = archive.bytes.buffer.slice(
    archive.bytes.byteOffset,
    archive.bytes.byteOffset + archive.bytes.byteLength,
  ) as ArrayBuffer;
  return new Response(body, {
    status: 200,
    headers: {
      "cache-control": "no-store",
      "content-disposition": `attachment; filename="${archive.fileName}"`,
      "content-length": String(archive.bytes.byteLength),
      "content-type": "application/zip",
      "x-content-type-options": "nosniff",
      "x-document-count": String(archive.documentCount),
    },
  });
});
