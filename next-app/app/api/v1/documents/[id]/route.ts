import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getDocumentService } from "@/server/services/document-service";
import { documentUpdateSchema, uuidSchema } from "@/shared/contracts/documents";

function idFrom(request: Request) {
  return uuidSchema.parse(new URL(request.url).pathname.split("/").filter(Boolean).at(-1));
}

export const GET = withApiHandler("/api/v1/documents/:id", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({ data: await getDocumentService().get(principal, idFrom(request)) });
});

export const PATCH = withApiHandler("/api/v1/documents/:id", async ({ request }) => {
  const principal = await requireSession(request);
  const input = documentUpdateSchema.parse(await request.json());
  return jsonResponse({
    data: await getDocumentService().update(principal, idFrom(request), input),
  });
});

export const DELETE = withApiHandler("/api/v1/documents/:id", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({ data: await getDocumentService().hardDelete(principal, idFrom(request)) });
});
