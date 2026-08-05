import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getDocumentTagService } from "@/server/services/document-template-service";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
});

export const GET = withApiHandler("/api/v1/document-tags", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({ data: await getDocumentTagService().list(principal) });
});

export const POST = withApiHandler("/api/v1/document-tags", async ({ request }) => {
  const principal = await requireSession(request);
  const input = createSchema.parse(await request.json());
  return jsonResponse(
    { data: await getDocumentTagService().create(principal, input) },
    { status: 201 },
  );
});
