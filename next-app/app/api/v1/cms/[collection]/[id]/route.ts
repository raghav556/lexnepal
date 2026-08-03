import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { cmsCollectionSchema, inputSchemaFor } from "@/server/http/cms-validation";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { parseJson } from "@/server/http/validation";
import { getCmsService } from "@/server/services/cms-service";
import { cmsIdSchema } from "@/shared/contracts/cms";
type Context = { params: Promise<{ collection: string; id: string }> };
export const PATCH = (request: Request, context: Context) =>
  withApiHandler("/api/v1/cms/:collection/:id", async ({ request: handled, requestId }) => {
    const principal = await requireSession(handled);
    const params = await context.params;
    const collection = cmsCollectionSchema.parse(params.collection);
    return jsonResponse({
      data: await getCmsService().update(
        principal,
        collection,
        cmsIdSchema.parse(params.id),
        await parseJson(handled, inputSchemaFor(collection)),
        buildAuditContext(handled, requestId, principal),
      ),
    });
  })(request);
export const DELETE = (request: Request, context: Context) =>
  withApiHandler("/api/v1/cms/:collection/:id", async ({ request: handled, requestId }) => {
    const principal = await requireSession(handled);
    const params = await context.params;
    await getCmsService().delete(
      principal,
      cmsCollectionSchema.parse(params.collection),
      cmsIdSchema.parse(params.id),
      buildAuditContext(handled, requestId, principal),
    );
    return new Response(null, { status: 204 });
  })(request);
