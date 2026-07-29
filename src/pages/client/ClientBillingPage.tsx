import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Receipt, Download } from "lucide-react";
import { toast } from "sonner";
import { formatNPR } from "@/lib/lex-constants.ts";

const INVOICES = [
  { number: "INV-2081-001", case: "Property Dispute", issued: "1 Mangsir 2081", due: "15 Mangsir 2081", amount: 15000, status: "sent" },
  { number: "INV-2081-002", case: "Company Registration", issued: "20 Kartik 2081", due: "5 Mangsir 2081", amount: 25000, status: "paid" },
];

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  sent: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  draft: "bg-gray-100 text-gray-800",
};

export default function ClientBillingPage() {
  const outstanding = INVOICES.filter((i) => i.status !== "paid").reduce((s, i) => s + i.amount, 0);
  const paid = INVOICES.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="font-serif text-2xl font-bold text-foreground">Billing & Payments</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Outstanding", value: formatNPR(outstanding), color: "text-red-500" },
          { label: "Paid This Year", value: formatNPR(paid), color: "text-green-500" },
          { label: "Total Invoices", value: String(INVOICES.length), color: "text-foreground" },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-4"><p className={`text-xl font-bold ${s.color}`}>{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></CardContent></Card>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Invoices</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {INVOICES.map((inv) => (
            <div key={inv.number} className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <Receipt className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{inv.number}</p>
                  <p className="text-xs text-muted-foreground">{inv.case} \u2014 Due {inv.due}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{formatNPR(inv.amount)}</p>
                  <Badge className={`text-xs ${STATUS_COLORS[inv.status]}`}>{inv.status}</Badge>
                </div>
                <div className="flex gap-1">
                  {inv.status === "sent" && <Button size="sm" className="text-xs" onClick={() => toast.info("Online payment coming soon!")}>Pay Now</Button>}
                  <Button variant="ghost" size="sm" onClick={() => toast.info("PDF receipt download coming soon!")}><Download className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
