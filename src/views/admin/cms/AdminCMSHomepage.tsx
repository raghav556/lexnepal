import { useEffect, useMemo, useState } from "react";
import { Save, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useCmsCommands, useCmsSettings } from "@/client/queries/cms";
import { usePublicTeam } from "@/client/queries/cms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_DIRECTOR_MESSAGE,
  filterLeadershipTeam,
  resolveDirectorProfile,
  resolvePublicTitle,
  type DirectorMessageSettings,
} from "@/shared/director-message";
import { LEADERSHIP_TITLE_EXAMPLES } from "@/shared/leadership";

export default function AdminCMSHomepage() {
  const settings = useCmsSettings("admin") || {};
  const team = usePublicTeam() || [];
  const leadershipTeam = useMemo(() => filterLeadershipTeam(team), [team]);
  const { updateSettings } = useCmsCommands();
  const [form, setForm] = useState<DirectorMessageSettings>(DEFAULT_DIRECTOR_MESSAGE);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const raw = settings.director_message as DirectorMessageSettings | undefined;
    if (raw && typeof raw === "object" && raw.message) {
      setForm({ ...DEFAULT_DIRECTOR_MESSAGE, ...raw });
    }
  }, [settings.director_message]);

  const preview = useMemo(
    () => resolveDirectorProfile(form, team as Parameters<typeof resolveDirectorProfile>[1]),
    [form, team],
  );

  const handleTeamChange = (teamMemberId: string) => {
    const member = leadershipTeam.find((t: any) => (t._id ?? t.id) === teamMemberId);
    setForm((prev) => ({
      ...prev,
      teamMemberId: teamMemberId || undefined,
      name: member?.name ?? member?.fullName ?? prev.name,
      photoUrl: member?.avatarUrl ?? member?.avatar ?? prev.photoUrl,
      designation: member ? resolvePublicTitle(member) : prev.designation,
    }));
  };

  const handleSave = async () => {
    if (!form.message.trim() || !form.name.trim()) {
      toast.error("Message and director name are required.");
      return;
    }
    setIsSaving(true);
    try {
      await updateSettings({
        settings: [{ key: "director_message", value: form }],
      });
      toast.success("Homepage director message saved.");
    } catch {
      toast.error("Failed to save director message.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 w-full min-w-0 overflow-x-hidden max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-3xl font-bold tracking-tight font-serif">Homepage — Director Message</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Photo, message, and signature shown on the public homepage. Links to the director&apos;s profile page.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="shrink-0 w-full sm:w-auto">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visibility & section title</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.isVisible}
              onChange={(e) => setForm((p) => ({ ...p, isVisible: e.target.checked }))}
              className="rounded border-input"
            />
            Show on homepage
          </label>
          <div className="space-y-2">
            <Label>Section title</Label>
            <Input
              value={form.sectionTitle}
              onChange={(e) => setForm((p) => ({ ...p, sectionTitle: e.target.value }))}
              placeholder="Message from Managing Partner"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle2 className="w-5 h-5" /> Director profile link
          </CardTitle>
          <CardDescription>
            Link a partner or senior associate. Their public leadership title and profile at{" "}
            <code>/lawyers/[id]</code> are managed in CMS → Team.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Team member</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.teamMemberId ?? ""}
              onChange={(e) => handleTeamChange(e.target.value)}
            >
              <option value="">— Manual entry (links to /lawyers) —</option>
              {leadershipTeam.map((member: any) => (
                <option key={member._id ?? member.id} value={member._id ?? member.id}>
                  {member.name ?? member.fullName} — {resolvePublicTitle(member)}
                </option>
              ))}
            </select>
            {leadershipTeam.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No public partners or senior associates yet. Mark a team member as Public in CMS → Team.
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Public designation (homepage)</Label>
              <Input
                value={form.designation}
                onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))}
                placeholder="Managing Partner"
                list="director-designation-suggestions"
              />
              <datalist id="director-designation-suggestions">
                {LEADERSHIP_TITLE_EXAMPLES.map((title) => (
                  <option key={title} value={title} />
                ))}
              </datalist>
              <p className="text-xs text-muted-foreground">
                Auto-filled from the team member&apos;s leadership title when linked. Override here if needed.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Photo URL</Label>
              <Input
                value={form.photoUrl ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, photoUrl: e.target.value || undefined }))}
                placeholder="https://..."
              />
              {preview.photoUrl && (
                <img src={preview.photoUrl} alt="Preview" className="mt-2 h-24 w-24 rounded-xl object-cover border" />
              )}
            </div>
            <div className="space-y-2">
              <Label>Signature image URL</Label>
              <Input
                value={form.signatureUrl ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, signatureUrl: e.target.value || undefined }))}
                placeholder="https://... (PNG with transparent background)"
              />
              {form.signatureUrl && (
                <img src={form.signatureUrl} alt="Signature preview" className="mt-2 h-10 object-contain" />
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Button label</Label>
            <Input
              value={form.ctaLabel ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, ctaLabel: e.target.value || undefined }))}
              placeholder="View Full Profile"
            />
            <p className="text-xs text-muted-foreground">
              Redirects to: <span className="font-mono">{preview.profileHref}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Message</CardTitle>
          <CardDescription>The director&apos;s personal message displayed on the homepage.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={6}
            value={form.message}
            onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
            placeholder="Write the director's message..."
            className="resize-y min-h-[140px]"
          />
        </CardContent>
      </Card>
    </div>
  );
}
