import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { toast } from "sonner";
import { PRACTICE_AREAS } from "@/lib/lex-constants.ts";
import { Badge } from "@/components/ui/badge.tsx";

export default function AdminSettingsPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl">
      <h1 className="font-serif text-2xl font-bold text-foreground">Firm Settings</h1>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Firm Identity</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5"><Label>Firm Name</Label><Input defaultValue="LexNepal Law Associates" /></div>
          <div className="space-y-1.5"><Label>Tagline</Label><Input defaultValue="Justice. Precision. Trust." /></div>
          <div className="space-y-1.5"><Label>Address</Label><Textarea defaultValue="Thamel, Kathmandu 44600, Nepal" rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Phone</Label><Input defaultValue="+977 01 XXXXXXX" /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input defaultValue="info@lexnepal.com.np" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>VAT Number</Label><Input defaultValue="00000000" /></div>
            <div className="space-y-1.5"><Label>Bar Council Registration</Label><Input defaultValue="NPB-XXX-XXXX" /></div>
          </div>
          <Button onClick={() => toast.success("Settings saved!")}>Save Changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Active Practice Areas</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {PRACTICE_AREAS.map((area) => (
              <Badge key={area} variant="secondary" className="cursor-pointer hover:bg-accent/10">{area}</Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">Click to toggle areas. Deactivated areas are hidden from the public website.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Billing Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Default Hourly Rate (NPR)</Label><Input type="number" defaultValue="5000" /></div>
            <div className="space-y-1.5"><Label>VAT Rate (%)</Label><Input type="number" defaultValue="13" disabled /></div>
          </div>
          <div className="space-y-1.5"><Label>Invoice Payment Terms (days)</Label><Input type="number" defaultValue="14" /></div>
          <Button onClick={() => toast.success("Billing settings saved!")}>Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}
