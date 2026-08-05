import { z } from "zod";
import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { parseJson } from "@/server/http/validation";
import { getAvatarService } from "@/server/services/avatar-service";
const inputSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(["image/jpeg", "image/png"]),
  sizeBytes: z
    .number()
    .int()
    .min(1)
    .max(5 * 1024 * 1024),
  sha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/i)
    .optional(),
});
export const POST = withApiHandler(
  "/api/v1/users/me/avatar-upload-intents",
  async ({ request, requestId }) => {
    const principal = await requireSession(request);
    const data = await getAvatarService().createIntent(
      principal,
      await parseJson(request, inputSchema),
      buildAuditContext(request, requestId, principal),
    );
    return jsonResponse({ data }, { status: 201 });
  },
);
