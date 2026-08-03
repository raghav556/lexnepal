import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { parseJson } from "@/server/http/validation";
import { getIdentityService } from "@/server/services/identity-service";
import { rolePermissionMatrixSchema } from "@/shared/contracts/identity";
export const GET = withApiHandler("/api/v1/settings/role-permissions", async ({ request }) =>
  jsonResponse({
    data: await getIdentityService().getRolePermissions(await requireSession(request)),
  }),
);
export const PUT = withApiHandler(
  "/api/v1/settings/role-permissions",
  async ({ request, requestId }) => {
    const principal = await requireSession(request);
    return jsonResponse({
      data: await getIdentityService().updateRolePermissions(
        principal,
        await parseJson(request, rolePermissionMatrixSchema),
        buildAuditContext(request, requestId, principal),
      ),
    });
  },
);
