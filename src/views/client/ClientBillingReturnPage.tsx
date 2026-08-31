"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, Receipt } from "lucide-react";
import Link from "next/link";
import { useInvoiceCommands } from "@/client/queries/financial";
import { formatNPR } from "@/lib/lex-constants.ts";
import { DashboardButton, DashboardSection, PortalPageShell } from "@/components/dashboard";

export default function ClientBillingReturnPage() {
  const params = useSearchParams();
  const { payInvoice } = useInvoiceCommands();
  const [status, setStatus] = useState<"pending" | "ok" | "error">("pending");
  const [message, setMessage] = useState("Confirming payment…");

  useEffect(() => {
    const invoiceId = params.get("invoiceId");
    const paymentId = params.get("paymentId");
    const gateway = params.get("gateway") || "esewa";
    const key = params.get("key");
    if (!invoiceId || !paymentId || !key) {
      setStatus("error");
      setMessage("Missing payment return parameters.");
      return;
    }

    const raw = sessionStorage.getItem(`pay-pending-${key}`);
    let amount = 0;
    try {
      amount = raw ? JSON.parse(raw).amount : 0;
    } catch {
      amount = 0;
    }

    void (async () => {
      try {
        await payInvoice.mutateAsync({
          invoiceId,
          gateway,
          referenceNumber: paymentId,
          amount,
          idempotencyKey: `pay-${key}`,
        });
        sessionStorage.removeItem(`pay-pending-${key}`);
        setStatus("ok");
        setMessage(amount ? `Payment of ${formatNPR(amount)} confirmed.` : "Payment confirmed.");
      } catch (err: unknown) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Could not confirm payment.");
      }
    })();
  }, [params, payInvoice]);

  return (
    <PortalPageShell
      portal="client"
      eyebrow="Payment Confirmation"
      title="Payment Verification"
      description="Processing your digital gateway transaction response."
      icon={Receipt}
    >
      <div className="max-w-lg mx-auto">
        <DashboardSection>
          <div className="flex flex-col items-center text-center gap-3 py-6">
            {status === "pending" ? (
              <Loader2 className="w-10 h-10 animate-spin text-dashboard-primary" />
            ) : status === "ok" ? (
              <CheckCircle2 className="w-10 h-10 text-dashboard-success" />
            ) : (
              <XCircle className="w-10 h-10 text-dashboard-danger" />
            )}
            <p className="text-base font-semibold text-foreground">{message}</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              {status === "ok"
                ? "Your fee record has been updated in real-time. You can download your official tax invoice PDF from the billing portal."
                : status === "pending"
                  ? "Please wait while our server reconciles the gateway transaction."
                  : "If funds were deducted from your wallet, please contact our accounts desk with your transaction reference."}
            </p>
            <DashboardButton asChild variant="outline" size="sm" className="mt-2">
              <Link href="/client/billing">Back to billing</Link>
            </DashboardButton>
          </div>
        </DashboardSection>
      </div>
    </PortalPageShell>
  );
}
