import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Receipt, Download, Loader2, ArrowUpRight, ArrowDownLeft, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { formatNPR } from "@/lib/lex-constants.ts";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useCurrentUser } from "@/hooks/use-current-user.ts";

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

  if (currentUser === undefined) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Calculate stats dynamically
  const outstanding = invoices.filter((i: any) => i.status !== "paid" && i.status !== "cancelled").reduce((s: number, i: any) => s + i.total, 0);
  const paid = invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + i.total, 0);

  // Trust Ledger calculations
  const latestTx = trustTransactions[trustTransactions.length - 1];
  const trustBalance = latestTx ? latestTx.balance : 0;

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
                          <Button size="sm" className="text-xs" onClick={() => toast.info("Payment gateway integration is simulated in Phase 8.")}>
                            Pay Now
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => toast.info("Invoice PDF will compile in Phase 8.")}>
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

                <div className="space-y-2.5 max-h-[50vh] overflow-y-auto">
                  {trustTransactions.map((tx: any) => (
                    <div key={tx._id} className="p-3 border rounded-lg bg-card text-xs space-y-1.5 shadow-2xs hover:shadow-xs transition-shadow">
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
    </div>
  );
}
