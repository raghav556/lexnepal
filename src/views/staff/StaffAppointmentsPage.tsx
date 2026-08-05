import { useState } from "react";
import { useAppointments, useAppointmentCommands } from "@/client/queries/crm";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Calendar, Clock, Video, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user.ts";

export default function StaffAppointmentsPage() {
  const user = useCurrentUser();
  const { data: allAppointments = [] } = useAppointments({});
  
  // Filter for appointments assigned to the logged-in staff member
  const appointments = allAppointments.filter((a: any) => a.assignedLawyerId === user?.id || a.assignedLawyerId === (user as any)?._id);
  const { updateStatus } = useAppointmentCommands();

  const [filter, setFilter] = useState("all");

  const filteredAppointments = filter === "all" 
    ? appointments 
    : appointments.filter((a: any) => a.status === filter);

  const handleAddMeetingLink = async (id: string) => {
    const link = window.prompt("Enter meeting link (leave empty for none):");
    if (link === null) return;
    try {
      await updateStatus.mutateAsync({
        appointmentId: id,
        status: "confirmed",
        meetingLink: link.trim() || undefined,
      });
      toast.success(link.trim() ? "Meeting link saved and appointment confirmed." : "Appointment confirmed.");
    } catch {
      toast.error("Failed to save meeting link.");
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      await updateStatus.mutateAsync({ appointmentId: id, status: "confirmed" });
      toast.success("Appointment confirmed.");
    } catch {
      toast.error("Failed to confirm.");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">My Appointments</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your upcoming client consultations.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")} size="sm">All</Button>
          <Button variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")} size="sm">Pending</Button>
          <Button variant={filter === "confirmed" ? "default" : "outline"} onClick={() => setFilter("confirmed")} size="sm">Confirmed</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredAppointments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
            You have no appointments assigned.
          </div>
        ) : (
          filteredAppointments.map((apt: any) => (
            <Card key={apt.id || apt._id} className="overflow-hidden hover:border-accent transition-colors">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  <div className="bg-secondary/50 p-6 md:w-56 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border">
                    <Calendar className="w-8 h-8 text-accent mb-2" />
                    <span className="font-semibold text-lg">{apt.date}</span>
                    <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
                      <Clock className="w-4 h-4" />
                      <span>{apt.timeSlot}</span>
                    </div>
                  </div>
                  
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

                    <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border mt-2">
                      {apt.status === "pending" && (
                        <Button size="sm" variant="outline" className="gap-2" onClick={() => handleConfirm(apt.id || apt._id)}>
                          <CheckCircle className="w-4 h-4" /> Confirm
                        </Button>
                      )}

                      {!apt.meetingLink ? (
                        <Button size="sm" className="gap-2" onClick={() => handleAddMeetingLink(apt.id || apt._id)}>
                          <Video className="w-4 h-4" /> Add Meeting Link
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
