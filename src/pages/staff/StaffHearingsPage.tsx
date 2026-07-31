import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { CalendarDays, Plus, X, Loader2, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { formatDualDate, gregorianToBs, formatBs } from "@/lib/nepali-calendar.ts";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Input } from "@/components/ui/input.tsx";
import { COURTS } from "@/lib/lex-constants.ts";
import { useI18n } from "@/lib/i18n-context.tsx";
import { getBSDate } from "@/lib/bs-calendar.ts";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  adjourned: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function StaffHearingsPage() {
  const { t, language } = useI18n();
  const hearings = useQuery(api.hearings.listHearings, {}) || [];
  const cases = useQuery(api.cases.listCases, {}) || [];
  const users = useQuery(api.users.listUsers, {}) || [];
  const pesiResult = useQuery(api.court.getPesi, {});
  const pesiList = Array.isArray(pesiResult)
    ? pesiResult
    : ((pesiResult as any)?.items || []);
  const pesiMessage =
    (!Array.isArray(pesiResult) && (pesiResult as any)?.message) ||
    "Automated Pesi sync is not connected. Enter hearings manually.";

  const createHearing = useMutation(api.hearings.createHearing);
  const updateHearing = useMutation(api.hearings.updateHearing);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // Scheduling Form State
  const [caseId, setCaseId] = useState("");
  const [court, setCourt] = useState(COURTS[0]);
  const [judge, setJudge] = useState("");
  const [dateGregorian, setDateGregorian] = useState("");
  const [dateBs, setDateBs] = useState("");
  const [time, setTime] = useState("10:00");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Updating Form State
  const [selectedHearingId, setSelectedHearingId] = useState("");
  const [outcome, setOutcome] = useState("");
  const [status, setStatus] = useState("completed");
  const [nextDateGregorian, setNextDateGregorian] = useState("");
  const [nextDateBs, setNextDateBs] = useState("");
  const [updateNotes, setUpdateNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Handle Gregorian date selection to auto-generate Bikram Sambat date
  const handleGregorianChange = (val: string) => {
    setDateGregorian(val);
    if (val) {
      try {
        const parts = val.split("-").map(Number);
        // Correct date offset issues by parsing as local timezone date
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        const bsDateObj = gregorianToBs(d);
        const formattedBs = formatBs(bsDateObj);
        setDateBs(formattedBs);
      } catch (e) {
        // ignore
      }
    }
  };

  const handleNextGregorianChange = (val: string) => {
    setNextDateGregorian(val);
    if (val) {
      try {
        const parts = val.split("-").map(Number);
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        const bsDateObj = gregorianToBs(d);
        const formattedBs = formatBs(bsDateObj);
        setNextDateBs(formattedBs);
      } catch (e) {
        // ignore
      }
    }
  };

  const handleScheduleHearing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId || !court || !dateGregorian || !dateBs) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setIsSubmitting(true);
    try {
      await createHearing({
        caseId: caseId as any,
        court,
        judge: judge || undefined,
        dateGregorian,
        dateBs,
        time: time || undefined,
        purpose: purpose || undefined,
        notes: notes || undefined,
      });
      toast.success("Hearing scheduled successfully!");
      setShowCreateModal(false);
      // Reset form
      setCaseId("");
      setCourt(COURTS[0]);
      setJudge("");
      setDateGregorian("");
      setDateBs("");
      setPurpose("");
      setNotes("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to schedule hearing.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateHearing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHearingId) return;
    setIsUpdating(true);
    try {
      await updateHearing({
        hearingId: selectedHearingId as any,
        status: status as any,
        outcome: outcome || undefined,
        nextDateGregorian: nextDateGregorian || undefined,
        nextDateBs: nextDateBs || undefined,
        notes: updateNotes || undefined,
      });
      toast.success("Hearing status updated!");
      setShowUpdateModal(false);
      // Reset
      setSelectedHearingId("");
      setOutcome("");
      setStatus("completed");
      setNextDateGregorian("");
      setNextDateBs("");
      setUpdateNotes("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update hearing.");
    } finally {
      setIsUpdating(false);
    }
  };

  const openUpdateModal = (hearing: any) => {
    setSelectedHearingId(hearing._id);
    setStatus(hearing.status || "completed");
    setOutcome(hearing.outcome || "");
    setUpdateNotes(hearing.notes || "");
    setShowUpdateModal(true);
  };

  const upcoming = hearings.filter((h: any) => h.status === "scheduled");
  const past = hearings.filter((h: any) => h.status !== "scheduled");

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">{t("hearings.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("hearings.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.message("Pesi sync unavailable", { description: pesiMessage })}
          >
            <CalendarDays className="w-4 h-4 mr-1" /> {t("hearings.fetch_pesi")}
          </Button>
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-1" /> {t("action.add")}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Upcoming Hearings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No upcoming hearings scheduled.</p>
          ) : (
            upcoming.map((h: any) => {
              const matchedCase = cases.find((c: any) => c._id === h.caseId);
              const lawyer = matchedCase ? users.find((u: any) => u._id === matchedCase.assignedLawyerId) : null;

              return (
                <div key={h._id} className="flex items-start justify-between p-4 rounded-lg border border-border hover:bg-secondary/30 transition-colors gap-3">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-accent/10 flex flex-col items-center justify-center text-accent flex-shrink-0 font-serif">
                      <span className="text-lg font-bold leading-none">{h.dateBs.split(" ")[0]}</span>
                      <span className="text-[10px] opacity-80 mt-0.5">{h.dateBs.split(" ")[1]}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground line-clamp-1">{matchedCase ? matchedCase.title : "Unknown Case"}</p>
                      <p className="text-xs text-muted-foreground font-mono">{matchedCase ? matchedCase.caseNumber : "N/A"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{h.court} &mdash; {h.time || "N/A"}</p>
                      {lawyer && <p className="text-xs text-muted-foreground">{t("hearings.assigned")}: {lawyer.name}</p>}
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground/70">
                        <CalendarDays className="w-3 h-3" />
                        <span>{formatDualDate(h.dateGregorian)} | {getBSDate(h.dateGregorian, language === 'ne')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={`text-xs capitalize ${STATUS_COLORS[h.status]}`}>{h.status}</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openUpdateModal(h)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Automated Cause List (Pesi)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pesiList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{pesiMessage}</p>
          ) : (
            pesiList.map((p: any) => {
              const matchedCase = cases.find((c: any) => c._id === p.caseId);
              return (
                <div key={p._id} className="flex items-start justify-between p-4 rounded-lg border border-border hover:bg-secondary/30 transition-colors gap-3">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-orange-500/10 flex flex-col items-center justify-center text-orange-600 flex-shrink-0 font-serif">
                      <span className="text-lg font-bold leading-none">{p.pesiDate.split(" ")[0]}</span>
                      <span className="text-[10px] opacity-80 mt-0.5">{p.pesiDate.split(" ")[1]}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground line-clamp-1">{matchedCase ? matchedCase.title : "Unknown Case"}</p>
                      <p className="text-xs font-mono text-muted-foreground mt-0.5">S.N: {p.serialNumber} | {p.courtName}</p>
                      <p className="text-xs text-muted-foreground">{p.judgeName}</p>
                      <p className="text-xs text-muted-foreground italic mt-0.5">{p.hearingType}</p>
                    </div>
                  </div>
                  <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 capitalize text-xs">
                    Pesi {p.status}
                  </Badge>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Past / Inactive Hearings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {past.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No past hearings recorded.</p>
          ) : (
            past.map((h: any) => {
              const matchedCase = cases.find((c: any) => c._id === h.caseId);
              return (
                <div key={h._id} className="flex items-center justify-between p-3 rounded-lg border border-border opacity-75 hover:opacity-100 transition-opacity">
                  <div>
                    <p className="text-sm font-medium text-foreground line-clamp-1">{matchedCase ? matchedCase.title : "Unknown Case"}</p>
                    <p className="text-xs text-muted-foreground">
                      {h.dateBs} &mdash; {h.court} {h.outcome ? `| Outcome: ${h.outcome}` : ""}
                    </p>
                  </div>
                  <Badge className={`text-xs capitalize ${STATUS_COLORS[h.status] || "bg-gray-100 text-gray-800"}`}>
                    {h.status}
                  </Badge>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Schedule Hearing Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in-30">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-auto flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif font-bold text-lg text-primary">Schedule Case Hearing</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleHearing} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Select Case <span className="text-destructive">*</span></label>
                <select
                  required
                  className="w-full h-9 rounded-md border border-input bg-input text-foreground px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden"
                  value={caseId}
                  onChange={(e) => {
                    setCaseId(e.target.value);
                    const selected = cases.find((c: any) => c._id === e.target.value);
                    if (selected && selected.court) setCourt(selected.court);
                  }}
                >
                  <option value="">Choose Case</option>
                  {cases
                    .filter((c: any) => c.status === "active")
                    .map((c: any) => (
                      <option key={c._id} value={c._id}>
                        [{c.caseNumber}] {c.title}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Court Room <span className="text-destructive">*</span></label>
                <select
                  required
                  className="w-full h-9 rounded-md border border-input bg-input text-foreground px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden"
                  value={court}
                  onChange={(e) => setCourt(e.target.value)}
                >
                  {COURTS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Gregorian Date <span className="text-destructive">*</span></label>
                  <Input
                    required
                    type="date"
                    value={dateGregorian}
                    onChange={(e) => handleGregorianChange(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Nepali Date (Bikram Sambat)</label>
                  <Input
                    readOnly
                    placeholder="Auto-calculated"
                    className="bg-secondary/40 font-semibold"
                    value={dateBs}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Time</label>
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Judge Name</label>
                  <Input
                    placeholder="Hon. Justice ..."
                    value={judge}
                    onChange={(e) => setJudge(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Hearing Purpose</label>
                <Input
                  placeholder="First hearing / Written statement / Bail debate"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Preparatory Notes</label>
                <textarea
                  className="w-full rounded-md border border-input bg-input text-foreground px-3 py-2 text-xs shadow-xs focus-visible:outline-hidden min-h-[60px]"
                  placeholder="Items to prepare, files required..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Schedule"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Hearing Status Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in-30">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-auto flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif font-bold text-lg text-primary">Update Hearing Results</h3>
              <button onClick={() => setShowUpdateModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateHearing} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Hearing Status</label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-input text-foreground px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="completed">Completed</option>
                  <option value="adjourned">Adjourned (Postponed)</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Hearing Outcome / Verdict Summary</label>
                <textarea
                  required={status === "completed"}
                  className="w-full rounded-md border border-input bg-input text-foreground px-3 py-2 text-xs shadow-xs focus-visible:outline-hidden min-h-[60px]"
                  placeholder="Case outcome, court directions, verbal orders..."
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                />
              </div>

              {status === "adjourned" && (
                <div className="border-t border-border pt-3 space-y-3">
                  <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wide">Next Adjourned Hearing Date</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">Gregorian Date</label>
                      <Input
                        type="date"
                        value={nextDateGregorian}
                        onChange={(e) => handleNextGregorianChange(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">Nepali Date</label>
                      <Input
                        readOnly
                        placeholder="Auto-calculated"
                        className="bg-secondary/40 font-semibold"
                        value={nextDateBs}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Notes</label>
                <textarea
                  className="w-full rounded-md border border-input bg-input text-foreground px-3 py-2 text-xs shadow-xs focus-visible:outline-hidden min-h-[50px]"
                  placeholder="Add details, next prep steps..."
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowUpdateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isUpdating}>
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Outcome"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
