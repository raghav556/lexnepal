import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getMattersService } from "@/server/services/matters-service";
import { caseUpdateSchema, uuidSchema } from "@/shared/contracts/matters";

function idFrom(request: Request) {
  return uuidSchema.parse(new URL(request.url).pathname.split("/").filter(Boolean).at(-1));
}
export const GET = withApiHandler("/api/v1/cases/:id", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({
    data: await getMattersService().getCase(
      principal,
      idFrom(request),
      new URL(request.url).searchParams.get("details") === "true",
    ),
  });
});
export const PATCH = withApiHandler("/api/v1/cases/:id", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  const input = caseUpdateSchema.parse(await request.json());
  return jsonResponse({
    data: await getMattersService().updateCase(
      principal,
      idFrom(request),
      input,
      buildAuditContext(request, requestId, principal),
    ),
  });
});
