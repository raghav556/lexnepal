"use client";

import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/client/api/client";
import { ApiClientError } from "@/client/api/errors";
import { queryKeys } from "@/client/queries/query-keys";
import {
  useAvailableSlots,
  useAppointmentCommands,
  useStaffAppointmentCreate,
} from "@/client/queries/crm";
import { DashboardButton } from "@/components/dashboard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { appointmentCreateSchema, appointmentRescheduleSchema } from "@/shared/contracts/crm";
import { DEFAULT_APPOINTMENT_SLOTS } from "@/shared/crm/appointment-slots";
import { todayIsoInFirmTz, formatAppointmentDate } from "@/shared/crm/appointment-dates";
import { appointmentKey, type StaffAppointment } from "./staff-appointments-model";
import { toast } from "sonner";

type Contact = {
  id?: string;
  _id?: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  practiceAreaInterest?: string | null;
};

export function appointmentError(error: unknown, fallback: string) {
  if (error instanceof ApiClientError && error.status === 401)
    return "Your session expired. Sign in again; your input is still here.";
  if (error instanceof ApiClientError && error.status === 403)
    return "You do not have permission to perform this action.";
  return error instanceof Error ? error.message : fallback;
}

// Mounted only while open: drafts survive request errors, and reset after closing.
export function StaffAppointmentBookingDialog({
  appointment,
  staffId,
  staffName,
  initialDate,
  onClose,
  onSaved,
}: {
  appointment?: StaffAppointment;
  staffId: string;
  staffName: string;
  initialDate: string;
  onClose: () => void;
  onSaved: (id: string, date: string) => void;
}) {
  const rescheduling = Boolean(appointment);
  const today = todayIsoInFirmTz();
  const [form, setForm] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    practiceArea: "",
    notes: "",
    date: appointment?.date || (initialDate < today ? today : initialDate),
    timeSlot: "",
  });
  const [contact, setContact] = useState("manual");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(false);
  const create = useStaffAppointmentCreate();
  const { rescheduleAppointment } = useAppointmentCommands();
  const assignedId = appointment?.assignedLawyerId || staffId;
  const slots = useAvailableSlots(form.date, assignedId);
  const clients = useQuery({
    queryKey: queryKeys.clients.list,
    queryFn: ({ signal }) => apiClient.request<Contact[]>("/api/v1/clients", { signal }),
    enabled: !rescheduling,
    retry: false,
  });
  const leadFilters = { assignedTo: staffId };
  const leads = useQuery({
    queryKey: queryKeys.crm.leads(leadFilters),
    queryFn: ({ signal }) =>
      apiClient.request<Contact[]>("/api/v1/leads", { query: leadFilters, signal }),
    enabled: !rescheduling,
    retry: false,
  });
  const contacts = [
    ...(clients.data ?? []).map((c) => ({ ...c, kind: "client" as const })),
    ...(leads.data ?? []).map((c) => ({ ...c, kind: "lead" as const })),
  ].filter((c) => c.id || c._id);
  const picked = contacts.find((c) => `${c.kind}:${c.id || c._id}` === contact);
  const available = DEFAULT_APPOINTMENT_SLOTS.filter((slot) => slots.data.includes(slot));
  const update = (name: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [name]: value, ...(name === "date" ? { timeSlot: "" } : {}) }));
    setReview(false);
    setError("");
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    const payload = {
      ...form,
      assignedLawyerId: staffId,
      clientId: picked?.kind === "client" ? picked.id || picked._id : undefined,
      leadId: picked?.kind === "lead" ? picked.id || picked._id : undefined,
    };
    const parsed = rescheduling
      ? appointmentRescheduleSchema.safeParse(form)
      : appointmentCreateSchema.safeParse(payload);
    if (!parsed.success) {
      setError(`Check ${parsed.error.issues[0].path.join(" ")}: ${parsed.error.issues[0].message}`);
      return;
    }
    if (form.date < today) {
      setError("Choose today or a future date in Asia/Kathmandu.");
      return;
    }
    if (
      slots.isError ||
      slots.isFetching ||
      !available.includes(form.timeSlot as (typeof DEFAULT_APPOINTMENT_SLOTS)[number])
    ) {
      setError("Choose an available start slot. Refresh availability if needed.");
      return;
    }
    if (appointment?.date === form.date && appointment.timeSlot === form.timeSlot) {
      setError("Choose a different date or start slot.");
      return;
    }
    if (rescheduling && !review) {
      setReview(true);
      return;
    }
    setBusy(true);
    try {
      let id = appointment ? appointmentKey(appointment) : "";
      if (appointment)
        await rescheduleAppointment.mutateAsync({
          appointmentId: id,
          date: form.date,
          timeSlot: form.timeSlot,
        });
      else {
        const created = await create.mutateAsync(appointmentCreateSchema.parse(payload));
        id = created.id || created._id || "";
      }
      toast.success(
        appointment ? "Appointment rescheduled." : "Appointment created. Awaiting confirmation.",
      );
      onSaved(id, form.date);
    } catch (cause) {
      setError(appointmentError(cause, "Unable to save appointment. Try again."));
      setReview(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open: boolean) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        className="staff-appointments-booking-dialog sm:max-w-lg"
        aria-labelledby="staff-booking-title"
        aria-describedby="staff-booking-description"
      >
        <DialogHeader>
          <DialogTitle id="staff-booking-title">
            {rescheduling ? "Reschedule appointment" : "New Appointment"}
          </DialogTitle>
          <DialogDescription id="staff-booking-description">
            {appointment
              ? `${appointment.clientName} · currently ${formatAppointmentDate(appointment.date || "")} at ${appointment.timeSlot}.`
              : `Assigned to ${staffName}. New appointments start as pending.`}{" "}
            All times Asia/Kathmandu.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="staff-appointments-form">
          <fieldset disabled={busy} className="staff-appointments-form-fields">
            {!rescheduling && (
              <>
                <div className="staff-appointments-field">
                  <Label htmlFor="appointment-contact">Client or lead</Label>
                  <Select
                    value={contact}
                    onValueChange={(value) => {
                      setContact(value);
                      const found = contacts.find((c) => `${c.kind}:${c.id || c._id}` === value);
                      setForm((f) => ({
                        ...f,
                        clientName: found?.fullName || "",
                        clientPhone: found?.phone || "",
                        clientEmail: found?.email || "",
                        practiceArea: found?.practiceAreaInterest || "",
                      }));
                    }}
                  >
                    <SelectTrigger id="appointment-contact" data-autofocus>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Enter contact details</SelectItem>
                      {contacts.map((c) => (
                        <SelectItem
                          key={`${c.kind}:${c.id || c._id}`}
                          value={`${c.kind}:${c.id || c._id}`}
                        >
                          {c.fullName} · {c.kind}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(clients.isLoading || leads.isLoading) && (
                    <small>Loading permitted contacts…</small>
                  )}
                  {(clients.isError || leads.isError) && (
                    <small>
                      Some contacts could not be loaded. You can enter contact details, or{" "}
                      <button
                        type="button"
                        className="underline"
                        onClick={() => {
                          void clients.refetch();
                          void leads.refetch();
                        }}
                      >
                        retry
                      </button>
                      .
                    </small>
                  )}
                </div>
                <div className="staff-appointments-field">
                  <Label htmlFor="appointment-name">Client name *</Label>
                  <Input
                    id="appointment-name"
                    required
                    maxLength={200}
                    value={form.clientName}
                    onChange={(e) => update("clientName", e.target.value)}
                  />
                </div>
                <div className="staff-appointments-form-pair">
                  <div className="staff-appointments-field">
                    <Label htmlFor="appointment-phone">Phone *</Label>
                    <Input
                      id="appointment-phone"
                      type="tel"
                      required
                      maxLength={40}
                      value={form.clientPhone}
                      onChange={(e) => update("clientPhone", e.target.value)}
                    />
                  </div>
                  <div className="staff-appointments-field">
                    <Label htmlFor="appointment-email">Email</Label>
                    <Input
                      id="appointment-email"
                      type="email"
                      maxLength={320}
                      value={form.clientEmail}
                      onChange={(e) => update("clientEmail", e.target.value)}
                    />
                  </div>
                </div>
                <div className="staff-appointments-field">
                  <Label htmlFor="appointment-practice">Practice area *</Label>
                  <Input
                    id="appointment-practice"
                    required
                    maxLength={200}
                    value={form.practiceArea}
                    onChange={(e) => update("practiceArea", e.target.value)}
                  />
                </div>
              </>
            )}
            <div className="staff-appointments-form-pair">
              <div className="staff-appointments-field">
                <Label htmlFor="appointment-date">Date *</Label>
                <Input
                  id="appointment-date"
                  type="date"
                  required
                  min={today}
                  value={form.date}
                  onChange={(e) => update("date", e.target.value)}
                />
              </div>
              <div className="staff-appointments-field">
                <Label htmlFor="appointment-slot">Start slot *</Label>
                <Select
                  value={form.timeSlot}
                  onValueChange={(value) => update("timeSlot", value)}
                  disabled={slots.isFetching || slots.isError}
                >
                  <SelectTrigger id="appointment-slot">
                    <SelectValue
                      placeholder={slots.isFetching ? "Checking…" : "Choose start time"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {available.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {slots.isError ? (
              <p role="alert">
                Could not load availability.{" "}
                <button type="button" className="underline" onClick={() => void slots.refetch()}>
                  Retry slots
                </button>
              </p>
            ) : !slots.isFetching && available.length === 0 ? (
              <p role="status">No available slots. Choose another date.</p>
            ) : null}
            {!rescheduling && (
              <div className="staff-appointments-field">
                <Label htmlFor="appointment-notes">Notes</Label>
                <Textarea
                  id="appointment-notes"
                  maxLength={10000}
                  rows={3}
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                />
              </div>
            )}
          </fieldset>
          {review && (
            <p className="staff-appointments-review" role="status">
              Move this appointment to {formatAppointmentDate(form.date)} at {form.timeSlot}?
              Confirm below to save this change.
            </p>
          )}
          {error && (
            <p className="staff-appointments-error" role="alert">
              {error}
            </p>
          )}
          <DialogFooter className="gap-2">
            <DashboardButton type="button" variant="outline" disabled={busy} onClick={onClose}>
              Back
            </DashboardButton>
            <DashboardButton
              type="submit"
              disabled={busy || slots.isFetching || slots.isError || !form.timeSlot}
            >
              {busy
                ? "Saving…"
                : rescheduling
                  ? review
                    ? "Confirm reschedule"
                    : "Review reschedule"
                  : "Create appointment"}
            </DashboardButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
