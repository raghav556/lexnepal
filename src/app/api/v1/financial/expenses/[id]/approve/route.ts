import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getFinancialService } from "@/server/services/financial-service";
import { expenseApproveSchema, uuidSchema } from "@/shared/contracts/financial";

function expenseIdFrom(request: Request) {
  return uuidSchema.parse(new URL(request.url).pathname.split("/").filter(Boolean).at(-2));
}

export const POST = withApiHandler(
  "/api/v1/financial/expenses/:id/approve",
  async ({ request, requestId }) => {
    const principal = await requireSession(request);
    const body = await request.json().catch(() => ({}));
    const input = expenseApproveSchema.parse(
      body && typeof body === "object" && "status" in body ? body : { status: "approved" },
    );
    return jsonResponse({
      data: await getFinancialService().approveExpense(
        principal,
        expenseIdFrom(request),
        input,
        buildAuditContext(request, requestId, principal),
      ),
    });
  },
);
