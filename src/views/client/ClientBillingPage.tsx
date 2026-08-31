"use client";

import { useState } from "react";
import { Receipt, Download, Loader2, ShieldAlert, CreditCard, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { formatNPR } from "@/lib/lex-constants.ts";
import { useMyClient } from "@/client/queries/clients";
import { useCases } from "@/client/queries/cases";
import { useSystemSettings } from "@/client/queries/identity";
import { generateInvoicePDF } from "@/lib/pdf-generator.ts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog.tsx";
import { usePagination } from "@/hooks/use-pagination.ts";
import { Pagination } from "@/components/ui/pagination.tsx";
import {
  fetchInvoiceDetail,
  useInvoices,
  useInvoiceCommands,
  useMyPayments,
  useTrustTransactions,
} from "@/client/queries/financial";
import {
  DashboardButton,
  DashboardListRow,
  DashboardListSkeleton,
  DashboardSection,
  DashboardStatusLabel,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeaderCell,
  DashboardTableRow,
  EmptyState,
  PortalPageShell,
} from "@/components/dashboard";
import { DASHBOARD_METRIC_TONES } from "@/lib/dashboard-semantics";

const IS_SANDBOX =
  process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_PAYMENTS_SANDBOX === "true";

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

  const {
    paginatedItems: paginatedInvoices,
    currentPage: invCurrentPage,
    totalPages: invTotalPages,
    goToPage: invGoToPage,
    nextPage: invNextPage,
    prevPage: invPrevPage,
  } = usePagination({ items: invoices, itemsPerPage: 6 });

  if (client === undefined) {
    return (
      <PortalPageShell
        portal="client"
        loading
        loadingLabel="Loading your billing portal…"
        title="Billing & Invoices"
      >
        <div />
      </PortalPageShell>
    );
  }

  if (client === null) {
    return (
      <PortalPageShell
        portal="client"
        decorated
        showTodayDate
        eyebrow="Financial services"
        title="Billing & Invoices"
        description="Review your invoices and trust account ledger."
        icon={Receipt}
      >
        <EmptyState
          title="No client profile linked"
          description="No client profile is linked to your account. Contact the firm to activate billing."
          icon={Receipt}
        />
      </PortalPageShell>
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

  const activePayments: string[] = (
    systemSettings as typeof systemSettings & { integrations?: { activePayments?: string[] } }
  )?.integrations?.activePayments || ["bank_transfer", "esewa", "khalti"];

  const handleDownloadPDF = async (invoice: any) => {
    try {
      const detail = await fetchInvoiceDetail(invoice._id);
      const caseData =
        cases.find((c: any) => c._id === detail.caseId || c._id === invoice.caseId) || {};
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

  const metrics = [
    {
      label: "Outstanding Balance",
      value: formatNPR(outstanding),
      icon: Receipt,
      tone: DASHBOARD_METRIC_TONES.balance,
      helperText: "Due on open invoices",
    },
    {
      label: "Paid Invoices",
      value: formatNPR(paid),
      icon: CreditCard,
      tone: "success" as const,
      helperText: "Lifetime payments",
    },
    {
      label: "Trust Account Balance",
      value: formatNPR(trustBalance),
      icon: ShieldCheck,
      tone: "primary" as const,
      helperText: "Escrow funds on hold",
    },
    {
      label: "Total Invoices",
      value: String(invoices.length),
      tone: "neutral" as const,
      helperText: "Issued tax bills",
    },
  ];

  return (
    <PortalPageShell
      portal="client"
      decorated
      showTodayDate
      eyebrow="Financial & Ledger"
      title="Billing & Escrow"
      description={`Manage your invoices, payments, and trust ledger balances.${IS_SANDBOX ? " Gateway buttons run in sandbox confirmation mode." : ""}`}
      icon={Receipt}
      metrics={metrics}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DashboardSection
          title="Invoices"
          description={`Showing ${invoices.length} issued bill${invoices.length === 1 ? "" : "s"}`}
          icon={Receipt}
          className="lg:col-span-2"
        >
          {invoices === undefined ? (
            <DashboardListSkeleton rows={4} />
          ) : invoices.length === 0 ? (
            <EmptyState
              title="No invoices found"
              description="Your invoices and fee statements will appear here."
              icon={Receipt}
            />
          ) : (
            <div className="space-y-4">
              <DashboardTable>
                <DashboardTableHead>
                  <DashboardTableRow>
                    <DashboardTableHeaderCell>Invoice #</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell>Matter / Due Date</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell>Amount</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell>Status</DashboardTableHeaderCell>
                    <DashboardTableHeaderCell className="text-right">
                      Actions
                    </DashboardTableHeaderCell>
                  </DashboardTableRow>
                </DashboardTableHead>
                <DashboardTableBody>
                  {paginatedInvoices.map((inv: any) => {
                    const matchedCase = cases.find((c: any) => c._id === inv.caseId);
                    const canPay = inv.status === "sent" || inv.status === "overdue";
                    return (
                      <DashboardTableRow key={inv._id} striped>
                        <DashboardTableCell className="font-mono text-xs font-semibold text-foreground">
                          {inv.invoiceNumber}
                        </DashboardTableCell>
                        <DashboardTableCell>
                          <p className="font-semibold text-foreground text-xs truncate max-w-[200px]">
                            {matchedCase ? matchedCase.title : "General Retainer"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Due: {inv.dueDate || "Upon Receipt"}
                          </p>
                        </DashboardTableCell>
                        <DashboardTableCell className="font-bold text-foreground text-xs tabular-nums">
                          {formatNPR(inv.total)}
                        </DashboardTableCell>
                        <DashboardTableCell>
                          <DashboardStatusLabel
                            status={inv.status}
                            className="text-[10px] uppercase"
                          />
                        </DashboardTableCell>
                        <DashboardTableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {canPay ? (
                              <DashboardButton
                                size="sm"
                                className="text-xs h-7 px-2.5"
                                onClick={() => {
                                  setSelectedInvoice(inv);
                                  setShowBankInstructions(false);
                                  setPaymentModalOpen(true);
                                }}
                              >
                                Pay
                              </DashboardButton>
                            ) : null}
                            <DashboardButton
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => handleDownloadPDF(inv)}
                              title="Download Tax Invoice PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </DashboardButton>
                          </div>
                        </DashboardTableCell>
                      </DashboardTableRow>
                    );
                  })}
                </DashboardTableBody>
              </DashboardTable>
              <Pagination
                currentPage={invCurrentPage}
                totalPages={invTotalPages}
                onPageChange={invGoToPage}
                onNextPage={invNextPage}
                onPrevPage={invPrevPage}
              />
            </div>
          )}
        </DashboardSection>

        <div className="space-y-6">
          <DashboardSection
            title="Trust Escrow Ledger"
            description="Client funds held in trust"
            icon={ShieldCheck}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-dashboard-secondary p-3 rounded-lg border border-dashed text-xs text-dashboard-secondary-foreground">
                <ShieldAlert className="w-4 h-4 text-dashboard-accent shrink-0" />
                <span>Escrow accounts are audited under Nepal Bar Council regulations.</span>
              </div>
              {trustTransactions === undefined ? (
                <DashboardListSkeleton rows={3} />
              ) : trustTransactions.length === 0 ? (
                <EmptyState
                  title="No escrow transactions"
                  description="No escrow trust transactions recorded."
                  icon={ShieldCheck}
                />
              ) : (
                <div className="space-y-2">
                  {trustTransactions.map((tx: any) => (
                    <DashboardListRow key={tx._id} className="p-3 text-xs space-y-1">
                      <div className="flex justify-between gap-2 w-full">
                        <span className="font-medium break-words">{tx.description}</span>
                        <span
                          className={`font-semibold ${
                            tx.type === "receipt"
                              ? "text-dashboard-success"
                              : "text-dashboard-danger"
                          }`}
                        >
                          {tx.type === "receipt" ? "+" : "-"}
                          {formatNPR(tx.amount)}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground w-full">{tx.date}</p>
                    </DashboardListRow>
                  ))}
                </div>
              )}
            </div>
          </DashboardSection>

          <DashboardSection
            title="Payment History"
            description="Recent payment confirmations"
            icon={CreditCard}
          >
            {payments === undefined ? (
              <DashboardListSkeleton rows={3} />
            ) : payments.length === 0 ? (
              <EmptyState
                title="No payments recorded"
                description="Completed payments will be recorded here."
                icon={CreditCard}
              />
            ) : (
              <div className="space-y-2">
                {payments.slice(0, 8).map((p: any) => (
                  <DashboardListRow key={p._id || p.id} className="p-3 text-xs space-y-1">
                    <div className="flex justify-between gap-2 items-baseline w-full">
                      <span className="font-medium capitalize">{p.gateway || "payment"}</span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatNPR(p.amount)}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed w-full">
                      <span className="capitalize">{p.status || "recorded"}</span>
                      {p.referenceNumber ? ` · Ref ${p.referenceNumber}` : ""}
                      {p.paidAt || p.createdAt
                        ? ` · ${new Date(p.paidAt || p.createdAt).toLocaleDateString()}`
                        : ""}
                    </p>
                  </DashboardListRow>
                ))}
              </div>
            )}
          </DashboardSection>
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
              <div className="rounded-lg border bg-dashboard-neutral-soft p-3 text-xs space-y-1">
                <p>Bank: Nepal Bank Ltd.</p>
                <p>Account name: Srimar Law Associates</p>
                <p>Account number: 0123456789012345</p>
                <p>Reference: {selectedInvoice?.invoiceNumber} (include on the transfer memo)</p>
              </div>
              <p className="text-xs text-muted-foreground">
                After transferring, the firm will mark the invoice paid once funds clear. You can
                keep the PDF as your receipt request.
              </p>
              <DashboardButton
                variant="outline"
                size="sm"
                onClick={() => setShowBankInstructions(false)}
              >
                Back to payment methods
              </DashboardButton>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 pt-2">
              {(["esewa", "khalti", "bank_transfer"] as const)
                .filter((m) => activePayments.includes(m) || m === "bank_transfer")
                .map((method) => (
                  <DashboardButton
                    key={method}
                    disabled={isProcessing}
                    onClick={() => handleProcessPayment(method)}
                    className="justify-start capitalize"
                    variant={method === "bank_transfer" ? "outline" : "primary"}
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {method === "bank_transfer"
                      ? "Pay with bank transfer"
                      : IS_SANDBOX
                        ? `Sandbox pay with ${method}`
                        : `Pay with ${method}`}
                  </DashboardButton>
                ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PortalPageShell>
  );
}
