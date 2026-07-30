import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Receipt, Download, Plus, Loader2 } from "lucide-react";
import { formatNPR } from "@/lib/lex-constants.ts";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { generateInvoicePDF } from "@/lib/pdf-generator.ts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  draft: "bg-gray-100 text-gray-800",
};

export default function AdminFinancePage() {
  const invoices = useQuery(api.invoices.listInvoices, {}) || [];
  const trustLedger = useQuery(api.invoices.listTrustTransactions, {}) || [];
  const timeEntries = useQuery(api.timeEntries.listTimeEntries, {}) || [];
  const cases = useQuery(api.cases.listCases, {}) || [];
  const clients = useQuery(api.clients.listClients, {}) || [];

  const createInvoice = useMutation(api.invoices.createInvoiceFromTimeEntries);

  const [isDrafting, setIsDrafting] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isLoading = invoices === undefined || timeEntries === undefined;

  const totalRevenue = invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + i.total, 0);
  const totalOutstanding = invoices.filter((i: any) => i.status !== "paid" && i.status !== "cancelled").reduce((s: number, i: any) => s + i.total, 0);
  
  // Aggregate trust balance
  const trustBalance = trustLedger.reduce((sum: number, t: any) => sum + (t.type === "receipt" ? t.amount : -t.amount), 0);

  // Available cases to bill (have unbilled billable time)
  const casesWithUnbilledTime = cases.filter((c: any) => {
    return timeEntries.some((t: any) => t.caseId === c._id && t.isBillable && !t.invoiceId);
  });

  const handleDraftInvoice = async () => {
    if (!selectedCaseId) return toast.error("Select a case");
    setIsDrafting(true);
    try {
      const selectedCase = cases.find((c: any) => c._id === selectedCaseId);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15); // 15 days terms
      
      await createInvoice({
        caseId: selectedCaseId as any,
        clientId: (selectedCase?.clientId || "") as any,
        dueDate: dueDate.toISOString().split("T")[0],
        notes: "Thank you for your business.",
      });
      toast.success("Invoice drafted successfully. VAT calculated automatically.");
      setIsModalOpen(false);
      setSelectedCaseId("");
    } catch (err: any) {
      toast.error(err.message || "Failed to draft invoice");
    } finally {
      setIsDrafting(false);
    }
  };

  const handleDownloadPDF = (invoice: any) => {
    try {
      const client = clients.find((c: any) => c._id === invoice.clientId) || { fullName: "Unknown Client" };
      const caseData = cases.find((c: any) => c._id === invoice.caseId) || {};
      const entries = timeEntries.filter((t: any) => t.invoiceId === invoice._id);
      
      generateInvoicePDF(invoice, client, caseData, entries);
      toast.success("PDF generated successfully");
    } catch (err) {
      toast.error("Failed to generate PDF");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="font-serif text-2xl font-bold text-foreground">Finance & Compliance</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Collected", value: formatNPR(totalRevenue), color: "text-green-500" },
          { label: "Outstanding", value: formatNPR(totalOutstanding), color: "text-red-500" },
          { label: "Total Trust Escrow", value: formatNPR(trustBalance), color: "text-primary" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
            <CardTitle className="text-base font-semibold font-serif">Invoices</CardTitle>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Invoice</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Draft Invoice from Time Entries</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">Select a matter with unbilled time entries. The system will aggregate hours, compute 13% VAT, and draft a tax invoice.</p>
                  <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a matter..." />
                    </SelectTrigger>
                    <SelectContent>
                      {casesWithUnbilledTime.length === 0 ? (
                        <SelectItem value="none" disabled>No matters with unbilled time</SelectItem>
                      ) : (
                        casesWithUnbilledTime.map((c: any) => (
                          <SelectItem key={c._id} value={c._id}>{c.caseNumber} - {c.title}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  
                  {selectedCaseId && (
                    <div className="p-3 bg-secondary/50 rounded-lg text-sm space-y-1">
                      <p>Unbilled Time Entries: {timeEntries.filter((t: any) => t.caseId === selectedCaseId && t.isBillable && !t.invoiceId).length}</p>
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleDraftInvoice} disabled={!selectedCaseId || isDrafting}>
                      {isDrafting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                      Draft Invoice
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No invoices found.</p>
            ) : (
              invoices.map((inv: any) => {
                const clientName = clients.find((c: any) => c._id === inv.clientId)?.fullName || "Unknown Client";
                const caseNum = cases.find((c: any) => c._id === inv.caseId)?.caseNumber || "Matter";
                
                return (
                  <div key={inv._id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Receipt className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{inv.invoiceNumber} — {clientName}</p>
                        <p className="text-xs text-muted-foreground">{caseNum} | Issued: {inv.issuedDate} | Due: {inv.dueDate}</p>
                        <p className="text-xs text-muted-foreground font-mono">Subtotal: {formatNPR(inv.subtotal)} + VAT (13%): {formatNPR(inv.vatAmount)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">{formatNPR(inv.total)}</p>
                        <Badge className={`text-[10px] uppercase ${STATUS_COLORS[inv.status] || "bg-gray-100"}`}>{inv.status}</Badge>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDownloadPDF(inv)} title="Download PDF">
                        <Download className="w-4 h-4" />
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
            <CardTitle className="text-base font-semibold font-serif">Trust Ledger (All)</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2 max-h-[60vh] overflow-y-auto">
            {trustLedger.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No trust transactions.</p>
            ) : (
              trustLedger.map((t: any) => {
                const clientName = clients.find((c: any) => c._id === t.clientId)?.fullName || "Client";
                return (
                  <div key={t._id} className="p-3 border border-border rounded-lg bg-card text-xs">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-semibold text-foreground line-clamp-1 flex-1">{t.description}</p>
                      <p className={`font-bold ml-2 ${t.type === "receipt" ? "text-green-500" : "text-red-500"}`}>
                        {t.type === "receipt" ? "+" : "-"}{formatNPR(t.amount)}
                      </p>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span className="truncate">{clientName}</span>
                      <span>{t.date}</span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
