import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { parseJson } from "@/server/http/validation";
import { getCmsService } from "@/server/services/cms-service";
import { applicationInputSchema, cmsIdSchema } from "@/shared/contracts/cms";
type Context = { params: Promise<{ id: string }> };
export const POST = (request: Request, context: Context) =>
  withApiHandler("/api/v1/public/cms/careers/:id/applications", async ({ request: handled }) =>
    jsonResponse(
      {
        data: await getCmsService().createApplication(
          cmsIdSchema.parse((await context.params).id),
          await parseJson(handled, applicationInputSchema),
        ),
      },
      { status: 201 },
    ),
  )(request);
