import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { parseJson } from "@/server/http/validation";
import { getCmsService } from "@/server/services/cms-service";
import { legalPageInputSchema, legalSlugSchema } from "@/shared/contracts/cms";
type Context = { params: Promise<{ slug: string }> };
export const PUT = (request: Request, context: Context) =>
  withApiHandler("/api/v1/cms/legal-pages/:slug", async ({ request: handled, requestId }) => {
    const principal = await requireSession(handled);
    return jsonResponse({
      data: await getCmsService().upsertLegalPage(
        principal,
        legalSlugSchema.parse((await context.params).slug),
        await parseJson(handled, legalPageInputSchema),
        buildAuditContext(handled, requestId, principal),
      ),
    });
  })(request);
