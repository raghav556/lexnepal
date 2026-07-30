import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Calendar, Clock, Video, UserPlus, CheckCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { toast } from "sonner";

export default function AdminAppointmentsPage() {
  const appointments = useQuery(api.appointments.listAppointments, {}) || [];
  const users = useQuery(api.users.listUsers, {}) || [];
  
  const lawyers = users.filter((u: any) => u.role === "partner" || u.role === "associate" || u.role === "senior_associate");
  const updateStatus = useMutation(api.appointments.updateAppointmentStatus);
  const assignLawyer = useMutation(api.appointments.assignLawyerToAppointment);

  const [filter, setFilter] = useState("all");

  const filteredAppointments = filter === "all" 
    ? appointments 
    : appointments.filter((a: any) => a.status === filter);

  const handleGenerateLink = async (id: string) => {
    // Generate a mock meet link
    const mockLink = `https://meet.google.com/mock-${Math.random().toString(36).substring(2, 8)}`;
    try {
      await updateStatus({ id: id as any, status: "confirmed", meetingLink: mockLink });
      toast.success("Video link generated and appointment confirmed.");
    } catch {
      toast.error("Failed to generate link.");
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      await updateStatus({ id: id as any, status: "confirmed" });
      toast.success("Appointment confirmed.");
    } catch {
      toast.error("Failed to confirm.");
    }
  };

  const handleAssign = async (id: string, lawyerId: string) => {
    try {
      await assignLawyer({ id: id as any, assignedLawyerId: lawyerId as any });
      toast.success("Lawyer assigned successfully.");
    } catch {
      toast.error("Failed to assign lawyer.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-serif font-bold text-foreground">Appointments & Calendar</h1>
        <div className="flex gap-2">
          <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")} size="sm">All</Button>
          <Button variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")} size="sm">Pending</Button>
          <Button variant={filter === "confirmed" ? "default" : "outline"} onClick={() => setFilter("confirmed")} size="sm">Confirmed</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredAppointments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
            No appointments found.
          </div>
        ) : (
          filteredAppointments.map((apt: any) => (
            <Card key={apt._id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  {/* Left sidebar with Date/Time */}
                  <div className="bg-secondary/50 p-6 md:w-64 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border">
                    <Calendar className="w-8 h-8 text-accent mb-2" />
                    <span className="font-semibold text-lg">{apt.date}</span>
                    <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
                      <Clock className="w-4 h-4" />
                      <span>{apt.timeSlot}</span>
                    </div>
                  </div>
                  
                  {/* Main Details */}
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-xl font-serif font-bold">{apt.clientName}</h3>
                          <p className="text-sm text-muted-foreground">{apt.clientPhone} {apt.clientEmail && `• ${apt.clientEmail}`}</p>
                        </div>
                        <Badge variant={apt.status === "confirmed" ? "default" : apt.status === "pending" ? "secondary" : "outline"}>
                          {apt.status}
                        </Badge>
                      </div>
                      
                      <div className="mb-4">
                        <Badge variant="outline" className="mb-2">{apt.practiceArea}</Badge>
                        {apt.notes && <p className="text-sm text-muted-foreground bg-secondary/30 p-3 rounded-md">{apt.notes}</p>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border mt-2">
                      <div className="flex-1 min-w-[200px]">
                        <Select value={apt.assignedLawyerId || ""} onValueChange={(val) => handleAssign(apt._id, val)}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Assign Lawyer..." />
                          </SelectTrigger>
                          <SelectContent>
                            {lawyers.map((l: any) => (
                              <SelectItem key={l._id} value={l._id}>{l.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {apt.status === "pending" && (
                        <Button size="sm" variant="outline" className="gap-2" onClick={() => handleConfirm(apt._id)}>
                          <CheckCircle className="w-4 h-4" /> Confirm
                        </Button>
                      )}

                      {!apt.meetingLink ? (
                        <Button size="sm" className="gap-2" onClick={() => handleGenerateLink(apt._id)}>
                          <Video className="w-4 h-4" /> Generate Link
                        </Button>
                      ) : (
                        <a href={apt.meetingLink} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline flex items-center gap-1.5 font-medium px-3 py-2 bg-accent/10 rounded-md">
                          <Video className="w-4 h-4" /> {apt.meetingLink}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
