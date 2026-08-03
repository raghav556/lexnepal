import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "@/client/data/convex-bridge.ts";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Calendar as CalendarIcon, Clock, Video, UserPlus, CheckCircle, XCircle, Copy, ExternalLink, CalendarDays, List, Plus, Edit } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { toast } from "sonner";
import { FadeInUp } from "@/components/ui/animations.tsx";
import { useStaffDirectory } from "@/client/queries/identity";

export default function AdminAppointmentsPage() {
  const appointments = useQuery(api.appointments.listAppointments, {}) || [];
  const users = useStaffDirectory() || [];
  
  const lawyers = users.filter((u: any) => ["partner", "associate", "senior_associate"].includes(u.role));
  
  const createAppointment = useMutation(api.appointments.createAppointment);
  const updateStatus = useMutation(api.appointments.updateAppointmentStatus);
  const assignLawyer = useMutation(api.appointments.assignLawyerToAppointment);
  const rescheduleAppointment = useMutation(api.appointments.rescheduleAppointment);

  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [filter, setFilter] = useState("all");

  const filteredAppointments = useMemo(() => {
    if (filter === "all") return appointments;
    return appointments.filter((a: any) => a.status === filter);
  }, [appointments, filter]);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createData, setCreateData] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    practiceArea: "Consultation",
    date: "",
    timeSlot: "",
    notes: "",
    assignedLawyerId: "",
  });

  // Reschedule Modal State
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [rescheduleData, setRescheduleData] = useState<{id: string, date: string, timeSlot: string} | null>(null);

  // Actions
  const handleAddMeetingLink = async (id: string, status: "pending" | "confirmed" = "confirmed") => {
    const link = window.prompt("Enter meeting link (leave empty for none):");
    if (link === null) return;
    try {
      await updateStatus({
        id: id as any,
        status,
        meetingLink: link.trim() || undefined,
      });
      toast.success(link.trim() ? "Meeting link saved." : "Updated without a meeting link.");
    } catch {
      toast.error("Failed to save meeting link.");
    }
  };

  const handleStatusUpdate = async (id: string, status: "confirmed" | "completed" | "cancelled") => {
    try {
      await updateStatus({ id: id as any, status });
      toast.success(`Appointment marked as ${status}.`);
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const handleAssign = async (id: string, lawyerId: string) => {
    try {
      await assignLawyer({ id: id as any, assignedLawyerId: lawyerId as any });
      toast.success("Lawyer assigned.");
    } catch {
      toast.error("Failed to assign lawyer.");
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAppointment({
        ...createData,
        assignedLawyerId: createData.assignedLawyerId ? createData.assignedLawyerId as any : undefined,
      });
      toast.success("Appointment booked successfully.");
      setIsCreateOpen(false);
      setCreateData({ clientName: "", clientEmail: "", clientPhone: "", practiceArea: "Consultation", date: "", timeSlot: "", notes: "", assignedLawyerId: "" });
    } catch {
      toast.error("Failed to book appointment.");
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleData) return;
    try {
      await rescheduleAppointment({
        id: rescheduleData.id as any,
        date: rescheduleData.date,
        timeSlot: rescheduleData.timeSlot,
      });
      toast.success("Appointment rescheduled successfully.");
      setIsRescheduleOpen(false);
    } catch {
      toast.error("Failed to reschedule.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Meeting link copied to clipboard!");
  };

  // Calendar Helper Logic (Simple Monthly View logic based on current month)
  const today = new Date();
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const startDayOfWeek = currentMonthStart.getDay(); // 0 is Sunday
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  
  const getAppointmentsForDay = (day: number) => {
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return filteredAppointments.filter((a: any) => a.date === dateStr);
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 w-full min-w-0 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-foreground">Appointments & Calendar</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage firm schedule, online consultations, and lawyer assignments.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2 w-full sm:w-auto shrink-0">
          <Plus className="w-4 h-4" /> Book Appointment
        </Button>
      </div>

      {/* View + filters: equal-width controls so labels never clip on narrow phones */}
      <div className="flex flex-col gap-3 bg-card p-3 sm:p-4 rounded-xl border border-border w-full min-w-0">
        <div className="grid grid-cols-2 gap-1 bg-muted p-1 rounded-lg w-full min-w-0">
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="gap-1.5 min-w-0 h-9 text-xs sm:text-sm"
          >
            <List className="w-4 h-4 shrink-0" />
            <span className="truncate">List</span>
            <span className="hidden sm:inline truncate">View</span>
          </Button>
          <Button
            variant={viewMode === "calendar" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("calendar")}
            className="gap-1.5 min-w-0 h-9 text-xs sm:text-sm"
          >
            <CalendarDays className="w-4 h-4 shrink-0" />
            <span className="truncate">Calendar</span>
            <span className="hidden sm:inline truncate">View</span>
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full min-w-0">
          <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")} size="sm" className="w-full h-9 text-xs sm:text-sm">
            All
          </Button>
          <Button variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")} size="sm" className="w-full h-9 text-xs sm:text-sm">
            Pending
          </Button>
          <Button variant={filter === "confirmed" ? "default" : "outline"} onClick={() => setFilter("confirmed")} size="sm" className="w-full h-9 text-xs sm:text-sm">
            Confirmed
          </Button>
          <Button variant={filter === "cancelled" ? "default" : "outline"} onClick={() => setFilter("cancelled")} size="sm" className="w-full h-9 text-xs sm:text-sm">
            Cancelled
          </Button>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <FadeInUp>
          <Card className="overflow-hidden border-border/50 shadow-sm">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-xl">{today.toLocaleString('default', { month: 'long', year: 'numeric' })}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <div className="min-w-[720px]">
              <div className="grid grid-cols-7 border-b border-border text-sm font-medium text-center">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="py-3 border-r border-border last:border-0 bg-muted/20 text-muted-foreground">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 grid-rows-5 bg-background">
                {Array.from({ length: 35 }).map((_, i) => {
                  const dayNumber = i - startDayOfWeek + 1;
                  const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
                  const dayApts = isCurrentMonth ? getAppointmentsForDay(dayNumber) : [];
                  const isToday = isCurrentMonth && dayNumber === today.getDate();

                  return (
                    <div key={i} className={`min-h-[100px] sm:min-h-[120px] p-2 border-r border-b border-border relative ${!isCurrentMonth ? 'bg-muted/10 text-muted-foreground/30' : 'bg-background hover:bg-muted/10 transition-colors'}`}>
                      {isCurrentMonth && (
                        <>
                          <div className={`text-sm font-medium mb-1 ${isToday ? 'bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center' : ''}`}>
                            {dayNumber}
                          </div>
                          <div className="space-y-1">
                            {dayApts.slice(0, 3).map((apt: any) => (
                              <div key={apt._id} className={`text-xs p-1 rounded truncate border ${apt.status === 'confirmed' ? 'bg-green-500/10 text-green-700 border-green-500/20' : apt.status === 'pending' ? 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20' : 'bg-muted text-muted-foreground'}`}>
                                {apt.timeSlot} - {apt.clientName ? apt.clientName.split(' ')[0] : 'Client'}
                              </div>
                            ))}
                            {dayApts.length > 3 && (
                              <div className="text-xs text-muted-foreground font-medium pl-1">+{dayApts.length - 3} more</div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              </div>
            </CardContent>
          </Card>
        </FadeInUp>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
              No appointments found for this filter.
            </div>
          ) : (
            filteredAppointments.map((apt: any) => (
              <FadeInUp key={apt._id}>
                <Card className={`overflow-hidden border transition-colors ${apt.status === 'cancelled' ? 'opacity-70 bg-muted/30 border-dashed' : 'border-border'}`}>
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Left sidebar with Date/Time */}
                      <div className="bg-secondary/30 p-6 md:w-56 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border relative">
                        {apt.status === 'cancelled' && <div className="absolute inset-0 bg-background/50 flex items-center justify-center backdrop-blur-[1px] font-bold text-destructive rotate-[-15deg] text-xl tracking-widest uppercase">Cancelled</div>}
                        <CalendarIcon className="w-8 h-8 text-accent mb-2" />
                        <span className="font-bold text-lg text-foreground">{apt.date}</span>
                        <div className="flex items-center gap-1.5 text-muted-foreground mt-1 font-medium">
                          <Clock className="w-4 h-4" />
                          <span>{apt.timeSlot}</span>
                        </div>
                      </div>
                      
                      {/* Main Details */}
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
                            <div>
                              <h3 className="text-xl font-serif font-bold text-foreground">{apt.clientName}</h3>
                              <p className="text-sm text-muted-foreground font-medium">{apt.clientPhone} {apt.clientEmail && `• ${apt.clientEmail}`}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge variant={apt.status === "confirmed" ? "default" : apt.status === "pending" ? "secondary" : apt.status === "completed" ? "outline" : "destructive"} className="uppercase tracking-wider">
                                {apt.status}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="mb-4">
                            <Badge variant="outline" className="mb-2 bg-background">{apt.practiceArea}</Badge>
                            {apt.notes && <p className="text-sm text-muted-foreground bg-secondary/30 p-3 rounded-md border border-border/50">{apt.notes}</p>}
                          </div>
                        </div>

                        {/* Meeting Link Area */}
                        {apt.meetingLink && apt.status !== "cancelled" && (
                          <div className="mb-4 bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <Video className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">Virtual Meeting Room Ready</p>
                                <p className="text-xs text-blue-700/70 dark:text-blue-400/70 truncate max-w-[200px]">{apt.meetingLink}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" className="bg-background" onClick={() => copyToClipboard(apt.meetingLink)}>
                                <Copy className="w-4 h-4 mr-2" /> Copy Link
                              </Button>
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => window.open(apt.meetingLink, '_blank')}>
                                <ExternalLink className="w-4 h-4 mr-2" /> Join
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {/* Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-4 mt-2 pt-4 border-t border-border">
                          <div className="flex items-center gap-2">
                            <Select 
                              value={apt.assignedLawyerId || ""}
                              onValueChange={(val) => handleAssign(apt._id, val)}
                              disabled={apt.status === "cancelled" || apt.status === "completed"}
                            >
                              <SelectTrigger className="w-full sm:w-[200px] h-9 bg-background">
                                <SelectValue placeholder="Assign Lawyer..." />
                              </SelectTrigger>
                              <SelectContent>
                                {lawyers.map((l: any) => (
                                  <SelectItem key={l._id} value={l._id}>{l.name} ({l.role.replace("_", " ")})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2">
                            {apt.status !== "cancelled" && apt.status !== "completed" && (
                              <Button variant="outline" size="sm" onClick={() => setRescheduleData({ id: apt._id, date: apt.date, timeSlot: apt.timeSlot })}>
                                <Edit className="w-4 h-4 mr-2" /> Reschedule
                              </Button>
                            )}

                            {apt.status === "pending" && (
                              <>
                                <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleStatusUpdate(apt._id, "cancelled")}>
                                  <XCircle className="w-4 h-4 mr-2" /> Cancel
                                </Button>
                                <Button size="sm" onClick={() => handleAddMeetingLink(apt._id, "confirmed")}>
                                  <Video className="w-4 h-4 mr-2" /> Add Video Link
                                </Button>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleStatusUpdate(apt._id, "confirmed")}>
                                  <CheckCircle className="w-4 h-4 mr-2" /> Confirm (In-Person)
                                </Button>
                              </>
                            )}

                            {apt.status === "confirmed" && (
                              <>
                                <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleStatusUpdate(apt._id, "cancelled")}>
                                  <XCircle className="w-4 h-4 mr-2" /> Cancel
                                </Button>
                                {!apt.meetingLink && (
                                  <Button size="sm" onClick={() => handleAddMeetingLink(apt._id, "confirmed")}>
                                    <Video className="w-4 h-4 mr-2" /> Add Video Link
                                  </Button>
                                )}
                                <Button variant="secondary" size="sm" onClick={() => handleStatusUpdate(apt._id, "completed")}>
                                  Mark Completed
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </FadeInUp>
            ))
          )}
        </div>
      )}

      {/* Book Appointment Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Book New Appointment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Client Name</label>
              <Input required value={createData.clientName} onChange={e => setCreateData({...createData, clientName: e.target.value})} placeholder="Full Name" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Phone</label>
                <Input required value={createData.clientPhone} onChange={e => setCreateData({...createData, clientPhone: e.target.value})} placeholder="Phone number" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email (Optional)</label>
                <Input type="email" value={createData.clientEmail} onChange={e => setCreateData({...createData, clientEmail: e.target.value})} placeholder="Email address" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Date</label>
                <Input type="date" required value={createData.date} onChange={e => setCreateData({...createData, date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Time Slot</label>
                <select required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={createData.timeSlot} onChange={e => setCreateData({...createData, timeSlot: e.target.value})}>
                  <option value="">Select Time</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:30 AM">11:30 AM</option>
                  <option value="01:00 PM">01:00 PM</option>
                  <option value="02:30 PM">02:30 PM</option>
                  <option value="04:00 PM">04:00 PM</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Practice Area / Purpose</label>
              <Input required value={createData.practiceArea} onChange={e => setCreateData({...createData, practiceArea: e.target.value})} placeholder="e.g. Initial Consultation, Corporate Law" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Assign Lawyer (Optional)</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={createData.assignedLawyerId} onChange={e => setCreateData({...createData, assignedLawyerId: e.target.value})}>
                <option value="">Do not assign yet</option>
                {lawyers.map((l: any) => (
                  <option key={l._id} value={l._id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Internal Notes</label>
              <textarea className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground min-h-[80px]" value={createData.notes} onChange={e => setCreateData({...createData, notes: e.target.value})} placeholder="Any additional context..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button type="submit">Book Appointment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reschedule Modal */}
      <Dialog open={isRescheduleOpen || !!rescheduleData} onOpenChange={(open) => !open && setRescheduleData(null)}>
        <DialogContent className="max-w-sm bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Reschedule Appointment</DialogTitle>
          </DialogHeader>
          {rescheduleData && (
            <form onSubmit={handleRescheduleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">New Date</label>
                <Input type="date" required value={rescheduleData.date} onChange={e => setRescheduleData({...rescheduleData, date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">New Time Slot</label>
                <select required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={rescheduleData.timeSlot} onChange={e => setRescheduleData({...rescheduleData, timeSlot: e.target.value})}>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:30 AM">11:30 AM</option>
                  <option value="01:00 PM">01:00 PM</option>
                  <option value="02:30 PM">02:30 PM</option>
                  <option value="04:00 PM">04:00 PM</option>
                </select>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setRescheduleData(null)}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
