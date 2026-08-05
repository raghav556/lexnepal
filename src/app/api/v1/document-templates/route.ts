import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getDocumentTemplateService } from "@/server/services/document-template-service";
import { z } from "zod";

const templateBodySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.enum([
    "vakalatnama",
    "firad_patra",
    "jawab",
    "prastab_patra",
    "retainer",
    "poa",
    "contract",
    "other",
  ]),
  htmlContent: z.string(),
  variables: z.array(z.string()).default([]),
});

export const GET = withApiHandler("/api/v1/document-templates", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({ data: await getDocumentTemplateService().list(principal) });
});

export const POST = withApiHandler("/api/v1/document-templates", async ({ request }) => {
  const principal = await requireSession(request);
  const input = templateBodySchema.parse(await request.json());
  return jsonResponse(
    { data: await getDocumentTemplateService().create(principal, input) },
    { status: 201 },
  );
});
