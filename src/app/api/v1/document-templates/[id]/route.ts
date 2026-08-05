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

function idFrom(request: Request) {
  return z.string().uuid().parse(new URL(request.url).pathname.split("/").filter(Boolean).at(-1));
}

export const PUT = withApiHandler("/api/v1/document-templates/:id", async ({ request }) => {
  const principal = await requireSession(request);
  const input = templateBodySchema.parse(await request.json());
  return jsonResponse({
    data: await getDocumentTemplateService().update(principal, idFrom(request), input),
  });
});

export const DELETE = withApiHandler("/api/v1/document-templates/:id", async ({ request }) => {
  const principal = await requireSession(request);
  await getDocumentTemplateService().remove(principal, idFrom(request));
  return jsonResponse({ data: { ok: true } });
});
