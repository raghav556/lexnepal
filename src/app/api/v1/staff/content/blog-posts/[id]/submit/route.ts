import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getCmsService } from "@/server/services/cms-service";
import { cmsIdSchema } from "@/shared/contracts/cms";

type Context = { params: Promise<{ id: string }> };

export const POST = (request: Request, context: Context) =>
  withApiHandler(
    "/api/v1/staff/content/blog-posts/:id/submit",
    async ({ request: handled, requestId }) => {
      const principal = await requireSession(handled);
      const id = cmsIdSchema.parse((await context.params).id);
      return jsonResponse({
        data: await getCmsService().submitStaffBlogPost(
          principal,
          id,
          buildAuditContext(handled, requestId, principal),
        ),
      });
    },
  )(request);
