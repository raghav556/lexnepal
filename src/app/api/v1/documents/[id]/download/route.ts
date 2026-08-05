import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getDocumentStorageRuntime } from "@/server/storage/runtime";

export const GET = withApiHandler("/api/v1/documents/:documentId/download", async ({ request }) => {
  const principal = await requireSession(request);
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const documentId = segments.at(-2) ?? "";
  const result = await getDocumentStorageRuntime().downloads.createAuthorizedDownload(
    principal,
    documentId,
  );
  return jsonResponse({ data: result });
});
