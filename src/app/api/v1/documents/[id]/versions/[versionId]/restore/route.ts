import { buildAuditContext } from "@/server/audit/context";
import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getDocumentService } from "@/server/services/document-service";
import { uuidSchema } from "@/shared/contracts/documents";

export const POST = withApiHandler(
  "/api/v1/documents/:id/versions/:versionId/restore",
  async ({ request, requestId }) => {
    const principal = await requireSession(request);
    const segments = new URL(request.url).pathname.split("/").filter(Boolean);
    const documentId = uuidSchema.parse(segments.at(-4));
    const versionId = uuidSchema.parse(segments.at(-2));
    const restored = await getDocumentService().restoreVersion(
      principal,
      documentId,
      versionId,
      buildAuditContext(request, requestId, principal),
    );
    return jsonResponse({ data: restored }, { status: 201 });
  },
);
