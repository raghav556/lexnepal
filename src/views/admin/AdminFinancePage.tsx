import { useState } from "react";
import { Receipt, Download, Plus, Loader2, DollarSign, Wallet, TrendingUp } from "lucide-react";
import { formatNPR } from "@/lib/lex-constants.ts";
import { toast } from "sonner";
import { useCases } from "@/client/queries/cases";
import { useClients } from "@/client/queries/clients";
import { generateInvoicePDF } from "@/lib/pdf-generator.ts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  useInvoices,
  useInvoiceCommands,
  useTrustTransactions,
  useTrustCommands,
  useTimeEntries,
} from "@/client/queries/financial";
import { useEmailCommands } from "@/client/queries/communication";
import {
  DashboardButton,
  DashboardListRow,
  DashboardSection,
  DashboardStatusLabel,
  DualDateDisplay,
  EmptyState,
  PortalPageShell,
} from "@/components/dashboard";
import { DASHBOARD_METRIC_TONES } from "@/lib/dashboard-semantics";

export default function AdminFinancePage() {
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices({});
  const { data: trustLedger = [], isLoading: trustLoading } = useTrustTransactions({});
  const { data: timeEntries = [] } = useTimeEntries({});
  const cases = useCases({}) || [];
  const clients = useClients() || [];

  const { createInvoice: createInvoiceMutation, updateStatus: updateStatusMutation } =
    useInvoiceCommands();
  const { createTrustTransaction: createTrustMutation } = useTrustCommands();
  const { sendEmail } = useEmailCommands();

  const [isDrafting, setIsDrafting] = useState(false);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isLoading = invoicesLoading || trustLoading;

  const totalRevenue = invoices
    .filter((i: any) => i.status === "paid")
    .reduce((s: number, i: any) => s + i.total, 0);
  const totalOutstanding = invoices
    .filter((i: any) => i.status !== "paid" && i.status !== "cancelled")
    .reduce((s: number, i: any) => s + i.total, 0);
  const trustBalance = trustLedger.reduce(
    (sum: number, t: any) => sum + (t.type === "receipt" ? t.amount : -t.amount),
    0,
  );

  const casesWithUnbilledTime = cases.filter((c: any) =>
    timeEntries.some((t: any) => t.caseId === c._id && t.isBillable && !t.invoiceId),
  );

  const handleDraftInvoice = async () => {
    if (!selectedCaseId) return toast.error("Select a case");
    setIsDrafting(true);
    try {
      const selectedCase = cases.find((c: any) => c._id === selectedCaseId);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15);

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
      const client = clients.find((c: any) => c._id === invoice.clientId) || {
        fullName: "Unknown Client",
      };
      const caseData = cases.find((c: any) => c._id === invoice.caseId) || {};
      const entries = timeEntries.filter((t: any) => t.invoiceId === invoice._id);
      generateInvoicePDF(invoice, client, caseData, entries);
      toast.success("PDF generated successfully");
    } catch {
      toast.error("Failed to generate PDF");
    }
  };

  const handleStatus = async (invoice: any, status: "sent" | "paid" | "overdue" | "cancelled") => {
    setStatusBusy(invoice._id + status);
    try {
      await updateStatusMutation.mutateAsync({ id: invoice._id, status });
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
          .reduce((s: number, t: any) => s + (t.type === "receipt" ? t.amount : -t.amount), 0) +
        amount;
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

  return (
    <PortalPageShell
      portal="admin"
      loading={isLoading}
      loadingLabel="Loading finance workspace…"
      decorated
      showTodayDate
      eyebrow="Financial operations"
      titleKey="portal.finance.title"
      descriptionKey="portal.finance.description"
      icon={DollarSign}
      metrics={[
        {
          label: "Collected",
          value: formatNPR(totalRevenue),
          icon: TrendingUp,
          tone: DASHBOARD_METRIC_TONES.revenue,
          helperText: "Paid invoices",
        },
        {
          label: "Outstanding",
          value: formatNPR(totalOutstanding),
          icon: Receipt,
          tone: "danger",
          helperText: "Awaiting payment",
        },
        {
          label: "Trust escrow",
          value: formatNPR(trustBalance),
          icon: Wallet,
          tone: DASHBOARD_METRIC_TONES.balance,
          helperText: "Client trust balance",
        },
      ]}
    >
      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
        <DashboardSection
          className="min-w-0 lg:col-span-2"
          title="Invoices"
          icon={Receipt}
          actions={
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <DashboardButton size="sm">
                  <Plus className="size-4" aria-hidden /> New invoice
                </DashboardButton>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Draft invoice from time entries</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    Select a matter with unbilled time entries. The system will aggregate hours,
                    compute 13% VAT, and draft a tax invoice.
                  </p>
                  <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a matter…" />
                    </SelectTrigger>
                    <SelectContent>
                      {casesWithUnbilledTime.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No matters with unbilled time
                        </SelectItem>
                      ) : (
                        casesWithUnbilledTime.map((c: any) => (
                          <SelectItem key={c._id} value={c._id}>
                            {c.caseNumber} — {c.title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {selectedCaseId ? (
                    <div className="space-y-1 rounded-lg bg-dashboard-neutral-soft p-3 text-sm">
                      <p>
                        Unbilled entries:{" "}
                        {
                          timeEntries.filter(
                            (t: any) => t.caseId === selectedCaseId && t.isBillable && !t.invoiceId,
                          ).length
                        }
                      </p>
                    </div>
                  ) : null}
                  <div className="mt-4 flex justify-end gap-2">
                    <DashboardButton variant="outline" onClick={() => setIsModalOpen(false)}>
                      Cancel
                    </DashboardButton>
                    <DashboardButton
                      onClick={handleDraftInvoice}
                      disabled={!selectedCaseId || isDrafting}
                    >
                      {isDrafting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                      Draft invoice
                    </DashboardButton>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          }
        >
          {invoices.length === 0 ? (
            <EmptyState
              title="No invoices yet"
              description="Draft an invoice from unbilled time entries to get started."
              icon={Receipt}
            />
          ) : (
            <div className="space-y-3">
              {invoices.map((inv: any) => {
                const clientName =
                  clients.find((c: any) => c._id === inv.clientId)?.fullName || "Unknown client";
                const caseNum =
                  cases.find((c: any) => c._id === inv.caseId)?.caseNumber || "Matter";

                return (
                  <DashboardListRow key={inv._id}>
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <Receipt
                        className="mt-0.5 size-5 shrink-0 text-dashboard-neutral"
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {inv.invoiceNumber} — {clientName}
                        </p>
                        <p className="break-words text-xs text-muted-foreground">
                          {caseNum} · Issued <DualDateDisplay isoDate={inv.issuedDate} /> · Due{" "}
                          <DualDateDisplay isoDate={inv.dueDate} />
                        </p>
                        <p className="break-words font-mono text-xs text-muted-foreground">
                          Subtotal {formatNPR(inv.subtotal)} + VAT {formatNPR(inv.vatAmount)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pl-8 sm:justify-end sm:pl-0">
                      <div className="mr-auto text-left sm:mr-0 sm:text-right">
                        <p className="text-sm font-bold tabular-nums text-foreground">
                          {formatNPR(inv.total)}
                        </p>
                        <DashboardStatusLabel status={inv.status} className="text-[10px]" />
                      </div>
                      {inv.status === "draft" ? (
                        <DashboardButton
                          size="sm"
                          variant="outline"
                          disabled={!!statusBusy}
                          onClick={() => handleStatus(inv, "sent")}
                        >
                          Send
                        </DashboardButton>
                      ) : null}
                      {inv.status === "sent" || inv.status === "overdue" ? (
                        <DashboardButton
                          size="sm"
                          variant="outline"
                          disabled={!!statusBusy}
                          onClick={() => handleStatus(inv, "paid")}
                        >
                          Mark paid
                        </DashboardButton>
                      ) : null}
                      {inv.status !== "cancelled" && inv.status !== "paid" ? (
                        <DashboardButton
                          size="sm"
                          variant="ghost"
                          disabled={!!statusBusy}
                          onClick={() => handleStatus(inv, "cancelled")}
                        >
                          Cancel
                        </DashboardButton>
                      ) : null}
                      <DashboardButton
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownloadPDF(inv)}
                        title="Download PDF"
                      >
                        <Download className="size-4" aria-hidden />
                      </DashboardButton>
                    </div>
                  </DashboardListRow>
                );
              })}
            </div>
          )}
        </DashboardSection>

        <DashboardSection
          className="min-w-0"
          title="Trust ledger"
          description="All client trust transactions"
          icon={Wallet}
          actions={
            <DashboardButton size="sm" variant="outline" onClick={handleTrustReceipt}>
              + Receipt
            </DashboardButton>
          }
        >
          {trustLedger.length === 0 ? (
            <EmptyState
              title="No trust transactions"
              description="Record a retainer receipt to start the trust ledger."
              icon={Wallet}
            />
          ) : (
            <div className="max-h-[60vh] space-y-2 overflow-y-auto">
              {trustLedger.map((t: any) => {
                const clientName =
                  clients.find((c: any) => c._id === t.clientId)?.fullName || "Client";
                return (
                  <div
                    key={t._id}
                    className="min-w-0 rounded-lg border border-dashboard-border bg-dashboard-panel p-3 text-xs"
                  >
                    <div className="mb-1 flex min-w-0 items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 font-semibold text-foreground line-clamp-2">
                        {t.description}
                      </p>
                      <p
                        className={`shrink-0 font-bold tabular-nums ${t.type === "receipt" ? "text-dashboard-success" : "text-dashboard-danger"}`}
                      >
                        {t.type === "receipt" ? "+" : "-"}
                        {formatNPR(t.amount)}
                      </p>
                    </div>
                    <div className="flex min-w-0 justify-between gap-2 text-muted-foreground">
                      <span className="truncate">{clientName}</span>
                      <span className="shrink-0">
                        <DualDateDisplay isoDate={t.date} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DashboardSection>
      </div>
    </PortalPageShell>
  );
}
