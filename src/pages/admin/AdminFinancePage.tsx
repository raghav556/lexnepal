import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Receipt, Download } from "lucide-react";
import { formatNPR } from "@/lib/lex-constants.ts";
import { toast } from "sonner";

const INVOICES = [
  { number: "INV-2081-001", client: "Prakash Sharma", case: "KTM/2081/001", issued: "1 Mangsir", due: "15 Mangsir", subtotal: 13274, vat: 1726, total: 15000, status: "sent" },
  { number: "INV-2081-002", client: "TechVenture Pvt. Ltd.", case: "KTM/2081/002", issued: "20 Kartik", due: "5 Mangsir", subtotal: 22124, vat: 2876, total: 25000, status: "paid" },
  { number: "INV-2081-003", client: "Nepal Bank Ltd.", case: "KTM/2081/004", issued: "10 Kartik", due: "25 Kartik", subtotal: 35398, vat: 4602, total: 40000, status: "overdue" },
];

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  draft: "bg-gray-100 text-gray-800",
};

const TRUST = [
  { client: "Prakash Sharma", type: "receipt", amount: 50000, date: "1 Kartik 2081", description: "Advance retainer" },
  { client: "Prakash Sharma", type: "disbursement", amount: -5000, date: "10 Kartik 2081", description: "Court fee payment" },
];

export default function AdminFinancePage() {
  const totalRevenue = INVOICES.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0);
  const totalOutstanding = INVOICES.filter((i) => i.status !== "paid" && i.status !== "cancelled").reduce((s, i) => s + i.total, 0);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="font-serif text-2xl font-bold text-foreground">Finance & Compliance</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Collected (MTD)", value: formatNPR(totalRevenue), color: "text-green-400" },
          { label: "Outstanding", value: formatNPR(totalOutstanding), color: "text-red-400" },
          { label: "Trust Account Balance", value: formatNPR(45000), color: "text-amber-400" },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-4"><p className={`text-xl font-bold ${s.color}`}>{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></CardContent></Card>
        ))}
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Invoices</CardTitle>
          <Button size="sm" onClick={() => toast.info("Invoice generation coming in milestone 6!")}>New Invoice</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {INVOICES.map((inv) => (
            <div key={inv.number} className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <Receipt className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{inv.number} \u2014 {inv.client}</p>
                  <p className="text-xs text-muted-foreground">{inv.case} | Issued: {inv.issued} | Due: {inv.due}</p>
                  <p className="text-xs text-muted-foreground">Subtotal: {formatNPR(inv.subtotal)} + VAT (13%): {formatNPR(inv.vat)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">{formatNPR(inv.total)}</p>
                  <Badge className={`text-xs ${STATUS_COLORS[inv.status]}`}>{inv.status}</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={() => toast.info("PDF export coming soon!")}><Download className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Trust Account Ledger</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {TRUST.map((t, i) => (
            <div key={i} className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div><p className="text-sm font-medium text-foreground">{t.description}</p><p className="text-xs text-muted-foreground">{t.client} \u2014 {t.date}</p></div>
              <p className={`text-sm font-bold ${t.amount > 0 ? "text-green-400" : "text-red-400"}`}>{t.amount > 0 ? "+" : ""}{formatNPR(t.amount)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
