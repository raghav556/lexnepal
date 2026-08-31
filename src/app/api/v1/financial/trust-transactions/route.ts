import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { resolveFinancialIdempotencyKey } from "@/server/http/financial-idempotency";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getFinancialService } from "@/server/services/financial-service";
import { trustCreateSchema, trustListSchema } from "@/shared/contracts/financial";

export const GET = withApiHandler("/api/v1/financial/trust-transactions", async ({ request }) => {
  const principal = await requireSession(request);
  const input = trustListSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  return jsonResponse({
    data: await getFinancialService().listTrustTransactions(principal, input),
  });
});

export const POST = withApiHandler(
  "/api/v1/financial/trust-transactions",
  async ({ request, requestId }) => {
    const principal = await requireSession(request);
    const body = trustCreateSchema.parse(await request.json());
    const input = {
      ...body,
      idempotencyKey: resolveFinancialIdempotencyKey(body.idempotencyKey, request),
    };
    return jsonResponse(
      {
        data: await getFinancialService().createTrustTransaction(
          principal,
          input,
          buildAuditContext(request, requestId, principal),
        ),
      },
      { status: 201 },
    );
  },
);
