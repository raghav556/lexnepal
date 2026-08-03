import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@/client/data/convex-bridge.ts";
import { api } from "@/convex/_generated/api.js";
import { useMyClient } from "@/client/queries/clients";
import { useCases } from "@/client/queries/cases";
import { Calendar as CalendarIcon, Clock, Video, Phone, Users, CheckCircle2, Loader2, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { toast } from "sonner";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export default function ClientBookingPage() {
  const clientRecord = useMyClient();
  const clientId = clientRecord?._id;
  const cases = useCases(clientId ? { clientId } : {}) || [];

  const assignedLawyerId = useMemo(() => {
    const active = cases.find((c: any) => c.status === "active") || cases[0];
    return active?.assignedLawyerId as string | undefined;
  }, [cases]);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const dateStr = selectedDate.toISOString().slice(0, 10);

  const availableSlots = useQuery(api.appointments.listAvailableSlots, {
    date: dateStr,
    assignedLawyerId: assignedLawyerId as any,
  }) || [];

  const bookConsultation = useMutation(api.appointments.bookConsultation);
  const appointments = (useQuery(
    api.appointments.listClientAppointments,
    clientId ? { clientId: clientId as any } : "skip",
  ) || []) as any[];

  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"in_person" | "virtual" | "phone">("virtual");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
    setSelectedTime(null);
  };

  const prevDay = () => {
    const d = new Date(selectedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d > today) {
      d.setDate(d.getDate() - 1);
      setSelectedDate(d);
      setSelectedTime(null);
    }
  };

  const handleBook = async () => {
    if (!selectedTime) {
      toast.error("Please select a time slot");
      return;
    }
    if (!clientRecord) {
      toast.error("No client profile linked to this account.");
      return;
    }
    setIsSubmitting(true);
    try {
      const practiceArea =
        selectedType === "virtual"
          ? "Virtual Consultation"
          : selectedType === "phone"
            ? "Phone Consultation"
            : "In-Person Consultation";
      await bookConsultation({
        clientName: clientRecord.fullName,
        clientEmail: clientRecord.email,
        clientPhone: clientRecord.phone || "N/A",
        clientId: clientRecord._id as any,
        practiceArea,
        date: dateStr,
        timeSlot: selectedTime,
        notes: notes || undefined,
        assignedLawyerId: assignedLawyerId as any,
      });
      setShowSuccess(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to book appointment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeDetails = {
    virtual: { icon: Video, label: "Virtual / Zoom", desc: "A video link will be provided" },
    in_person: { icon: Users, label: "In-Person", desc: "At Srimar Law HQ, Kathmandu" },
    phone: { icon: Phone, label: "Phone Call", desc: "Lawyer will call your registered number" },
  };

  if (clientRecord === undefined) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (clientRecord === null) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No client profile is linked to this account. Contact the firm to book consultations.
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="p-4 sm:p-8 space-y-6 max-w-4xl mx-auto">
        <div className="bg-card border border-border rounded-xl p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-foreground mb-2">Consultation Scheduled!</h2>
          <p className="text-muted-foreground mb-6">
            Your {typeDetails[selectedType].label} appointment is confirmed for <strong className="text-foreground">{formatDate(selectedDate)}</strong> at <strong className="text-foreground">{selectedTime}</strong>.
          </p>
          <Button onClick={() => setShowSuccess(false)}>Book Another Appointment</Button>
        </div>
      </div>
    );
  }

  const upcomingAppointments = appointments.filter(
    (a) => a.status !== "cancelled" && a.status !== "completed" && new Date(a.date) >= new Date(new Date().setHours(0, 0, 0, 0)),
  );

  return (
    <div className="p-4 sm:p-6 space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold font-serif text-primary flex items-center gap-2">
          <CalendarIcon className="w-6 h-6" /> Book Consultation
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Schedule a meeting with your assigned legal team.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
            <div className="border-b border-border p-4 bg-muted/30">
              <h2 className="font-medium text-foreground">1. Select Appointment Type</h2>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(["virtual", "in_person", "phone"] as const).map((type) => {
                const { icon: Icon, label, desc } = typeDetails[type];
                const isSelected = selectedType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 text-center transition-all ${
                      isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted"
                    }`}
                  >
                    <Icon className={`w-6 h-6 mb-2 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>{label}</span>
                    <span className="text-xs text-muted-foreground mt-1">{desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
            <div className="border-b border-border p-4 bg-muted/30 flex items-center justify-between">
              <h2 className="font-medium text-foreground">2. Select Date & Time</h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={prevDay} className="h-8 w-8 p-0">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-semibold min-w-[120px] text-center">{formatDate(selectedDate)}</span>
                <Button variant="outline" size="sm" onClick={nextDay} className="h-8 w-8 p-0">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="p-6">
              {availableSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No available slots for this date.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {availableSlots.map((time: string) => {
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`py-2 px-3 rounded-md text-sm font-medium border transition-all ${
                          isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:border-primary/50"
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
            <div className="border-b border-border p-4 bg-muted/30">
              <h2 className="font-medium text-foreground">3. Additional Notes</h2>
            </div>
            <div className="p-4">
              <textarea
                className="w-full rounded-md border border-input bg-input text-foreground px-3 py-2 text-sm shadow-xs focus-visible:outline-hidden min-h-[100px] resize-y"
                placeholder="Briefly describe what you'd like to discuss (optional)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button size="lg" onClick={handleBook} disabled={!selectedTime || isSubmitting} className="px-8 gap-2">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirm Booking
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Your Upcoming Appointments
            </h3>

            {upcomingAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No upcoming appointments.</p>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.map((apt: any) => (
                  <div key={apt._id} className="p-3 rounded-lg border border-border bg-muted/30 text-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-foreground">{formatDate(new Date(apt.date))}</span>
                      <Badge variant="outline" className="text-xs">{apt.timeSlot || apt.time}</Badge>
                    </div>
                    <p className="text-muted-foreground text-xs">{apt.practiceArea || "Consultation"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Need Immediate Help?</h3>
            <p className="text-sm text-blue-800 dark:text-blue-400 mb-4">
              If you have an urgent legal matter that requires immediate attention, please call our emergency hotline.
            </p>
            <p className="font-mono font-bold text-blue-900 dark:text-blue-300">+977 1-4422334</p>
          </div>
        </div>
      </div>
    </div>
  );
}
