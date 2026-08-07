import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { parseJson } from "@/server/http/validation";
import { getCmsService } from "@/server/services/cms-service";
import { blogPostInputSchema, cmsIdSchema } from "@/shared/contracts/cms";
import { z } from "zod";

type Context = { params: Promise<{ id: string }> };

function objectSchemaForPatch(schema: z.ZodTypeAny): z.ZodObject<z.ZodRawShape> {
  if (schema instanceof z.ZodEffects) {
    return objectSchemaForPatch(schema._def.schema);
  }
  if (schema instanceof z.ZodObject) {
    return schema;
  }
  throw new Error("Unsupported patch schema");
}

const blogPostPatchSchema = objectSchemaForPatch(blogPostInputSchema).partial();

export const PATCH = (request: Request, context: Context) =>
  withApiHandler("/api/v1/staff/content/blog-posts/:id", async ({ request: handled, requestId }) => {
    const principal = await requireSession(handled);
    const id = cmsIdSchema.parse((await context.params).id);
    const input = await parseJson(handled, blogPostPatchSchema);
    return jsonResponse({
      data: await getCmsService().updateStaffBlogPost(
        principal,
        id,
        input,
        buildAuditContext(handled, requestId, principal),
      ),
    });
  })(request);
