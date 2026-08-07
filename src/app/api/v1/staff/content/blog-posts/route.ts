import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { parseJson } from "@/server/http/validation";
import { getCmsService } from "@/server/services/cms-service";
import { blogPostInputSchema } from "@/shared/contracts/cms";

export const GET = withApiHandler("/api/v1/staff/content/blog-posts", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({ data: await getCmsService().listStaffBlogPosts(principal) });
});

export const POST = withApiHandler(
  "/api/v1/staff/content/blog-posts",
  async ({ request, requestId }) => {
    const principal = await requireSession(request);
    const input = await parseJson(request, blogPostInputSchema);
    return jsonResponse(
      {
        data: await getCmsService().createStaffBlogPost(
          principal,
          input,
          buildAuditContext(request, requestId, principal),
        ),
      },
      { status: 201 },
    );
  },
);
