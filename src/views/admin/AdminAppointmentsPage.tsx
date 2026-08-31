"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAppointments, useAppointmentCommands, useAvailableSlots } from "@/client/queries/crm";
import { useStaffDirectory } from "@/client/queries/identity";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import { ConfirmDialog, type ConfirmDialogState } from "@/components/ui/confirm-dialog.tsx";
import {
  MeetingLinkDialog,
  type MeetingLinkDialogTarget,
} from "@/components/crm/MeetingLinkDialog.tsx";
import { Pagination } from "@/components/ui/pagination.tsx";
import { usePagination } from "@/hooks/use-pagination.ts";
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  CheckCircle,
  XCircle,
  Copy,
  ExternalLink,
  CalendarDays,
  List,
  Plus,
  Edit,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserRound,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { toast } from "sonner";
import { formatAppointmentDate, todayIsoInFirmTz } from "@/shared/crm/appointment-dates.ts";
import { DEFAULT_APPOINTMENT_SLOTS } from "@/shared/crm/appointment-slots.ts";
import {
  DashboardButton,
  DashboardFilterBar,
  DashboardListRow,
  DashboardSection,
  DashboardStatusLabel,
  DualDateDisplay,
  EmptyState,
  PortalPageShell,
} from "@/components/dashboard";
import { DASHBOARD_METRIC_TONES, DASHBOARD_TONE_PANEL_CLASSES } from "@/lib/dashboard-semantics";

type AptRow = {
  id?: string;
  _id?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientId?: string | null;
  leadId?: string | null;
  practiceArea?: string;
  date?: string;
  timeSlot?: string;
  notes?: string;
  status?: string;
  assignedLawyerId?: string | null;
  meetingLink?: string | null;
};

function aptKey(a: AptRow) {
  return String(a.id || a._id || "");
}

function monthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function toIsoDate(y: number, m: number, day: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function downloadAppointmentsCsv(list: AptRow[], lawyerName: (id?: string | null) => string) {
  const headers = [
    "Date",
    "Time",
    "Client",
    "Email",
    "Phone",
    "Status",
    "Practice area",
    "Lawyer",
    "Meeting link",
    "Lead id",
    "Client id",
    "Notes",
  ];
  const rows = list.map((a) => [
    a.date ?? "",
    a.timeSlot ?? "",
    a.clientName ?? "",
    a.clientEmail ?? "",
    a.clientPhone ?? "",
    a.status ?? "",
    a.practiceArea ?? "",
    lawyerName(a.assignedLawyerId),
    a.meetingLink ?? "",
    a.leadId ?? "",
    a.clientId ?? "",
    (a.notes ?? "").replace(/\s+/g, " ").trim(),
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `appointments-${todayIsoInFirmTz()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const emptyCreate = {
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  practiceArea: "Consultation",
  date: "",
  timeSlot: "",
  notes: "",
  assignedLawyerId: "",
};

export default function AdminAppointmentsPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("appointment")?.trim() || null;

  const [statusFilter, setStatusFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const apiFilters = useMemo(() => {
    const f: { status?: string; assignedLawyerId?: string } = {};
    if (statusFilter !== "all") f.status = statusFilter;
    if (assigneeFilter !== "all" && assigneeFilter !== "unassigned") {
      f.assignedLawyerId = assigneeFilter;
    }
    return f;
  }, [statusFilter, assigneeFilter]);

  const { data: appointments = [], isLoading, isError } = useAppointments(apiFilters);
  const users = useStaffDirectory() ?? [];
  const lawyers = users.filter((u) =>
    ["partner", "associate", "senior_associate"].includes(u.role ?? ""),
  );

  const lawyerName = (id?: string | null) => {
    if (!id) return "";
    const u = users.find((x) => x.id === id);
    return u?.name ?? "";
  };

  const { createAppointment, updateStatus, assignLawyer, rescheduleAppointment } =
    useAppointmentCommands();

  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarMonth, setCalendarMonth] = useState(() => monthStart(new Date()));
  const [confirm, setConfirm] = useState<ConfirmDialogState>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [meetingLinkTarget, setMeetingLinkTarget] = useState<MeetingLinkDialogTarget>(null);
  const highlightScrolled = useRef<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createData, setCreateData] = useState(emptyCreate);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [rescheduleData, setRescheduleData] = useState<{
    id: string;
    date: string;
    timeSlot: string;
    assignedLawyerId?: string;
  } | null>(null);

  const createLawyerId = createData.assignedLawyerId || undefined;
  const { data: createSlots = [], isLoading: createSlotsLoading } = useAvailableSlots(
    isCreateOpen && createData.date ? createData.date : undefined,
    createLawyerId,
  );
  const { data: rescheduleSlots = [], isLoading: rescheduleSlotsLoading } = useAvailableSlots(
    rescheduleData?.date,
    rescheduleData?.assignedLawyerId,
  );

  useEffect(() => {
    if (!createData.timeSlot) return;
    if (createSlots.length > 0 && !createSlots.includes(createData.timeSlot)) {
      setCreateData((prev) => ({ ...prev, timeSlot: "" }));
    }
  }, [createSlots, createData.timeSlot]);

  useEffect(() => {
    if (!rescheduleData?.timeSlot) return;
    const allowed = new Set([...rescheduleSlots, rescheduleData.timeSlot]);
    if (rescheduleSlots.length > 0 && !allowed.has(rescheduleData.timeSlot)) {
      setRescheduleData((prev) => (prev ? { ...prev, timeSlot: "" } : prev));
    }
  }, [rescheduleSlots, rescheduleData?.timeSlot]);

  useEffect(() => {
    if (highlightId) setViewMode("list");
  }, [highlightId]);

  const today = todayIsoInFirmTz();

  const filteredAppointments = useMemo(() => {
    const q = search.toLowerCase().trim();
    return (appointments as AptRow[]).filter((a) => {
      if (assigneeFilter === "unassigned" && a.assignedLawyerId) return false;
      if (dateFrom && (a.date ?? "") < dateFrom) return false;
      if (dateTo && (a.date ?? "") > dateTo) return false;
      if (!q) return true;
      const hay = [
        a.clientName,
        a.clientEmail,
        a.clientPhone,
        a.practiceArea,
        a.notes,
        a.timeSlot,
        a.date,
        lawyerName(a.assignedLawyerId),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [appointments, search, assigneeFilter, dateFrom, dateTo, users]);

  const {
    paginatedItems,
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    resetPagination,
    itemsPerPage,
  } = usePagination(filteredAppointments, 10);

  useEffect(() => {
    resetPagination();
  }, [search, statusFilter, assigneeFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (!highlightId || filteredAppointments.length === 0) return;
    const idx = filteredAppointments.findIndex((a) => aptKey(a) === highlightId);
    if (idx < 0) return;
    const page = Math.floor(idx / itemsPerPage) + 1;
    if (page !== currentPage) goToPage(page);
  }, [highlightId, filteredAppointments, itemsPerPage]);

  useEffect(() => {
    if (!highlightId || isLoading || viewMode !== "list") return;
    if (highlightScrolled.current === highlightId) return;
    const el = document.getElementById(`appointment-${highlightId}`);
    if (!el) return;
    highlightScrolled.current = highlightId;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId, isLoading, viewMode, paginatedItems]);

  const kpi = useMemo(() => {
    const all = appointments as AptRow[];
    const pendingToday = all.filter((a) => a.status === "pending" && a.date === today).length;
    const unassigned = all.filter(
      (a) => !a.assignedLawyerId && a.status !== "cancelled" && a.status !== "completed",
    ).length;
    const confirmedUpcoming = all.filter(
      (a) => a.status === "confirmed" && (a.date ?? "") >= today,
    ).length;
    return { pendingToday, unassigned, confirmedUpcoming };
  }, [appointments, today]);

  const openCreate = (prefillDate?: string) => {
    setCreateData({
      ...emptyCreate,
      date: prefillDate || (dateFrom && dateFrom === dateTo ? dateFrom : "") || "",
    });
    setIsCreateOpen(true);
  };

  const requestCancel = (apt: AptRow) => {
    const id = aptKey(apt);
    setConfirm({
      title: "Cancel appointment?",
      description: `Cancel booking for ${apt.clientName || "this client"} on ${apt.date} at ${apt.timeSlot}? This cannot be undone from the list.`,
      confirmLabel: "Cancel appointment",
      destructive: true,
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          await updateStatus.mutateAsync({ appointmentId: id, status: "cancelled" });
          toast.success("Appointment cancelled.");
        } catch {
          toast.error("Failed to cancel appointment.");
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  const openMeetingLinkDialog = (
    id: string,
    status: "pending" | "confirmed",
    clientName?: string,
  ) => {
    setMeetingLinkTarget({ id, status, clientName });
  };

  const handleStatusUpdate = async (
    id: string,
    status: "confirmed" | "completed" | "cancelled",
  ) => {
    try {
      await updateStatus.mutateAsync({ appointmentId: id, status });
      toast.success(`Appointment marked as ${status}.`);
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const handleAssign = async (id: string, lawyerId: string) => {
    try {
      await assignLawyer.mutateAsync({ appointmentId: id, lawyerId });
      toast.success("Lawyer assigned.");
    } catch {
      toast.error("Failed to assign lawyer.");
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAppointment.mutateAsync({
        ...createData,
        assignedLawyerId: createData.assignedLawyerId ? createData.assignedLawyerId : undefined,
      });
      toast.success("Appointment booked successfully.");
      setIsCreateOpen(false);
      setCreateData(emptyCreate);
    } catch {
      toast.error("Failed to book appointment.");
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleData) return;
    try {
      await rescheduleAppointment.mutateAsync({
        appointmentId: rescheduleData.id,
        date: rescheduleData.date,
        timeSlot: rescheduleData.timeSlot,
      });
      toast.success("Appointment rescheduled successfully.");
      setIsRescheduleOpen(false);
      setRescheduleData(null);
    } catch {
      toast.error("Failed to reschedule.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Meeting link copied to clipboard!");
  };

  const calYear = calendarMonth.getFullYear();
  const calMonth = calendarMonth.getMonth();
  const startDayOfWeek = calendarMonth.getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calendarCells = Math.ceil((startDayOfWeek + daysInMonth) / 7) * 7;

  const getAppointmentsForDay = (day: number) => {
    const dateStr = toIsoDate(calYear, calMonth, day);
    return filteredAppointments.filter((a) => a.date === dateStr);
  };

  const onCalendarDayClick = (day: number) => {
    const dateStr = toIsoDate(calYear, calMonth, day);
    setDateFrom(dateStr);
    setDateTo(dateStr);
    setViewMode("list");
  };

  const onCalendarDayBook = (e: React.MouseEvent, day: number) => {
    e.stopPropagation();
    openCreate(toIsoDate(calYear, calMonth, day));
  };

  const applyKpiChip = (chip: "pendingToday" | "unassigned" | "confirmedUpcoming") => {
    setViewMode("list");
    if (chip === "pendingToday") {
      setStatusFilter("pending");
      setAssigneeFilter("all");
      setDateFrom(today);
      setDateTo(today);
      setSearch("");
    } else if (chip === "unassigned") {
      setStatusFilter("all");
      setAssigneeFilter("unassigned");
      setDateFrom("");
      setDateTo("");
    } else {
      setStatusFilter("confirmed");
      setAssigneeFilter("all");
      setDateFrom(today);
      setDateTo("");
    }
  };

  return (
    <PortalPageShell
      portal="admin"
      loading={isLoading}
      loadingLabel="Loading appointments…"
      decorated
      showTodayDate
      eyebrow="Scheduling"
      titleKey="portal.appointments.title"
      descriptionKey="portal.appointments.description"
      icon={CalendarIcon}
      metrics={[
        { label: "Pending today", value: kpi.pendingToday, icon: Clock, tone: "warning" },
        {
          label: "Unassigned",
          value: kpi.unassigned,
          icon: UserRound,
          tone: DASHBOARD_METRIC_TONES.people,
        },
        {
          label: "Confirmed upcoming",
          value: kpi.confirmedUpcoming,
          icon: CheckCircle,
          tone: "success",
        },
      ]}
      actions={
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <DashboardButton
            type="button"
            variant="outline"
            className="gap-2 flex-1 sm:flex-none"
            disabled={filteredAppointments.length === 0}
            onClick={() => {
              downloadAppointmentsCsv(filteredAppointments, lawyerName);
              toast.success(`Exported ${filteredAppointments.length} appointment(s).`);
            }}
          >
            <Download className="w-4 h-4" /> Export CSV
          </DashboardButton>
          <DashboardButton onClick={() => openCreate()} className="gap-2 flex-1 sm:flex-none">
            <Plus className="w-4 h-4" /> Book Appointment
          </DashboardButton>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        {(
          [
            {
              key: "pendingToday" as const,
              label: "Pending today",
              value: kpi.pendingToday,
              active: statusFilter === "pending" && dateFrom === today && dateTo === today,
            },
            {
              key: "unassigned" as const,
              label: "Unassigned",
              value: kpi.unassigned,
              active: assigneeFilter === "unassigned",
            },
            {
              key: "confirmedUpcoming" as const,
              label: "Confirmed upcoming",
              value: kpi.confirmedUpcoming,
              active: statusFilter === "confirmed" && dateFrom === today && !dateTo,
            },
          ] as const
        ).map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => applyKpiChip(chip.key)}
            className={`text-left rounded-xl border bg-card px-4 py-3 transition-colors ${
              chip.active
                ? "border-dashboard-primary ring-1 ring-dashboard-primary/30"
                : "border-border hover:bg-muted/40"
            }`}
          >
            <p className="text-xs text-muted-foreground font-medium">{chip.label}</p>
            <p className="text-2xl font-serif font-bold text-foreground mt-0.5">{chip.value}</p>
          </button>
        ))}
      </div>

      <DashboardSection
        title="Filters & view"
        icon={Search}
        actions={
          <div className="grid grid-cols-2 gap-1 bg-muted p-1 rounded-lg w-full sm:w-auto min-w-[200px]">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="gap-1.5 min-w-0 h-9 text-xs sm:text-sm"
            >
              <List className="w-4 h-4 shrink-0" />
              <span className="truncate">List</span>
            </Button>
            <Button
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
              className="gap-1.5 min-w-0 h-9 text-xs sm:text-sm"
            >
              <CalendarDays className="w-4 h-4 shrink-0" />
              <span className="truncate">Calendar</span>
            </Button>
          </div>
        }
      >
        <DashboardFilterBar>
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9 h-9 text-sm w-full"
              placeholder="Search client, phone, area…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-full sm:w-[150px] text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="h-9 w-full sm:w-[180px] text-xs">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All lawyers</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {lawyers.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            className="h-9 w-full sm:w-[150px] text-xs"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="From date"
          />
          <Input
            type="date"
            className="h-9 w-full sm:w-[150px] text-xs"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="To date"
          />
          {(search || statusFilter !== "all" || assigneeFilter !== "all" || dateFrom || dateTo) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setAssigneeFilter("all");
                setDateFrom("");
                setDateTo("");
              }}
            >
              Clear
            </Button>
          )}
        </DashboardFilterBar>
      </DashboardSection>

      {isError ? (
        <EmptyState
          title="Failed to load appointments"
          description="Refresh and try again."
          icon={CalendarIcon}
        />
      ) : viewMode === "calendar" ? (
        <DashboardSection
          title={calendarMonth.toLocaleString("default", { month: "long", year: "numeric" })}
          icon={CalendarDays}
          className="overflow-hidden"
          actions={
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCalendarMonth(new Date(calYear, calMonth - 1, 1))}
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCalendarMonth(new Date(calYear, calMonth + 1, 1))}
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCalendarMonth(monthStart(new Date()))}
              >
                Today
              </Button>
            </div>
          }
        >
          <div className="overflow-x-auto -mx-5 px-0">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-7 border-b border-border text-sm font-medium text-center">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div
                    key={day}
                    className="py-3 border-r border-border last:border-0 bg-muted/20 text-muted-foreground"
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div
                className="grid grid-cols-7 bg-background"
                style={{ gridTemplateRows: `repeat(${calendarCells / 7}, minmax(100px, auto))` }}
              >
                {Array.from({ length: calendarCells }).map((_, i) => {
                  const dayNumber = i - startDayOfWeek + 1;
                  const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
                  const dayApts = isCurrentMonth ? getAppointmentsForDay(dayNumber) : [];
                  const dateStr = isCurrentMonth ? toIsoDate(calYear, calMonth, dayNumber) : "";
                  const isToday = isCurrentMonth && dateStr === today;

                  return (
                    <div
                      key={i}
                      role={isCurrentMonth ? "button" : undefined}
                      tabIndex={isCurrentMonth ? 0 : undefined}
                      onClick={() => isCurrentMonth && onCalendarDayClick(dayNumber)}
                      onKeyDown={(e) => {
                        if (!isCurrentMonth) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onCalendarDayClick(dayNumber);
                        }
                      }}
                      className={`min-h-[100px] sm:min-h-[120px] p-2 border-r border-b border-border relative text-left ${
                        !isCurrentMonth
                          ? "bg-muted/10 text-muted-foreground/30"
                          : "bg-background hover:bg-muted/10 transition-colors cursor-pointer"
                      }`}
                    >
                      {isCurrentMonth && (
                        <>
                          <div className="flex items-center justify-between mb-1 gap-1">
                            <div
                              className={`text-sm font-medium ${
                                isToday
                                  ? "bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center"
                                  : ""
                              }`}
                            >
                              {dayNumber}
                            </div>
                            <button
                              type="button"
                              className="opacity-60 hover:opacity-100 p-0.5 rounded hover:bg-muted"
                              aria-label={`Book on ${dateStr}`}
                              onClick={(e) => onCalendarDayBook(e, dayNumber)}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="space-y-1">
                            {dayApts.slice(0, 3).map((apt) => (
                              <div
                                key={aptKey(apt)}
                                className={`text-xs p-1 rounded truncate border ${
                                  apt.status === "confirmed"
                                    ? DASHBOARD_TONE_PANEL_CLASSES.success
                                    : apt.status === "pending"
                                      ? DASHBOARD_TONE_PANEL_CLASSES.warning
                                      : "bg-muted text-muted-foreground border-border"
                                }`}
                              >
                                {apt.timeSlot} -{" "}
                                {apt.clientName ? apt.clientName.split(" ")[0] : "Client"}
                              </div>
                            ))}
                            {dayApts.length > 3 && (
                              <div className="text-xs text-muted-foreground font-medium pl-1">
                                +{dayApts.length - 3} more
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </DashboardSection>
      ) : (
        <DashboardSection title="Appointments" icon={List}>
          {paginatedItems.length === 0 ? (
            <EmptyState
              title="No appointments found"
              description="No appointments match these filters."
              icon={CalendarIcon}
              action={
                <DashboardButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openCreate()}
                >
                  <Plus className="w-4 h-4 mr-2" /> Book appointment
                </DashboardButton>
              }
            />
          ) : (
            paginatedItems.map((apt) => {
              const id = aptKey(apt);
              const highlighted = highlightId === id;
              return (
                <DashboardListRow
                  key={id}
                  id={`appointment-${id}`}
                  className={`flex-col md:flex-row md:items-stretch p-0 overflow-hidden ${
                    apt.status === "cancelled" ? "opacity-70 border-dashed" : ""
                  } ${highlighted ? "ring-2 ring-dashboard-primary border-dashboard-primary shadow-md" : ""}`}
                >
                  <div className="bg-dashboard-neutral-soft/50 p-4 md:w-52 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-dashboard-border relative shrink-0">
                    {apt.status === "cancelled" && (
                      <div className="absolute inset-0 bg-background/50 flex items-center justify-center backdrop-blur-[1px] font-bold text-destructive rotate-[-15deg] text-xl tracking-widest uppercase">
                        Cancelled
                      </div>
                    )}
                    <CalendarIcon className="w-7 h-7 text-dashboard-primary mb-2" />
                    <span className="font-bold text-base text-foreground text-center">
                      {apt.date ? <DualDateDisplay isoDate={apt.date} /> : "—"}
                    </span>
                    <div className="flex items-center gap-1.5 text-muted-foreground mt-1 font-medium text-sm">
                      <Clock className="w-4 h-4" />
                      <span>{apt.timeSlot}</span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <h3 className="text-lg font-serif font-bold text-foreground truncate">
                            {apt.clientName}
                          </h3>
                          <p className="text-sm text-muted-foreground font-medium truncate">
                            {apt.clientPhone}
                            {apt.clientEmail && ` • ${apt.clientEmail}`}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {apt.clientId ? (
                              <Link
                                href={`/admin/clients?client=${encodeURIComponent(apt.clientId)}`}
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                <UserRound className="w-3 h-3" /> Client record
                              </Link>
                            ) : null}
                            {apt.leadId ? (
                              <Link
                                href="/admin/crm"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                View in CRM
                              </Link>
                            ) : null}
                          </div>
                        </div>
                        <DashboardStatusLabel
                          status={apt.status}
                          className="uppercase tracking-wider text-[10px] shrink-0"
                        />
                      </div>

                      <div className="mb-4">
                        {apt.practiceArea ? (
                          <DashboardStatusLabel
                            tone="information"
                            label={apt.practiceArea}
                            className="mb-2 text-xs"
                          />
                        ) : null}
                        {apt.notes && (
                          <p className="text-sm text-muted-foreground bg-dashboard-neutral-soft/60 p-3 rounded-md border border-dashboard-border">
                            {apt.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {apt.meetingLink && apt.status !== "cancelled" && (
                      <div
                        className={`mb-4 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${DASHBOARD_TONE_PANEL_CLASSES.information}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-dashboard-information-soft flex items-center justify-center shrink-0">
                            <Video className="w-4 h-4 text-dashboard-information" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">
                              Virtual Meeting Room Ready
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-[240px]">
                              {apt.meetingLink}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-background"
                            onClick={() => copyToClipboard(apt.meetingLink!)}
                          >
                            <Copy className="w-4 h-4 mr-2" /> Copy Link
                          </Button>
                          <DashboardButton
                            size="sm"
                            onClick={() => window.open(apt.meetingLink!, "_blank")}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" /> Join
                          </DashboardButton>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-4 mt-2 pt-4 border-t border-dashboard-border">
                      <div className="flex items-center gap-2">
                        <Select
                          value={apt.assignedLawyerId || ""}
                          onValueChange={(val) => handleAssign(id, val)}
                          disabled={apt.status === "cancelled" || apt.status === "completed"}
                        >
                          <SelectTrigger className="w-full sm:w-[200px] h-9 bg-background">
                            <SelectValue placeholder="Assign Lawyer..." />
                          </SelectTrigger>
                          <SelectContent>
                            {lawyers.map((l) => (
                              <SelectItem key={l.id} value={l.id}>
                                {l.name} ({(l.role ?? "").replace("_", " ")})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {apt.status !== "cancelled" && apt.status !== "completed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRescheduleData({
                                id,
                                date: apt.date || "",
                                timeSlot: apt.timeSlot || "",
                                assignedLawyerId: apt.assignedLawyerId || undefined,
                              });
                              setIsRescheduleOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2" /> Reschedule
                          </Button>
                        )}

                        {apt.status === "pending" && (
                          <>
                            <DashboardButton
                              variant="outline"
                              size="sm"
                              onClick={() => requestCancel(apt)}
                            >
                              <XCircle className="w-4 h-4 mr-2" /> Cancel
                            </DashboardButton>
                            <DashboardButton
                              size="sm"
                              onClick={() => openMeetingLinkDialog(id, "confirmed", apt.clientName)}
                            >
                              <Video className="w-4 h-4 mr-2" /> Add Video Link
                            </DashboardButton>
                            <DashboardButton
                              size="sm"
                              onClick={() => handleStatusUpdate(id, "confirmed")}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" /> Confirm (In-Person)
                            </DashboardButton>
                          </>
                        )}

                        {apt.status === "confirmed" && (
                          <>
                            <DashboardButton
                              variant="outline"
                              size="sm"
                              onClick={() => requestCancel(apt)}
                            >
                              <XCircle className="w-4 h-4 mr-2" /> Cancel
                            </DashboardButton>
                            {!apt.meetingLink && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  openMeetingLinkDialog(id, "confirmed", apt.clientName)
                                }
                              >
                                <Video className="w-4 h-4 mr-2" /> Add Video Link
                              </Button>
                            )}
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleStatusUpdate(id, "completed")}
                            >
                              Mark Completed
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </DashboardListRow>
              );
            })
          )}
          {filteredAppointments.length > 0 && (
            <div className="flex flex-col items-center gap-1 pt-2">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
                onNextPage={nextPage}
                onPrevPage={prevPage}
              />
              <p className="text-center text-xs text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1}–
                {Math.min(currentPage * itemsPerPage, filteredAppointments.length)} of{" "}
                {filteredAppointments.length}
              </p>
            </div>
          )}
        </DashboardSection>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Book New Appointment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Client Name</Label>
              <Input
                required
                value={createData.clientName}
                onChange={(e) => setCreateData({ ...createData, clientName: e.target.value })}
                placeholder="Full Name"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  required
                  value={createData.clientPhone}
                  onChange={(e) => setCreateData({ ...createData, clientPhone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-2">
                <Label>Email (Optional)</Label>
                <Input
                  type="email"
                  value={createData.clientEmail}
                  onChange={(e) => setCreateData({ ...createData, clientEmail: e.target.value })}
                  placeholder="Email address"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  required
                  value={createData.date}
                  onChange={(e) =>
                    setCreateData({ ...createData, date: e.target.value, timeSlot: "" })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Time Slot</Label>
                <Select
                  value={createData.timeSlot || undefined}
                  onValueChange={(val) => setCreateData({ ...createData, timeSlot: val })}
                  disabled={!createData.date || createSlotsLoading || createSlots.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !createData.date
                          ? "Pick a date first"
                          : createSlotsLoading
                            ? "Loading slots…"
                            : createSlots.length === 0
                              ? "No slots available"
                              : "Select Time"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {createSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Practice Area / Purpose</Label>
              <Input
                required
                value={createData.practiceArea}
                onChange={(e) => setCreateData({ ...createData, practiceArea: e.target.value })}
                placeholder="e.g. Initial Consultation, Corporate Law"
              />
            </div>
            <div className="space-y-2">
              <Label>Assign Lawyer (Optional)</Label>
              <Select
                value={createData.assignedLawyerId || "none"}
                onValueChange={(val) =>
                  setCreateData({
                    ...createData,
                    assignedLawyerId: val === "none" ? "" : val,
                    timeSlot: "",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Do not assign yet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Do not assign yet</SelectItem>
                  {lawyers.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Internal Notes</Label>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground min-h-[80px]"
                value={createData.notes}
                onChange={(e) => setCreateData({ ...createData, notes: e.target.value })}
                placeholder="Any additional context..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!createData.timeSlot}>
                Book Appointment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isRescheduleOpen || !!rescheduleData}
        onOpenChange={(open) => {
          if (!open) {
            setRescheduleData(null);
            setIsRescheduleOpen(false);
          }
        }}
      >
        <DialogContent className="max-w-sm bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Reschedule Appointment</DialogTitle>
          </DialogHeader>
          {rescheduleData && (
            <form onSubmit={handleRescheduleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>New Date</Label>
                <Input
                  type="date"
                  required
                  value={rescheduleData.date}
                  onChange={(e) =>
                    setRescheduleData({ ...rescheduleData, date: e.target.value, timeSlot: "" })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>New Time Slot</Label>
                <Select
                  value={rescheduleData.timeSlot || undefined}
                  onValueChange={(val) => setRescheduleData({ ...rescheduleData, timeSlot: val })}
                  disabled={!rescheduleData.date || rescheduleSlotsLoading}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={rescheduleSlotsLoading ? "Loading slots…" : "Select Time"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(
                      new Set([
                        ...rescheduleSlots,
                        ...(rescheduleData.timeSlot ? [rescheduleData.timeSlot] : []),
                      ]),
                    ).map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setRescheduleData(null);
                    setIsRescheduleOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <MeetingLinkDialog
        target={meetingLinkTarget}
        onOpenChange={(open) => {
          if (!open) setMeetingLinkTarget(null);
        }}
        onSave={async (args) => {
          await updateStatus.mutateAsync(args);
        }}
      />

      <ConfirmDialog
        state={confirm}
        busy={confirmBusy}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      />
    </PortalPageShell>
  );
}
