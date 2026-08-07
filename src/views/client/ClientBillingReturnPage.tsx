"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { useInvoiceCommands } from "@/client/queries/financial";
import { formatNPR } from "@/lib/lex-constants.ts";

export default function ClientBillingReturnPage() {
  const params = useSearchParams();
  const router = useRouter();
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
        setMessage(
          amount
            ? `Payment of ${formatNPR(amount)} confirmed.`
            : "Payment confirmed.",
        );
      } catch (err: unknown) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Could not confirm payment.");
      }
    })();
  }, [params, payInvoice, router]);

  return (
    <div className="p-6 max-w-lg mx-auto">
      <Card>
        <CardContent className="p-8 flex flex-col items-center text-center gap-3">
          {status === "pending" ? (
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          ) : status === "ok" ? (
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          ) : (
            <XCircle className="w-8 h-8 text-destructive" />
          )}
          <p className="text-sm font-medium">{message}</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/client/billing">Back to billing</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
