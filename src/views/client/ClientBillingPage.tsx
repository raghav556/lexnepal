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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { useInvoices, useInvoiceCommands, useTrustTransactions, useTimeEntries } from "@/client/queries/financial";

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  sent: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  draft: "bg-gray-100 text-gray-800",
};

export default function ClientBillingPage() {
  const client = useMyClient();
  const clientId = client?._id;
  const cases = useCases(clientId ? { clientId } : {}) || [];
  const { data: invoices = [] } = useInvoices(clientId ? { clientId } : {});
  const { data: trustTransactions = [] } = useTrustTransactions(clientId ? { clientId } : {});
  const { data: timeEntries = [] } = useTimeEntries({});
  const systemSettings = useSystemSettings();

  const { payInvoice: payInvoiceMutation, initiateGateway: initiateGatewayMutation } = useInvoiceCommands();

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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
  const paid = invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + i.total, 0);
  const trustBalance = trustTransactions.reduce(
    (s: number, t: any) => s + (t.type === "receipt" ? t.amount : -t.amount),
    0,
  );

  const activePayments: string[] =
    (systemSettings as typeof systemSettings & { integrations?: { activePayments?: string[] } })
      ?.integrations?.activePayments || ["bank_transfer", "esewa", "khalti"];

  const handleDownloadPDF = (invoice: any) => {
    try {
      const caseData = cases.find((c: any) => c._id === invoice.caseId) || {};
      const entries = timeEntries.filter((t: any) => t.invoiceId === invoice._id);
      generateInvoicePDF(invoice, client, caseData, entries);
      toast.success("Tax Invoice PDF generated successfully.");
    } catch {
      toast.error("Failed to generate PDF.");
    }
  };

  const handleProcessPayment = async (method: "esewa" | "khalti" | "connectips" | "bank_transfer" | "cash") => {
    if (!selectedInvoice) return;
    setIsProcessing(true);
    const payKey = crypto.randomUUID();
    try {
      if (method === "esewa" || method === "khalti" || method === "connectips") {
        const init = await initiateGatewayMutation.mutateAsync({
          invoiceId: selectedInvoice._id,
          gateway: method,
          idempotencyKey: `gw-${payKey}`,
        });
        // Sandbox: immediately confirm after initiate (merchant redirect would go here)
        await payInvoiceMutation.mutateAsync({
          invoiceId: selectedInvoice._id,
          gateway: method,
          referenceNumber: String((init as any).paymentId),
          amount: selectedInvoice.total,
          idempotencyKey: `pay-${payKey}`,
        });
      } else {
        await payInvoiceMutation.mutateAsync({
          invoiceId: selectedInvoice._id,
          gateway: method,
          referenceNumber: `MANUAL-${Date.now()}`,
          amount: selectedInvoice.total,
          idempotencyKey: payKey,
        });
      }
      toast.success(`Payment of ${formatNPR(selectedInvoice.total)} recorded via ${method}`);
      setPaymentModalOpen(false);
      setSelectedInvoice(null);
    } catch (err: any) {
      toast.error("Payment failed: " + (err?.message || "unknown error"));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 font-sans">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">Billing & Escrow</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage your invoices, payments, and trust ledger balances.</p>
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
                  <div key={inv._id} className="flex items-center justify-between p-3 border border-border rounded-lg gap-3">
                    <div className="flex items-center gap-3">
                      <Receipt className="w-5 h-5 text-muted-foreground/60" />
                      <div>
                        <p className="text-sm font-semibold">{inv.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {matchedCase ? matchedCase.title : "Matter"} — Due {inv.dueDate}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-bold">{formatNPR(inv.total)}</p>
                        <Badge className={`text-[10px] uppercase ${STATUS_COLORS[inv.status] || "bg-gray-100"}`}>
                          {inv.status}
                        </Badge>
                      </div>
                      {inv.status === "sent" || inv.status === "overdue" ? (
                        <Button size="sm" className="text-xs" onClick={() => { setSelectedInvoice(inv); setPaymentModalOpen(true); }}>
                          Pay Now
                        </Button>
                      ) : null}
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDownloadPDF(inv)}>
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

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
              <p className="text-xs text-muted-foreground text-center py-8">No escrow trust transactions recorded.</p>
            ) : (
              trustTransactions.map((tx: any) => (
                <div key={tx._id} className="p-3 border rounded-lg text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium">{tx.description}</span>
                    <span className={tx.type === "receipt" ? "text-green-600" : "text-red-600"}>
                      {tx.type === "receipt" ? "+" : "-"}{formatNPR(tx.amount)}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{tx.date}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay {selectedInvoice?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Amount due: <strong>{selectedInvoice ? formatNPR(selectedInvoice.total) : ""}</strong>
          </p>
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
                  Pay with {method.replace("_", " ")}
                </Button>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
