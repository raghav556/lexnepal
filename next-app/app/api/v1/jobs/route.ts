import { z } from "zod";
import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getJobRepository } from "@/server/jobs/runtime";
import { AppError } from "@/shared/errors/api-error";

const statusSchema = z.enum([
  "pending",
  "processing",
  "retry",
  "completed",
  "dead_letter",
  "cancelled",
]);

export const GET = withApiHandler("/api/v1/jobs", async ({ request }) => {
  const principal = await requireSession(request);
  requireAdmin(principal.user.role);
  const url = new URL(request.url);
  const statuses = url.searchParams
    .getAll("status")
    .map((value) => statusSchema.safeParse(value))
    .filter((result) => result.success)
    .map((result) => result.data);
  const limit = z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .catch(50)
    .parse(url.searchParams.get("limit"));
  const jobs = await getJobRepository().list(principal.firmId, statuses, limit);
  return jsonResponse({ data: jobs });
});

function requireAdmin(role: string): void {
  if (role !== "admin")
    throw new AppError("FORBIDDEN", "Job operations require an administrator", 403);
}
