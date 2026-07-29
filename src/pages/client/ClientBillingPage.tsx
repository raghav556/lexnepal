import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Receipt, Download, Loader2, ArrowUpRight, ArrowDownLeft, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { formatNPR } from "@/lib/lex-constants.ts";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { generateInvoicePDF } from "@/lib/pdf-generator.ts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  sent: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  draft: "bg-gray-100 text-gray-800",
};

export default function ClientBillingPage() {
  const currentUser = useCurrentUser();
  const cases = useQuery(api.cases.listCases, currentUser ? { clientId: currentUser._id as any } : "skip" as any) || [];
  const invoices = useQuery(api.invoices.listInvoices, currentUser ? { clientId: currentUser._id as any } : "skip" as any) || [];
  const trustTransactions = useQuery(api.invoices.listTrustTransactions, currentUser ? { clientId: currentUser._id as any } : "skip" as any) || [];
  const timeEntries = useQuery(api.timeEntries.listTimeEntries, {}) || [];

  const payInvoice = useMutation(api.invoices.payInvoice);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (currentUser === undefined) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const outstanding = invoices.filter((i: any) => i.status !== "paid" && i.status !== "cancelled").reduce((s: number, i: any) => s + i.total, 0);
  const paid = invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + i.total, 0);

  const latestTx = trustTransactions[0]; // Assuming descending sort from mock API
  const trustBalance = latestTx ? latestTx.balance : 0;

  const handleDownloadPDF = (invoice: any) => {
    try {
      const caseData = cases.find((c: any) => c._id === invoice.caseId) || {};
      const entries = timeEntries.filter((t: any) => t.invoiceId === invoice._id);
      generateInvoicePDF(invoice, currentUser, caseData, entries);
      toast.success("Tax Invoice PDF generated successfully.");
    } catch (err) {
      toast.error("Failed to generate PDF.");
    }
  };

  const handleOpenPayment = (invoice: any) => {
    setSelectedInvoice(invoice);
    setPaymentModalOpen(true);
  };

  const handleProcessPayment = async (method: string) => {
    setIsProcessing(true);
    // Simulate gateway delay
    setTimeout(async () => {
      try {
        await payInvoice({ invoiceId: selectedInvoice._id as any, paymentMethod: method });
        toast.success(`Payment of ${formatNPR(selectedInvoice.total)} successful via ${method}`);
        setPaymentModalOpen(false);
        setSelectedInvoice(null);
      } catch (err: any) {
        toast.error("Payment failed: " + err.message);
      } finally {
        setIsProcessing(false);
      }
    }, 1500);
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
        {/* Invoices List */}
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
                  <div key={inv._id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:shadow-xs transition-shadow gap-3">
                    <div className="flex items-center gap-3">
                      <Receipt className="w-5 h-5 text-muted-foreground/60 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{inv.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {matchedCase ? matchedCase.title : "Matter"} &mdash; Due {inv.dueDate}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">{formatNPR(inv.total)}</p>
                        <Badge className={`text-[10px] uppercase ${STATUS_COLORS[inv.status] || "bg-gray-100"}`}>
                          {inv.status}
                        </Badge>
                      </div>
                      <div className="flex gap-1.5">
                        {inv.status === "sent" && (
                          <Button size="sm" className="text-xs" onClick={() => handleOpenPayment(inv)}>
                            Pay Now
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDownloadPDF(inv)}>
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Escrow Trust Ledger */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold font-serif">Trust Escrow Ledger</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {trustTransactions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No escrow trust transactions recorded.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 bg-secondary/35 p-3 rounded-lg border border-dashed text-xs text-muted-foreground mb-4">
                  <ShieldAlert className="w-4 h-4 text-accent/80 flex-shrink-0" />
                  <span>Escrow accounts are audited & verified under Bar Council regulations.</span>
                </div>

                <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  {trustTransactions.map((tx: any) => (
                    <div key={tx._id} className="p-3 border rounded-lg bg-card text-xs space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground line-clamp-1">{tx.description}</span>
                        <span className={`font-bold flex items-center gap-0.5 ${tx.type === "receipt" ? "text-green-600" : "text-red-500"}`}>
                          {tx.type === "receipt" ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {formatNPR(tx.amount)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                        <span>Date: {tx.date}</span>
                        <span className="font-mono bg-secondary px-1.5 py-0.5 rounded">
                          Bal: {formatNPR(tx.balance)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Gateway Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Payment Method</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4 py-4">
              <div className="bg-secondary/40 p-4 rounded-xl text-center space-y-1">
                <p className="text-sm text-muted-foreground">Amount Due</p>
                <p className="text-2xl font-bold text-foreground">{formatNPR(selectedInvoice.total)}</p>
                <p className="text-xs text-muted-foreground">Invoice #{selectedInvoice.invoiceNumber}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="h-16 flex flex-col items-center justify-center gap-1 border-[#60B12D]/30 hover:border-[#60B12D] hover:bg-[#60B12D]/5"
                  onClick={() => handleProcessPayment("eSewa")}
                  disabled={isProcessing}
                >
                  <span className="font-bold text-[#60B12D]">eSewa</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-16 flex flex-col items-center justify-center gap-1 border-[#5C2D91]/30 hover:border-[#5C2D91] hover:bg-[#5C2D91]/5"
                  onClick={() => handleProcessPayment("Khalti")}
                  disabled={isProcessing}
                >
                  <span className="font-bold text-[#5C2D91]">Khalti</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-16 flex flex-col items-center justify-center gap-1 border-blue-500/30 hover:border-blue-500 hover:bg-blue-500/5"
                  onClick={() => handleProcessPayment("ConnectIPS")}
                  disabled={isProcessing}
                >
                  <span className="font-bold text-blue-600 dark:text-blue-400">ConnectIPS</span>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-16 flex flex-col items-center justify-center gap-1"
                  onClick={() => handleProcessPayment("Bank Transfer")}
                  disabled={isProcessing}
                >
                  <span className="font-semibold text-foreground">Bank Transfer</span>
                </Button>
              </div>
              
              {isProcessing && (
                <div className="flex items-center justify-center text-sm text-muted-foreground py-2 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Processing payment with gateway...
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
