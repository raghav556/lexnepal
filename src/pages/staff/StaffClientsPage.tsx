import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Search,
  Plus,
  User,
  Building2,
  X,
  Loader2,
  Check,
  Clock as ClockIcon,
  XCircle,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { cn } from "@/lib/utils.ts";

const KYC_BADGE: Record<string, string> = {
  verified: "bg-green-500/10 text-green-700 border-green-500/20",
  submitted: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  pending: "bg-gray-500/10 text-gray-700 border-gray-500/20",
  rejected: "bg-red-500/10 text-red-700 border-red-500/20",
};

export default function StaffClientsPage() {
  const clients = useQuery(api.clients.listClients, {}) || [];
  const cases = useQuery(api.cases.listCases, {}) || [];
  const createClient = useMutation(api.clients.createClient);
  const reviewKyc = useMutation(api.clients.reviewKyc);

  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [reviewClientId, setReviewClientId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  const [fullName, setFullName] = useState("");
  const [type, setType] = useState<"individual" | "corporate">("individual");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const kycFiles = useQuery(
    api.clients.getClientKycFileUrls,
    reviewClientId ? { clientId: reviewClientId as any } : "skip",
  );

  const reviewClient = clients.find((c: any) => c._id === reviewClientId);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName) {
      toast.error("Please enter a client name.");
      return;
    }
    setIsSubmitting(true);
    try {
      await createClient({
        fullName,
        type,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
        companyName: type === "corporate" ? companyName || undefined : undefined,
        registrationNumber: type === "corporate" ? registrationNumber || undefined : undefined,
        notes: notes || undefined,
      });
      toast.success("Client added successfully!");
      setShowCreateModal(false);
      setFullName("");
      setType("individual");
      setEmail("");
      setPhone("");
      setAddress("");
      setCompanyName("");
      setRegistrationNumber("");
      setNotes("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create client.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReview = async (decision: "verified" | "rejected") => {
    if (!reviewClientId) return;
    if (decision === "rejected" && !rejectReason.trim()) {
      toast.error("Enter a rejection reason.");
      return;
    }
    setIsReviewing(true);
    try {
      await reviewKyc({
        clientId: reviewClientId as any,
        decision,
        rejectionReason: decision === "rejected" ? rejectReason.trim() : undefined,
      });
      toast.success(decision === "verified" ? "KYC verified." : "KYC rejected; client notified.");
      setReviewClientId(null);
      setRejectReason("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to review KYC.");
    } finally {
      setIsReviewing(false);
    }
  };

  const filteredClients = clients.filter((c: any) => {
    const queryStr = search.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(queryStr) ||
      (c.email && c.email.toLowerCase().includes(queryStr)) ||
      (c.phone && c.phone.toLowerCase().includes(queryStr)) ||
      (c.address && c.address.toLowerCase().includes(queryStr))
    );
  });

  const submittedCount = clients.filter((c: any) => c.kycStatus === "submitted").length;

  return (
    <div className="p-4 sm:p-6 space-y-4 min-w-0 w-full overflow-x-clip">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Clients</h1>
          {submittedCount > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              {submittedCount} KYC package{submittedCount !== 1 ? "s" : ""} awaiting review
            </p>
          )}
        </div>
        <Button size="sm" onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-1" /> New Client
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by client name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredClients.length === 0 ? (
          <div className="col-span-full py-12 text-center border border-dashed rounded-lg bg-card text-muted-foreground text-sm">
            No clients found. Click &quot;New Client&quot; to add a new record.
          </div>
        ) : (
          filteredClients.map((c: any) => {
            const clientCases = cases.filter(
              (caseObj: any) => caseObj.clientId === c._id && caseObj.status === "active",
            );
            return (
              <Card key={c._id} className="hover:shadow-sm transition-shadow py-0 gap-0">
                <CardContent className="p-4 flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    {c.type === "corporate" ? (
                      <Building2 className="w-5 h-5 text-accent" />
                    ) : (
                      <User className="w-5 h-5 text-accent" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-foreground truncate">{c.fullName}</p>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {c.type === "corporate" ? "Corporate" : "Individual"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{c.email || "No email"}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.phone || "No phone"}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span
                        className={cn(
                          "text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full flex items-center gap-1 border",
                          KYC_BADGE[c.kycStatus] || KYC_BADGE.pending,
                        )}
                      >
                        {c.kycStatus === "verified" && <Check className="w-2.5 h-2.5" />}
                        {c.kycStatus === "submitted" && <ClockIcon className="w-2.5 h-2.5" />}
                        {c.kycStatus === "rejected" && <XCircle className="w-2.5 h-2.5" />}
                        KYC: {c.kycStatus}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {clientCases.length} active case{clientCases.length !== 1 ? "s" : ""}
                      </span>
                      {(c.kycStatus === "submitted" ||
                        c.kycStatus === "verified" ||
                        c.kycStatus === "rejected") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            setRejectReason("");
                            setReviewClientId(c._id);
                          }}
                        >
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          {c.kycStatus === "submitted" ? "Review KYC" : "View KYC"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* KYC Review Modal */}
      {reviewClientId && reviewClient && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-card border border-border rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-auto flex flex-col">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sticky top-0 bg-card z-10">
              <div className="min-w-0">
                <h3 className="font-serif font-bold text-lg text-primary truncate">
                  KYC — {reviewClient.fullName}
                </h3>
                <p className="text-xs text-muted-foreground capitalize">
                  Status: {reviewClient.kycStatus}
                </p>
              </div>
              <button
                onClick={() => setReviewClientId(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 gap-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Address:</span>{" "}
                  <span className="break-words">{reviewClient.address || "—"}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">ID number:</span>{" "}
                  <span className="break-words">{(reviewClient as any).kycIdNumber || "—"}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Consent:</span>{" "}
                  {(reviewClient as any).kycConsentVersion
                    ? `${(reviewClient as any).kycConsentVersion} at ${
                        (reviewClient as any).kycConsentAt
                          ? new Date((reviewClient as any).kycConsentAt).toLocaleString()
                          : "—"
                      }`
                    : "—"}
                </p>
                {(reviewClient as any).kycRejectionReason && (
                  <p className="text-destructive break-words">
                    Last rejection: {(reviewClient as any).kycRejectionReason}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Documents</h4>
                {kycFiles === undefined ? (
                  <p className="text-xs text-muted-foreground">Loading files…</p>
                ) : kycFiles.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No KYC files on record.</p>
                ) : (
                  <ul className="space-y-2">
                    {kycFiles.map((f: any) => (
                      <li
                        key={f.storageId}
                        className="flex items-center justify-between gap-2 border rounded-lg p-3 text-sm min-w-0"
                      >
                        <div className="min-w-0">
                          <p className="font-medium capitalize truncate">
                            {String(f.docType).replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{f.fileName}</p>
                        </div>
                        {f.url ? (
                          <a
                            href={f.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-accent shrink-0 hover:underline"
                          >
                            Open <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground shrink-0">No URL</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {reviewClient.kycStatus === "submitted" && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Rejection reason (required to reject)</label>
                    <Textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="e.g. ID photo is blurry — please re-upload a clear scan"
                      className="min-h-[80px] text-sm"
                    />
                  </div>
                  <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                    <Button
                      variant="outline"
                      disabled={isReviewing}
                      onClick={() => handleReview("rejected")}
                      className="border-destructive/40 text-destructive"
                    >
                      {isReviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject"}
                    </Button>
                    <Button
                      disabled={isReviewing}
                      onClick={() => handleReview("verified")}
                      className="bg-accent hover:bg-accent/90"
                    >
                      {isReviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve & verify"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Client Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-auto flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif font-bold text-lg text-primary">Add New Client</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Client Type <span className="text-destructive">*</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setType("individual")}
                    className={`flex-1 h-9 rounded-md border text-xs font-semibold cursor-pointer ${
                      type === "individual"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-input text-foreground border-input"
                    }`}
                  >
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("corporate")}
                    className={`flex-1 h-9 rounded-md border text-xs font-semibold cursor-pointer ${
                      type === "corporate"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-input text-foreground border-input"
                    }`}
                  >
                    Corporate
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  {type === "corporate" ? "Authorized Person's Full Name" : "Full Name"}{" "}
                  <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  placeholder="Ram Prasad Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              {type === "corporate" && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Company Name</label>
                    <Input
                      placeholder="TechVenture Pvt. Ltd."
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">
                      Company Registration Number
                    </label>
                    <Input
                      placeholder="REG-1092-2081"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Email Address</label>
                  <Input
                    type="email"
                    placeholder="ram@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Phone Number</label>
                  <Input
                    placeholder="+977 98510XXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Physical Address</label>
                <Input
                  placeholder="Thapathali, Kathmandu"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Internal Notes</label>
                <textarea
                  className="w-full rounded-md border border-input bg-input text-foreground px-3 py-2 text-xs shadow-xs focus-visible:outline-hidden min-h-[60px]"
                  placeholder="Special instructions, KYC remarks, etc..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Client"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
