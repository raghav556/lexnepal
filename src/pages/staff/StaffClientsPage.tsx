import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Search, Plus, User, Building2, X, Loader2, Check, Clock as ClockIcon } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";

const KYC_COLORS: Record<string, string> = {
  verified: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  submitted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  pending: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function StaffClientsPage() {
  const clients = useQuery(api.clients.listClients, {}) || [];
  const cases = useQuery(api.cases.listCases, {}) || [];
  const createClient = useMutation(api.clients.createClient);
  const updateClient = useMutation(api.clients.updateClient);

  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [type, setType] = useState<"individual" | "corporate">("individual");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      // Reset form
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

  const handleToggleKyc = async (clientId: any, currentKyc: string) => {
    const kycOrder: Record<string, string> = {
      pending: "submitted",
      submitted: "verified",
      verified: "pending",
    };
    const nextKyc = kycOrder[currentKyc] || "pending";
    try {
      await updateClient({
        clientId,
        kycStatus: nextKyc as any,
      });
      toast.success(`KYC status updated to ${nextKyc}!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update KYC status.");
    }
  };

  // Filter clients based on search
  const filteredClients = clients.filter((c: any) => {
    const queryStr = search.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(queryStr) ||
      (c.email && c.email.toLowerCase().includes(queryStr)) ||
      (c.phone && c.phone.toLowerCase().includes(queryStr)) ||
      (c.address && c.address.toLowerCase().includes(queryStr))
    );
  });

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Clients</h1>
        <Button size="sm" onClick={() => setShowCreateModal(true)}>
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
            No clients found. Click "New Client" to add a new record.
          </div>
        ) : (
          filteredClients.map((c: any) => {
            const clientCases = cases.filter((caseObj: any) => caseObj.clientId === c._id && caseObj.status === "active");
            return (
              <Card key={c._id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                    {c.type === "corporate" ? <Building2 className="w-5 h-5 text-accent" /> : <User className="w-5 h-5 text-accent" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-foreground truncate">{c.fullName}</p>
                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                        {c.type === "corporate" ? "Corporate" : "Individual"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{c.email || "No email"}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.phone || "No phone"}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <button
                        onClick={() => handleToggleKyc(c._id, c.kycStatus)}
                        className={`text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full flex items-center gap-1 border transition-colors cursor-pointer ${
                          c.kycStatus === "verified" ? "bg-green-500/10 text-green-700 border-green-500/20" :
                          c.kycStatus === "submitted" ? "bg-yellow-500/10 text-yellow-700 border-yellow-500/20" :
                          "bg-gray-500/10 text-gray-700 border-gray-500/20"
                        }`}
                        title="Click to toggle KYC status"
                      >
                        {c.kycStatus === "verified" && <Check className="w-2.5 h-2.5" />}
                        {c.kycStatus === "submitted" && <ClockIcon className="w-2.5 h-2.5" />}
                        KYC: {c.kycStatus}
                      </button>
                      <span className="text-xs text-muted-foreground">
                        {clientCases.length} active case{clientCases.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Client Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in-30">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-auto flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif font-bold text-lg text-primary">Add New Client</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Client Type <span className="text-destructive">*</span></label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setType("individual")}
                    className={`flex-1 h-9 rounded-md border text-xs font-semibold cursor-pointer ${
                      type === "individual" ? "bg-primary text-primary-foreground border-primary" : "bg-transparent border-input hover:bg-secondary/50"
                    }`}
                  >
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("corporate")}
                    className={`flex-1 h-9 rounded-md border text-xs font-semibold cursor-pointer ${
                      type === "corporate" ? "bg-primary text-primary-foreground border-primary" : "bg-transparent border-input hover:bg-secondary/50"
                    }`}
                  >
                    Corporate
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  {type === "corporate" ? "Authorized Person's Full Name" : "Full Name"} <span className="text-destructive">*</span>
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
                    <label className="text-xs font-medium text-foreground">Company Registration Number</label>
                    <Input
                      placeholder="REG-1092-2081"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
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
                  placeholder="Thamel, Kathmandu"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Internal Notes</label>
                <textarea
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs focus-visible:outline-hidden min-h-[60px]"
                  placeholder="Special instructions, KYC remarks, etc..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowCreateModal(false)}>
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
