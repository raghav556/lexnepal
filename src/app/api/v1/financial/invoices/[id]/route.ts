import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getFinancialService } from "@/server/services/financial-service";
import { invoiceStatusUpdateSchema, uuidSchema } from "@/shared/contracts/financial";

function idFrom(request: Request) {
  return uuidSchema.parse(new URL(request.url).pathname.split("/").filter(Boolean).at(-1));
}

export const GET = withApiHandler("/api/v1/financial/invoices/:id", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({
    data: await getFinancialService().getInvoice(principal, idFrom(request)),
  });
});

export const PATCH = withApiHandler("/api/v1/financial/invoices/:id", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  const input = invoiceStatusUpdateSchema.parse(await request.json());
  return jsonResponse({
    data: await getFinancialService().updateInvoiceStatus(
      principal,
      idFrom(request),
      input,
      buildAuditContext(request, requestId, principal),
    ),
  });
});
