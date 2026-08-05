import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { resolveFinancialIdempotencyKey } from "@/server/http/financial-idempotency";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getFinancialService } from "@/server/services/financial-service";
import { initiateGatewaySchema, uuidSchema } from "@/shared/contracts/financial";

function invoiceIdFrom(request: Request) {
  return uuidSchema.parse(new URL(request.url).pathname.split("/").filter(Boolean).at(-2));
}

export const POST = withApiHandler(
  "/api/v1/financial/invoices/:id/gateway",
  async ({ request, requestId }) => {
    const principal = await requireSession(request);
    const body = initiateGatewaySchema.parse(await request.json());
    const input = {
      ...body,
      idempotencyKey: resolveFinancialIdempotencyKey(body.idempotencyKey, request),
    };
    return jsonResponse({
      data: await getFinancialService().initiateGatewayPayment(
        principal,
        invoiceIdFrom(request),
        input,
        buildAuditContext(request, requestId, principal),
      ),
    });
  },
);
