import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Receipt, Download, Plus, Loader2 } from "lucide-react";
import { formatNPR } from "@/lib/lex-constants.ts";
import { toast } from "sonner";
import { useCases } from "@/client/queries/cases";
import { useClients } from "@/client/queries/clients";
import { generateInvoicePDF } from "@/lib/pdf-generator.ts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { useInvoices, useInvoiceCommands, useTrustTransactions, useTrustCommands, useTimeEntries } from "@/client/queries/financial";
import { useEmailCommands } from "@/client/queries/communication";

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  draft: "bg-gray-100 text-gray-800",
};

export default function AdminFinancePage() {
  const { data: invoices = [] } = useInvoices({});
  const { data: trustLedger = [] } = useTrustTransactions({});
  const { data: timeEntries = [] } = useTimeEntries({});
  const cases = useCases({}) || [];
  const clients = useClients() || [];

  const { createInvoice: createInvoiceMutation, updateStatus: updateStatusMutation } = useInvoiceCommands();
  const { createTrustTransaction: createTrustMutation } = useTrustCommands();
  const { sendEmail } = useEmailCommands();

  const [isDrafting, setIsDrafting] = useState(false);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isLoading = false;

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
      
      await createInvoiceMutation.mutateAsync({
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

  const handleStatus = async (invoice: any, status: "sent" | "paid" | "overdue" | "cancelled") => {
    setStatusBusy(invoice._id + status);
    try {
      await updateStatusMutation.mutateAsync({
        id: invoice._id,
        status,
      });
      if (status === "sent") {
        const client = clients.find((c: any) => c._id === invoice.clientId);
        if (client?.email) {
          await sendEmail.mutateAsync({
            to: client.email,
            subject: `Invoice ${invoice.invoiceNumber}`,
            body: `Dear ${client.fullName},\n\nPlease find invoice ${invoice.invoiceNumber} for ${formatNPR(invoice.total)}. Due: ${invoice.dueDate}.\n\nSrimar Law`,
            relatedId: invoice._id,
          });
        }
      }
      toast.success(`Invoice marked ${status}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update invoice");
    } finally {
      setStatusBusy(null);
    }
  };

  const handleTrustReceipt = async () => {
    const clientId = clients[0]?._id;
    if (!clientId) return toast.error("No clients available");
    try {
      const amount = 50000;
      const balance =
        trustLedger
          .filter((t: any) => t.clientId === clientId)
          .reduce((s: number, t: any) => s + (t.type === "receipt" ? t.amount : -t.amount), 0) + amount;
      await createTrustMutation.mutateAsync({
        clientId,
        type: "receipt",
        amount,
        description: "Retainer top-up",
        date: new Date().toISOString().slice(0, 10),
        balance,
        idempotencyKey: crypto.randomUUID(),
      });
      toast.success("Trust receipt recorded");
    } catch (err: any) {
      toast.error(err?.message || "Failed to record trust transaction");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const kpiCards = [
    { label: "Collected", value: formatNPR(totalRevenue), color: "text-green-500" },
    { label: "Outstanding", value: formatNPR(totalOutstanding), color: "text-red-500" },
    { label: "Trust Escrow", value: formatNPR(trustBalance), color: "text-primary" },
  ];

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 w-full min-w-0 overflow-x-hidden">
      <div className="min-w-0">
        <h1 className="font-serif text-xl sm:text-2xl font-bold text-foreground">Finance & Compliance</h1>
        <p className="text-sm text-muted-foreground mt-1">Invoices, collections, and trust ledger.</p>
      </div>

      {/* 2-col on phone (3rd spans full), 3-col from sm — avoids one huge card per row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {kpiCards.map((s, i) => (
          <Card
            key={s.label}
            className={`min-w-0 overflow-hidden ${i === 2 ? "col-span-2 sm:col-span-1" : ""}`}
          >
            <CardContent className="p-3 sm:p-4">
              <p className={`text-base sm:text-xl font-bold tabular-nums leading-tight break-words ${s.color}`}>
                {s.value}
              </p>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 min-w-0">
        <Card className="lg:col-span-2 min-w-0 overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b px-3 sm:px-6">
            <CardTitle className="text-base font-semibold font-serif">Invoices</CardTitle>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-1" /> New Invoice</Button>
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
          <CardContent className="space-y-3 pt-4 px-3 sm:px-6">
            {invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No invoices found.</p>
            ) : (
              invoices.map((inv: any) => {
                const clientName = clients.find((c: any) => c._id === inv.clientId)?.fullName || "Unknown Client";
                const caseNum = cases.find((c: any) => c._id === inv.caseId)?.caseNumber || "Matter";
                
                return (
                  <div key={inv._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border border-border rounded-lg min-w-0">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <Receipt className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{inv.invoiceNumber} — {clientName}</p>
                        <p className="text-xs text-muted-foreground break-words">{caseNum} · {inv.issuedDate} · Due {inv.dueDate}</p>
                        <p className="text-xs text-muted-foreground font-mono break-words">Subtotal {formatNPR(inv.subtotal)} + VAT {formatNPR(inv.vatAmount)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end pl-8 sm:pl-0">
                      <div className="text-left sm:text-right mr-auto sm:mr-0">
                        <p className="text-sm font-bold text-foreground tabular-nums">{formatNPR(inv.total)}</p>
                        <Badge className={`text-[10px] uppercase ${STATUS_COLORS[inv.status] || "bg-gray-100"}`}>{inv.status}</Badge>
                      </div>
                      {inv.status === "draft" && (
                        <Button size="sm" variant="outline" className="text-xs h-7" disabled={!!statusBusy} onClick={() => handleStatus(inv, "sent")}>
                          Send
                        </Button>
                      )}
                      {(inv.status === "sent" || inv.status === "overdue") && (
                        <Button size="sm" variant="outline" className="text-xs h-7" disabled={!!statusBusy} onClick={() => handleStatus(inv, "paid")}>
                          Mark Paid
                        </Button>
                      )}
                      {inv.status !== "cancelled" && inv.status !== "paid" && (
                        <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive" disabled={!!statusBusy} onClick={() => handleStatus(inv, "cancelled")}>
                          Cancel
                        </Button>
                      )}
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

        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3 sm:px-6">
            <CardTitle className="text-base font-semibold font-serif">Trust Ledger (All)</CardTitle>
            <Button size="sm" variant="outline" className="text-xs h-7 w-full sm:w-auto" onClick={handleTrustReceipt}>
              + Receipt
            </Button>
          </CardHeader>
          <CardContent className="pt-4 space-y-2 max-h-[60vh] overflow-y-auto px-3 sm:px-6">
            {trustLedger.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No trust transactions.</p>
            ) : (
              trustLedger.map((t: any) => {
                const clientName = clients.find((c: any) => c._id === t.clientId)?.fullName || "Client";
                return (
                  <div key={t._id} className="p-3 border border-border rounded-lg bg-card text-xs min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-1 min-w-0">
                      <p className="font-semibold text-foreground line-clamp-2 min-w-0 flex-1">{t.description}</p>
                      <p className={`font-bold shrink-0 tabular-nums ${t.type === "receipt" ? "text-green-500" : "text-red-500"}`}>
                        {t.type === "receipt" ? "+" : "-"}{formatNPR(t.amount)}
                      </p>
                    </div>
                    <div className="flex justify-between gap-2 text-muted-foreground min-w-0">
                      <span className="truncate">{clientName}</span>
                      <span className="shrink-0">{t.date}</span>
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
