"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Receipt, Download, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { formatNPR } from "@/lib/lex-constants.ts";
import { useMyClient } from "@/client/queries/clients";
import { useCases } from "@/client/queries/cases";
import { useSystemSettings } from "@/client/queries/identity";
import { generateInvoicePDF } from "@/lib/pdf-generator.ts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog.tsx";
import {
  fetchInvoiceDetail,
  useInvoices,
  useInvoiceCommands,
  useMyPayments,
  useTrustTransactions,
} from "@/client/queries/financial";

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  sent: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  draft: "bg-gray-100 text-gray-800",
};

const IS_SANDBOX =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_PAYMENTS_SANDBOX === "true";

export default function ClientBillingPage() {
  const client = useMyClient();
  const clientId = client?._id;
  const cases = useCases(clientId ? { clientId } : {}) || [];
  const { data: invoices = [] } = useInvoices(clientId ? { clientId } : {});
  const { data: trustTransactions = [] } = useTrustTransactions(clientId ? { clientId } : {});
  const { data: payments = [] } = useMyPayments();
  const systemSettings = useSystemSettings();

  const { payInvoice: payInvoiceMutation, initiateGateway: initiateGatewayMutation } =
    useInvoiceCommands();

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBankInstructions, setShowBankInstructions] = useState(false);

  if (client === undefined) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (client === null) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No client profile is linked to your account. Contact the firm to activate billing.
      </div>
    );
  }

  const outstanding = invoices
    .filter((i: any) => i.status !== "paid" && i.status !== "cancelled")
    .reduce((s: number, i: any) => s + i.total, 0);
  const paid = invoices
    .filter((i: any) => i.status === "paid")
    .reduce((s: number, i: any) => s + i.total, 0);
  const trustBalance = trustTransactions.reduce(
    (s: number, t: any) => s + (t.type === "receipt" ? t.amount : -t.amount),
    0,
  );

  const activePayments: string[] =
    (systemSettings as typeof systemSettings & { integrations?: { activePayments?: string[] } })
      ?.integrations?.activePayments || ["bank_transfer", "esewa", "khalti"];

  const handleDownloadPDF = async (invoice: any) => {
    try {
      const detail = await fetchInvoiceDetail(invoice._id);
      const caseData = cases.find((c: any) => c._id === detail.caseId || c._id === invoice.caseId) || {};
      generateInvoicePDF(detail, client, caseData, detail.lineItems || []);
      toast.success("Tax Invoice PDF generated successfully.");
    } catch {
      toast.error("Failed to generate PDF.");
    }
  };

  const handleProcessPayment = async (
    method: "esewa" | "khalti" | "connectips" | "bank_transfer" | "cash",
  ) => {
    if (!selectedInvoice) return;
    if (method === "bank_transfer") {
      setShowBankInstructions(true);
      return;
    }
    setIsProcessing(true);
    const payKey = crypto.randomUUID();
    try {
      const init = await initiateGatewayMutation.mutateAsync({
        invoiceId: selectedInvoice._id,
        gateway: method,
        idempotencyKey: `gw-${payKey}`,
      });

      const redirectUrl =
        (init as any)?.redirectUrl || (init as any)?.paymentUrl || (init as any)?.url;

      if (!IS_SANDBOX && redirectUrl) {
        const returnUrl = `${window.location.origin}/client/billing/return?invoiceId=${selectedInvoice._id}&paymentId=${(init as any).paymentId}&gateway=${method}&key=${payKey}`;
        sessionStorage.setItem(
          `pay-pending-${payKey}`,
          JSON.stringify({
            invoiceId: selectedInvoice._id,
            paymentId: (init as any).paymentId,
            gateway: method,
            amount: selectedInvoice.total,
            idempotencyKey: `pay-${payKey}`,
            returnUrl,
          }),
        );
        window.location.href = String(redirectUrl);
        return;
      }

      // Sandbox / no redirect URL: confirm immediately and label honestly.
      await payInvoiceMutation.mutateAsync({
        invoiceId: selectedInvoice._id,
        gateway: method,
        referenceNumber: String((init as any).paymentId),
        amount: selectedInvoice.total,
        idempotencyKey: `pay-${payKey}`,
      });
      toast.success(
        IS_SANDBOX
          ? `Sandbox payment of ${formatNPR(selectedInvoice.total)} recorded via ${method}`
          : `Payment of ${formatNPR(selectedInvoice.total)} recorded via ${method}`,
      );
      setPaymentModalOpen(false);
      setSelectedInvoice(null);
    } catch (err: unknown) {
      toast.error("Payment failed: " + (err instanceof Error ? err.message : "unknown error"));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 font-sans">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">Billing & Escrow</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Manage your invoices, payments, and trust ledger balances.
          {IS_SANDBOX ? " Gateway buttons run in sandbox confirmation mode." : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Outstanding Balance", value: formatNPR(outstanding), color: "text-red-500" },
          { label: "Paid Invoices", value: formatNPR(paid), color: "text-green-500" },
          { label: "Trust Account Balance", value: formatNPR(trustBalance), color: "text-primary" },
          { label: "Total Invoices", value: String(invoices.length), color: "text-foreground" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold font-serif">Invoices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {invoices.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No invoices found.</p>
            ) : (
              invoices.map((inv: any) => {
                const matchedCase = cases.find((c: any) => c._id === inv.caseId);
                return (
                  <div
                    key={inv._id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Receipt className="w-5 h-5 text-muted-foreground/60 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{inv.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {matchedCase ? matchedCase.title : "Matter"} — Due {inv.dueDate}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold">{formatNPR(inv.total)}</p>
                        <Badge
                          className={`text-[10px] uppercase ${STATUS_COLORS[inv.status] || "bg-gray-100"}`}
                        >
                          {inv.status}
                        </Badge>
                      </div>
                      {inv.status === "sent" || inv.status === "overdue" ? (
                        <Button
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setShowBankInstructions(false);
                            setPaymentModalOpen(true);
                          }}
                        >
                          Pay Now
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleDownloadPDF(inv)}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold font-serif">Trust Escrow Ledger</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-2 bg-secondary/35 p-3 rounded-lg border border-dashed text-xs text-muted-foreground">
                <ShieldAlert className="w-4 h-4 text-accent/80" />
                <span>Escrow accounts are audited under Bar Council regulations.</span>
              </div>
              {trustTransactions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No escrow trust transactions recorded.
                </p>
              ) : (
                trustTransactions.map((tx: any) => (
                  <div key={tx._id} className="p-3 border rounded-lg text-xs space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium break-words">{tx.description}</span>
                      <span className={tx.type === "receipt" ? "text-green-600" : "text-red-600"}>
                        {tx.type === "receipt" ? "+" : "-"}
                        {formatNPR(tx.amount)}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{tx.date}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold font-serif">Payment history</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              {payments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No payments recorded yet.</p>
              ) : (
                payments.slice(0, 12).map((p: any) => (
                  <div key={p._id || p.id} className="p-3 border rounded-lg text-xs space-y-1.5">
                    <div className="flex justify-between gap-2 items-baseline">
                      <span className="font-medium capitalize">{p.gateway || "payment"}</span>
                      <span className="font-semibold tabular-nums">{formatNPR(p.amount)}</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      <span className="capitalize">{p.status || "recorded"}</span>
                      {p.referenceNumber ? ` · Ref ${p.referenceNumber}` : ""}
                      {p.paidAt || p.createdAt
                        ? ` · ${new Date(p.paidAt || p.createdAt).toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay {selectedInvoice?.invoiceNumber}</DialogTitle>
            <DialogDescription>
              Amount due: <strong>{selectedInvoice ? formatNPR(selectedInvoice.total) : ""}</strong>
              {IS_SANDBOX
                ? " — Sandbox mode: digital wallets confirm immediately without a live merchant redirect."
                : ""}
            </DialogDescription>
          </DialogHeader>

          {showBankInstructions ? (
            <div className="space-y-3 text-sm">
              <p className="font-medium">Bank transfer instructions</p>
              <div className="rounded-lg border bg-secondary/30 p-3 text-xs space-y-1">
                <p>Bank: Nepal Bank Ltd.</p>
                <p>Account name: Srimar Law Associates</p>
                <p>Account number: 0123456789012345</p>
                <p>
                  Reference: {selectedInvoice?.invoiceNumber} (include on the transfer memo)
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                After transferring, the firm will mark the invoice paid once funds clear. You can
                keep the PDF as your receipt request.
              </p>
              <Button variant="outline" onClick={() => setShowBankInstructions(false)}>
                Back to payment methods
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 pt-2">
              {(["esewa", "khalti", "bank_transfer"] as const)
                .filter((m) => activePayments.includes(m) || m === "bank_transfer")
                .map((method) => (
                  <Button
                    key={method}
                    disabled={isProcessing}
                    onClick={() => handleProcessPayment(method)}
                    className="justify-start capitalize"
                    variant={method === "bank_transfer" ? "outline" : "default"}
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {method === "bank_transfer"
                      ? "Pay with bank transfer"
                      : IS_SANDBOX
                        ? `Sandbox pay with ${method}`
                        : `Pay with ${method}`}
                  </Button>
                ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
