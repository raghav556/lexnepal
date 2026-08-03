import { useMemo, useState } from "react";
import { useAvailableSlots, useAppointmentCommands, useAppointments } from "@/client/queries/crm";
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
