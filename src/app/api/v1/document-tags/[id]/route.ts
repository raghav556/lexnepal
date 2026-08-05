import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getDocumentTagService } from "@/server/services/document-template-service";
import { z } from "zod";

function idFrom(request: Request) {
  return z.string().uuid().parse(new URL(request.url).pathname.split("/").filter(Boolean).at(-1));
}

export const DELETE = withApiHandler("/api/v1/document-tags/:id", async ({ request }) => {
  const principal = await requireSession(request);
  await getDocumentTagService().remove(principal, idFrom(request));
  return jsonResponse({ data: { ok: true } });
});
