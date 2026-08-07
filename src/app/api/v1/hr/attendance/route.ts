import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getHrService } from "@/server/services/hr-service";
import { attendanceListSchema, attendanceUpsertSchema } from "@/shared/contracts/hr";

export const GET = withApiHandler("/api/v1/hr/attendance", async ({ request }) => {
  const principal = await requireSession(request);
  const input = attendanceListSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  return jsonResponse({ data: await getHrService().listAttendance(principal, input) });
});

export const POST = withApiHandler("/api/v1/hr/attendance", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  const input = attendanceUpsertSchema.parse(await request.json());
  return jsonResponse({
    data: await getHrService().upsertAttendance(
      principal,
      input,
      buildAuditContext(request, requestId, principal),
    ),
  });
});
