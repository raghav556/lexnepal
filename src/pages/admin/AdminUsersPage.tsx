import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Plus, User, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { ROLE_LABELS } from "@/lib/lex-constants.ts";

const USERS = [
  { id: "1", name: "Adv. Ramesh Kumar Adhikari", email: "ramesh@lexnepal.com.np", role: "partner", barNumber: "NPC-001234", barExpiry: "2082-12-31", isActive: true },
  { id: "2", name: "Adv. Sita Rana Magar", email: "sita@lexnepal.com.np", role: "partner", barNumber: "NPC-002891", barExpiry: "2082-06-30", isActive: true },
  { id: "3", name: "Adv. Binod Thapa", email: "binod@lexnepal.com.np", role: "senior_associate", barNumber: "NPC-004510", barExpiry: "2082-12-31", isActive: true },
  { id: "4", name: "Adv. Anjali Shrestha", email: "anjali@lexnepal.com.np", role: "associate", barNumber: "NPC-007823", barExpiry: "2081-03-15", isActive: true },
  { id: "5", name: "Adv. Prabhat Gautam", email: "prabhat@lexnepal.com.np", role: "associate", barNumber: "NPC-009101", barExpiry: "2082-12-31", isActive: true },
  { id: "6", name: "Adv. Deepika Karki", email: "deepika@lexnepal.com.np", role: "associate", barNumber: "NPC-010234", barExpiry: "2082-09-30", isActive: true },
  { id: "7", name: "Sushil Bhattarai", email: "sushil@lexnepal.com.np", role: "paralegal", barNumber: null, barExpiry: null, isActive: true },
  { id: "8", name: "Admin Account", email: "admin@lexnepal.com.np", role: "admin", barNumber: null, barExpiry: null, isActive: true },
];

const ROLE_COLORS: Record<string, string> = {
  partner: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  senior_associate: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  associate: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
  paralegal: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  intern: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  admin: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  client: "bg-gray-100 text-gray-800",
};

export default function AdminUsersPage() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">Users & Roles</h1>
        <Button size="sm" onClick={() => toast.info("User invitation coming in the next milestone!")}><Plus className="w-4 h-4 mr-1" /> Invite User</Button>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {USERS.map((u) => {
          const barExpiryDate = u.barExpiry ? new Date(u.barExpiry) : null;
          const isExpiringSoon = barExpiryDate && barExpiryDate < new Date(Date.now() + 90 * 86400000);
          return (
            <Card key={u.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0"><User className="w-4 h-4 text-accent" /></div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                    {u.barNumber && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <p className="text-xs text-muted-foreground">Bar: {u.barNumber}</p>
                        {isExpiringSoon && <span className="flex items-center gap-0.5 text-xs text-amber-500"><AlertTriangle className="w-3 h-3" /> Expires soon</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge className={`text-xs ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</Badge>
                  <Badge className={`text-xs ${u.isActive ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-800"}`}>{u.isActive ? "Active" : "Inactive"}</Badge>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => toast.info("User editing coming in the next milestone!")}>Edit</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
