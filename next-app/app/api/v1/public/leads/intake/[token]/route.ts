import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getCrmService } from "@/server/services/crm-service";
import { intakeSubmitSchema } from "@/shared/contracts/crm";
import { AppError } from "@/shared/errors/api-error";
import { z } from "zod";

function tokenFrom(request: Request) {
  const token = new URL(request.url).pathname.split("/").filter(Boolean).at(-1);
  return z.string().trim().min(8).max(200).parse(token);
}

export const GET = withApiHandler("/api/v1/public/leads/intake/:token", async ({ request }) => {
  const data = await getCrmService().getIntakeByToken(tokenFrom(request));
  if (!data) throw new AppError("NOT_FOUND", "Invalid or expired intake link", 404);
  return jsonResponse({ data });
});

export const POST = withApiHandler("/api/v1/public/leads/intake/:token", async ({ request }) => {
  const token = tokenFrom(request);
  const input = intakeSubmitSchema.parse(await request.json());
  return jsonResponse({ data: await getCrmService().submitIntake(token, input) });
});
