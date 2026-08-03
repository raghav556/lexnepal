import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { cmsCollectionSchema, inputSchemaFor } from "@/server/http/cms-validation";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { parseJson } from "@/server/http/validation";
import { getCmsService } from "@/server/services/cms-service";
type Context = { params: Promise<{ collection: string }> };
export const GET = (request: Request, context: Context) =>
  withApiHandler("/api/v1/cms/:collection", async () => {
    const principal = await requireSession(request);
    const collection = cmsCollectionSchema.parse((await context.params).collection);
    return jsonResponse({
      data: await getCmsService().listAdmin(
        principal,
        collection,
        new URL(request.url).searchParams,
      ),
    });
  })(request);
export const POST = (request: Request, context: Context) =>
  withApiHandler("/api/v1/cms/:collection", async ({ request: handled, requestId }) => {
    const principal = await requireSession(handled);
    const collection = cmsCollectionSchema.parse((await context.params).collection);
    const input = await parseJson(handled, inputSchemaFor(collection));
    return jsonResponse(
      {
        data: await getCmsService().create(
          principal,
          collection,
          input,
          buildAuditContext(handled, requestId, principal),
        ),
      },
      { status: 201 },
    );
  })(request);
