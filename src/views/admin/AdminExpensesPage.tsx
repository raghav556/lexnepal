import { useState, useEffect } from "react";
import { usePagination } from "@/hooks/use-pagination.ts";
import { Pagination } from "@/components/ui/pagination.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  Receipt,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Trash2,
  Loader2,
  Calendar,
  FolderOpen,
  CreditCard,
  Wallet,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { useStaffDirectory } from "@/client/queries/identity";
import { useCases } from "@/client/queries/cases";
import { useExpenses, useExpenseStats, useExpenseCommands } from "@/client/queries/financial";
import {
  DashboardButton,
  DashboardSection,
  DashboardStatusLabel,
  EmptyState,
  PortalPageShell,
} from "@/components/dashboard";
import { DASHBOARD_METRIC_TONES, DASHBOARD_TONE_PANEL_CLASSES } from "@/lib/dashboard-semantics";

const CATEGORIES: Record<string, string> = {
  office_rent: "Office Rent",
  utilities: "Utilities & Internet",
  court_fees: "Court Fees (Disbursements)",
  courier: "Courier & Postage",
  printing: "Printing & Photocopying",
  travel: "Travel & Transport",
  software: "Software & IT",
  supplies: "Office Supplies",
  other: "Other Expenses",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NP", { style: "currency", currency: "NPR" }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-NP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminExpensesPage() {
  const currentUser = useCurrentUser();
  const currentUserId = currentUser?._id || "u1";

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: expenses = [], isLoading: expensesLoading } = useExpenses({
    category: categoryFilter,
    status: statusFilter,
  });
  const { data: stats, isLoading: statsLoading } = useExpenseStats();
  const cases = useCases({}) || [];
  const users = useStaffDirectory() || [];

  const {
    createExpense: createExpenseMutation,
    approveExpense: approveExpenseMutation,
    deleteExpense: deleteExpenseMutation,
  } = useExpenseCommands();

  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("office_rent");
  const [caseId, setCaseId] = useState("none");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const isLoading = expensesLoading || statsLoading;

  const handleCreate = async () => {
    if (!desc || !amount) {
      toast.error("Description and Amount are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      await createExpenseMutation.mutateAsync({
        description: desc,
        amount: parseFloat(amount),
        category,
        caseId: caseId === "none" ? undefined : caseId,
        date,
        submittedBy: currentUserId,
      });
      toast.success("Expense submitted successfully");
      setShowModal(false);
      setDesc("");
      setAmount("");
      setCaseId("none");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await approveExpenseMutation.mutateAsync({ id, status, approvedBy: currentUserId } as any);
      toast.success(`Expense ${status}`);
    } catch (err: any) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense record?")) return;
    try {
      await deleteExpenseMutation.mutateAsync({ id });
      toast.success("Expense deleted");
    } catch (err: any) {
      toast.error("Failed to delete expense");
    }
  };

  const filtered = expenses.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.description.toLowerCase().includes(q) || e.amount.toString().includes(q);
  });

  const { paginatedItems, currentPage, totalPages, goToPage, nextPage, prevPage, resetPagination } =
    usePagination(filtered, 10);

  useEffect(() => {
    resetPagination();
  }, [search, categoryFilter, statusFilter]);

  const getUserName = (id: string) => users.find((u: any) => u._id === id)?.name || "Unknown";
  const getCaseName = (id: string) => cases.find((c: any) => c._id === id)?.title || id;

  return (
    <PortalPageShell
      portal="admin"
      loading={isLoading}
      loadingLabel="Loading expenses…"
      eyebrow="Financial operations"
      title="Expense tracker"
      description="Manage office expenses, court disbursements, and track hard costs."
      icon={Receipt}
      actions={
        <DashboardButton
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto shrink-0 gap-2"
        >
          <Plus className="w-4 h-4" /> Add Expense
        </DashboardButton>
      }
      metrics={[
        {
          label: "Total expenses",
          value: formatCurrency(stats?.total ?? 0),
          icon: Wallet,
          tone: DASHBOARD_METRIC_TONES.balance,
        },
        {
          label: "Approved & paid",
          value: formatCurrency(stats?.approved ?? 0),
          icon: CheckCircle2,
          tone: "success",
        },
        {
          label: "Pending approval",
          value: formatCurrency(stats?.pending ?? 0),
          icon: Clock,
          tone: "warning",
          helperText:
            (stats?.pendingCount ?? 0) > 0 ? `${stats?.pendingCount} awaiting review` : undefined,
        },
        {
          label: "Case-linked costs",
          value: formatCurrency(stats?.caseLinked ?? 0),
          icon: FolderOpen,
          tone: DASHBOARD_METRIC_TONES.cases,
        },
      ]}
    >
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORIES).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DashboardSection title="Expense records" icon={Receipt}>
        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-border -mx-1">
          {paginatedItems.length === 0 ? (
            <EmptyState
              title="No expenses found"
              description="No expenses match your current filters."
              icon={Receipt}
            />
          ) : (
            paginatedItems.map((exp: any) => (
              <div key={exp._id} className="p-3 space-y-2 min-w-0">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground text-sm break-words">
                      {exp.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(exp.date)} · By {getUserName(exp.submittedBy)}
                    </p>
                  </div>
                  <p className="text-sm font-bold tabular-nums shrink-0 text-foreground">
                    {formatCurrency(exp.amount)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    {CATEGORIES[exp.category] || exp.category}
                  </Badge>
                  {exp.caseId && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] gap-1 font-normal max-w-full truncate ${DASHBOARD_TONE_PANEL_CLASSES.information}`}
                    >
                      <FolderOpen className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{getCaseName(exp.caseId)}</span>
                    </Badge>
                  )}
                  <DashboardStatusLabel status={exp.status} className="text-[10px]" />
                </div>
                <div className="flex items-center justify-end gap-1 pt-1">
                  {exp.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleStatusUpdate(exp._id, "approved")}
                        className="p-2 text-dashboard-success hover:bg-dashboard-success-soft rounded-md"
                        title="Approve"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(exp._id, "rejected")}
                        className="p-2 text-dashboard-danger hover:bg-dashboard-danger-soft rounded-md"
                        title="Reject"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(exp._id)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"
                    title="Delete Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop / tablet table */}
        <div className="hidden md:block overflow-x-auto -mx-1">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase border-b border-border">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Category / Link</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8">
                    <EmptyState
                      title="No expenses found"
                      description="No expenses match your current filters."
                      icon={Receipt}
                    />
                  </td>
                </tr>
              ) : (
                paginatedItems.map((exp: any) => (
                  <tr key={exp._id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {formatDate(exp.date)}
                    </td>
                    <td className="px-4 py-3 min-w-0">
                      <p className="font-medium text-foreground">{exp.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        By {getUserName(exp.submittedBy)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          {CATEGORIES[exp.category] || exp.category}
                        </Badge>
                        {exp.caseId && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] gap-1 font-normal ${DASHBOARD_TONE_PANEL_CLASSES.information}`}
                          >
                            <FolderOpen className="w-2.5 h-2.5" /> {getCaseName(exp.caseId)}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground tabular-nums whitespace-nowrap">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <DashboardStatusLabel status={exp.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        {exp.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(exp._id, "approved")}
                              className="p-1.5 text-dashboard-success hover:bg-dashboard-success-soft rounded-md"
                              title="Approve"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(exp._id, "rejected")}
                              className="p-1.5 text-dashboard-danger hover:bg-dashboard-danger-soft rounded-md"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(exp._id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          onNextPage={nextPage}
          onPrevPage={prevPage}
        />
      </DashboardSection>

      {/* Create Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Record New Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Description <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Supreme Court Filing Fee"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Amount (NPR) <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    Rs.
                  </span>
                  <Input
                    type="number"
                    className="pl-9"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Date <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="date"
                    className="pl-9"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Category <span className="text-destructive">*</span>
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Link to Case (Disbursement)</span>
                <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
              </label>
              <Select value={caseId} onValueChange={setCaseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Case (Optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Case Link (General Office Expense)</SelectItem>
                  {cases.map((c: any) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.caseNumber} — {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {caseId !== "none" && (
                <p className="text-[10px] text-dashboard-information mt-1">
                  This cost will be tracked as a hard cost disbursement for this case.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <DashboardButton variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </DashboardButton>
            <DashboardButton onClick={handleCreate} disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4" />
              )}
              Submit Expense
            </DashboardButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalPageShell>
  );
}
