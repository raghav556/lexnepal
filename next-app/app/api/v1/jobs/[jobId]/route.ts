import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getJobRepository } from "@/server/jobs/runtime";
import { AppError } from "@/shared/errors/api-error";

export const GET = withApiHandler("/api/v1/jobs/:jobId", async ({ request }) => {
  const principal = await requireSession(request);
  if (principal.user.role !== "admin") {
    throw new AppError("FORBIDDEN", "Job operations require an administrator", 403);
  }
  const jobId = new URL(request.url).pathname.split("/").filter(Boolean).at(-1) ?? "";
  const job = await getJobRepository().get(principal.firmId, jobId);
  if (!job) throw new AppError("NOT_FOUND", "Job was not found", 404);
  return jsonResponse({ data: job });
});
