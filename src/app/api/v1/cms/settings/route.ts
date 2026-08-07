import { revalidatePath } from "next/cache";
import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { parseJson } from "@/server/http/validation";
import { getCmsService } from "@/server/services/cms-service";
import { cmsSettingsUpdateSchema } from "@/shared/contracts/cms";

export const GET = withApiHandler("/api/v1/cms/settings", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({ data: await getCmsService().getAdminSettings(principal) });
});

export const PUT = withApiHandler("/api/v1/cms/settings", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  const data = await getCmsService().updateSettings(
    principal,
    await parseJson(request, cmsSettingsUpdateSchema),
    buildAuditContext(request, requestId, principal),
  );
  // Public marketing pages read these settings — drop any cached shells immediately.
  try {
    revalidatePath("/", "layout");
    revalidatePath("/");
    revalidatePath("/about-us");
    revalidatePath("/contact");
    revalidatePath("/lawyers");
  } catch {
    // revalidatePath requires the Next.js request runtime; ignore when unavailable.
  }
  return jsonResponse({ data });
});
