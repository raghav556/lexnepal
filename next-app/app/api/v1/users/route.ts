import { z } from "zod";
import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { parseJson } from "@/server/http/validation";
import { getIdentityService } from "@/server/services/identity-service";
import { createUserSchema, userRoleSchema } from "@/shared/contracts/identity";

export const GET = withApiHandler("/api/v1/users", async ({ request }) => {
  const principal = await requireSession(request);
  const role = z
    .object({ role: userRoleSchema.optional() })
    .parse(Object.fromEntries(new URL(request.url).searchParams)).role;
  return jsonResponse({ data: await getIdentityService().listUsers(principal, role) });
});
export const POST = withApiHandler("/api/v1/users", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  const input = await parseJson(request, createUserSchema);
  return jsonResponse(
    {
      data: await getIdentityService().createUser(
        principal,
        input,
        buildAuditContext(request, requestId, principal),
      ),
    },
    { status: 201 },
  );
});
