import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Clock, Play, Square, Plus, Trash2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatNPR } from "@/lib/lex-constants.ts";
import { useTimeEntries, useTimeEntryCommands } from "@/client/queries/financial";
import { useCases } from "@/client/queries/cases";
import { Input } from "@/components/ui/input.tsx";
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

export default function StaffTimeTrackerPage() {
  const { data: timeEntries = [] } = useTimeEntries({});
  const cases = useCases({}) || [];
  const { createTimeEntry: createTimeEntryMutation, deleteTimeEntry: deleteTimeEntryMutation } =
    useTimeEntryCommands();

  const [showCreateModal, setShowCreateModal] = useState(false);

  // Stopwatch/Timer State
  const [running, setRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerCaseId, setTimerCaseId] = useState("");
  const [timerDesc, setTimerDesc] = useState("");
  const timerIntervalRef = useRef<any>(null);

  // Manual Form State
  const [caseId, setCaseId] = useState("");
  const [description, setDescription] = useState("");
  const [minutes, setMinutes] = useState("");
  const [isBillable, setIsBillable] = useState(true);
  const [ratePerHour, setRatePerHour] = useState("5000");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timer Tick Logic
  useEffect(() => {
    if (running) {
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((sec) => sec + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [running]);

  const handleStartTimer = () => {
    if (!timerCaseId || !timerDesc) {
      toast.error("Please select a case and enter a description to start tracking.");
      return;
    }
    setElapsedSeconds(0);
    setRunning(true);
    toast.success("Timer started!");
  };

  const handleStopTimer = async () => {
    if (elapsedSeconds < 1) {
      setRunning(false);
      return;
    }
    const mins = Math.max(1, Math.round(elapsedSeconds / 60));
    setRunning(false);
    try {
      await createTimeEntryMutation.mutateAsync({
        caseId: timerCaseId as any,
        description: timerDesc,
        minutes: mins,
        isBillable: true,
        date: new Date().toISOString().split("T")[0],
        ratePerHour: 5000, // Default hourly rate
      });
      toast.success(`Timer stopped! Logged ${mins} minute(s) successfully.`);
      setTimerDesc("");
      setElapsedSeconds(0);
    } catch (err: any) {
      toast.error(err?.message || "Failed to log time entry.");
    }
  };

  const handleCreateManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId || !description || !minutes || !ratePerHour || !date) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setIsSubmitting(true);
    try {
      await createTimeEntryMutation.mutateAsync({
        caseId: caseId as any,
        description,
        minutes: Number(minutes),
        isBillable,
        date,
        ratePerHour: Number(ratePerHour),
      });
      toast.success("Time entry saved successfully!");
      setShowCreateModal(false);
      // Reset
      setCaseId("");
      setDescription("");
      setMinutes("");
      setIsBillable(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to add time entry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async (entryId: any) => {
    if (!confirm("Are you sure you want to delete this time entry?")) return;
    try {
      await deleteTimeEntryMutation.mutateAsync({ id: entryId });
      toast.success("Time entry deleted.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete entry.");
    }
  };

  // Format Elapsed Time (hh:mm:ss)
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((secs % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(secs % 60)
      .toString()
      .padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  // Dynamically calculate metrics
  const totalTrackedMinutes = timeEntries.reduce((sum, e) => sum + e.minutes, 0);
  const hoursThisWeek = (totalTrackedMinutes / 60).toFixed(1) + "h";

  const unbilledEntries = timeEntries.filter((e) => e.isBillable && !e.invoiceId);
  const unbilledMinutes = unbilledEntries.reduce((sum, e) => sum + e.minutes, 0);
  const unbilledHoursStr = (unbilledMinutes / 60).toFixed(1) + "h";
  const unbilledTotalAmount = unbilledEntries.reduce(
    (sum, e) => sum + (e.minutes / 60) * e.ratePerHour,
    0,
  );

  return (
    <PortalPageShell
      portal="staff"
      decorated
      showTodayDate
      titleKey="portal.time.title"
      descriptionKey="portal.time.description"
      icon={Clock}
      metrics={[
        {
          label: "Logged hours",
          value: hoursThisWeek,
          icon: Clock,
          tone: DASHBOARD_METRIC_TONES.time,
          helperText: "Total recorded",
        },
        {
          label: "Unbilled hours",
          value: unbilledHoursStr,
          tone: "warning",
          helperText: "Awaiting invoice",
        },
        {
          label: "Unbilled amount",
          value: formatNPR(unbilledTotalAmount),
          tone: DASHBOARD_METRIC_TONES.revenue,
          helperText: "Billable WIP",
        },
      ]}
      actions={
        <DashboardButton size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus className="size-4" aria-hidden /> Add entry
        </DashboardButton>
      }
    >
      <DashboardSection
        title="Stopwatch timer"
        className="border-dashboard-primary/30 bg-dashboard-primary-soft/40"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1 space-y-3">
            <p className="text-sm font-semibold text-primary font-serif">STOPWATCH TIMER</p>
            {!running ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden"
                  value={timerCaseId}
                  onChange={(e) => setTimerCaseId(e.target.value)}
                >
                  <option value="">Select Case Matter</option>
                  {cases
                    .filter((c: any) => c.status === "active")
                    .map((c: any) => (
                      <option key={c._id} value={c._id}>
                        [{c.caseNumber}] {c.title}
                      </option>
                    ))}
                </select>
                <Input
                  placeholder="What are you working on?"
                  className="text-xs bg-background h-9"
                  value={timerDesc}
                  onChange={(e) => setTimerDesc(e.target.value)}
                />
              </div>
            ) : (
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Active Matter:</p>
                <p className="text-sm font-bold text-foreground">
                  {cases.find((c: any) => c._id === timerCaseId)?.title || "General"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">&ldquo;{timerDesc}&rdquo;</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between md:justify-end gap-6 flex-shrink-0">
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-0.5">Elapsed Time</p>
              <p className="text-3xl font-mono font-bold text-foreground">
                {formatTime(elapsedSeconds)}
              </p>
            </div>
            <Button
              size="lg"
              className={running ? "bg-destructive hover:bg-destructive/90" : ""}
              onClick={running ? handleStopTimer : handleStartTimer}
            >
              {running ? (
                <>
                  <Square className="w-4 h-4 mr-2" /> Stop & Log
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" /> Start Timer
                </>
              )}
            </Button>
          </div>
        </div>
      </DashboardSection>

      <DashboardSection title="Recent entries">
        {timeEntries.length === 0 ? (
          <EmptyState
            title="No time entries"
            description="No time entries logged yet."
            icon={Clock}
          />
        ) : (
          <div className="space-y-2">
            {timeEntries.map((e: any) => {
              const matchedCase = cases.find((c: any) => c._id === e.caseId);
              return (
                <DashboardListRow key={e._id}>
                  <div className="flex items-center gap-3 min-w-0">
                    <Clock className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{e.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {matchedCase
                          ? `[${matchedCase.caseNumber}] ${matchedCase.title}`
                          : "General"}{" "}
                        &mdash; <DualDateDisplay isoDate={e.date} />
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right flex-shrink-0">
                    <div>
                      <p className="text-sm font-bold text-foreground">{e.minutes} min</p>
                      <p className="text-xs text-muted-foreground">
                        {e.isBillable
                          ? formatNPR((e.minutes / 60) * e.ratePerHour)
                          : "Non-billable"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {e.invoiceId ? (
                        <DashboardStatusLabel label="Invoiced" tone="information" />
                      ) : e.isBillable ? (
                        <DashboardStatusLabel label="Unbilled" tone="success" />
                      ) : (
                        <DashboardStatusLabel label="Internal" tone="neutral" />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteEntry(e._id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </DashboardListRow>
              );
            })}
          </div>
        )}
      </DashboardSection>

      {/* Manual Entry Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in-30">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-auto flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif font-bold text-lg text-primary">Log Manual Time Entry</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualEntry} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Select Case Matter <span className="text-destructive">*</span>
                </label>
                <select
                  required
                  className="w-full h-9 rounded-md border border-input bg-input text-foreground px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden"
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
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
                <label className="text-xs font-medium text-foreground">
                  Description of Work <span className="text-destructive">*</span>
                </label>
                <textarea
                  required
                  className="w-full rounded-md border border-input bg-input text-foreground px-3 py-2 text-xs shadow-xs focus-visible:outline-hidden min-h-[60px]"
                  placeholder="Drafting document, witness examination preparation, filing brief..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Logged Minutes <span className="text-destructive">*</span>
                  </label>
                  <Input
                    required
                    type="number"
                    min="1"
                    placeholder="e.g. 60"
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Date of Activity <span className="text-destructive">*</span>
                  </label>
                  <Input
                    required
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Hourly Rate (NPR)</label>
                  <Input
                    type="number"
                    placeholder="5000"
                    value={ratePerHour}
                    onChange={(e) => setRatePerHour(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground block mb-2">
                    Billing State
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsBillable(true)}
                      className={`flex-1 h-9 rounded-md border text-xs font-semibold cursor-pointer ${
                        isBillable
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-input text-foreground border-input hover:bg-secondary/50"
                      }`}
                    >
                      Billable
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsBillable(false)}
                      className={`flex-1 h-9 rounded-md border text-xs font-semibold cursor-pointer ${
                        !isBillable
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-input text-foreground border-input hover:bg-secondary/50"
                      }`}
                    >
                      Non-Billable
                    </button>
                  </div>
                </div>
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
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Log Entry"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PortalPageShell>
  );
}
