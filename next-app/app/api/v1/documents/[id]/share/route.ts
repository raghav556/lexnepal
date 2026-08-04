import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getDocumentService } from "@/server/services/document-service";
import { documentShareCreateSchema, uuidSchema } from "@/shared/contracts/documents";

function idFrom(request: Request) {
  return uuidSchema.parse(new URL(request.url).pathname.split("/").filter(Boolean).at(-2));
}

export const GET = withApiHandler("/api/v1/documents/:id/share", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({ data: await getDocumentService().listShares(principal, idFrom(request)) });
});

export const POST = withApiHandler("/api/v1/documents/:id/share", async ({ request }) => {
  const principal = await requireSession(request);
  const input = documentShareCreateSchema.parse(await request.json().catch(() => ({})));
  return jsonResponse(
    { data: await getDocumentService().createShare(principal, idFrom(request), input) },
    { status: 201 },
  );
});

export const DELETE = withApiHandler("/api/v1/documents/:id/share", async ({ request }) => {
  const principal = await requireSession(request);
  const documentId = idFrom(request);
  const shareId = uuidSchema.parse(new URL(request.url).searchParams.get("shareId"));
  return jsonResponse({
    data: await getDocumentService().revokeShare(principal, documentId, shareId),
  });
});
