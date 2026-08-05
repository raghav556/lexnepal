import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getJobRepository } from "@/server/jobs/runtime";
import { AppError } from "@/shared/errors/api-error";
import { jobManualRetrySchema } from "@/shared/contracts/jobs";

export const POST = withApiHandler("/api/v1/jobs/:jobId/retry", async ({ request }) => {
  const principal = await requireSession(request);
  if (principal.user.role !== "admin") {
    throw new AppError("FORBIDDEN", "Manual job retry requires an administrator", 403);
  }
  const parsed = jobManualRetrySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    throw new AppError("VALIDATION_FAILED", "Manual retry reason is required", 422);
  }
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const jobId = segments.at(-2) ?? "";
  try {
    const job = await getJobRepository().manualRetry({
      firmId: principal.firmId,
      jobId,
      actorUserId: principal.user.id,
      reason: parsed.data.reason,
    });
    return jsonResponse({ data: job });
  } catch (error) {
    if (error instanceof Error && error.message === "Job was not found") {
      throw new AppError("NOT_FOUND", error.message, 404);
    }
    if (error instanceof Error && error.message.includes("dead-letter")) {
      throw new AppError("CONFLICT", error.message, 409);
    }
    throw error;
  }
});
