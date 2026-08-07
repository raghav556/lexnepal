import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Save, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAdminTeam, useCmsCommands, useCmsSettings } from "@/client/queries/cms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_DIRECTOR_MESSAGE,
  filterLeadershipTeam,
  parseDirectorMessage,
  resolveDirectorProfile,
  resolvePublicTitle,
  type DirectorMessageSettings,
} from "@/shared/director-message";
import { LEADERSHIP_TITLE_EXAMPLES } from "@/shared/leadership";
import { DirectorMessageSection } from "@/views/public/DirectorMessageSection";
import { CmsImageUploadField } from "@/components/cms/CmsImageUploadField";

export default function AdminCMSHomepage() {
  const settings = useCmsSettings("admin") || {};
  const adminTeam = useAdminTeam() || [];
  const leadershipTeam = useMemo(() => filterLeadershipTeam(adminTeam), [adminTeam]);
  const { updateSettings } = useCmsCommands();
  const [form, setForm] = useState<DirectorMessageSettings>(DEFAULT_DIRECTOR_MESSAGE);
  const [initialForm, setInitialForm] = useState<DirectorMessageSettings>(DEFAULT_DIRECTOR_MESSAGE);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const parsed = parseDirectorMessage(settings.director_message);
    if (parsed) {
      setForm(parsed);
      setInitialForm(parsed);
    }
  }, [settings.director_message]);

  const preview = useMemo(
    () => resolveDirectorProfile(form, adminTeam as Parameters<typeof resolveDirectorProfile>[1]),
    [form, adminTeam],
  );

  const linkedMember = useMemo(
    () =>
      form.teamMemberId
        ? adminTeam.find((m: { _id?: string; id?: string }) => (m._id ?? m.id) === form.teamMemberId)
        : undefined,
    [adminTeam, form.teamMemberId],
  );

  const hasUnsavedChanges = JSON.stringify(form) !== JSON.stringify(initialForm);

  const handleTeamChange = (teamMemberId: string) => {
    const member = leadershipTeam.find((t: { _id?: string; id?: string }) => (t._id ?? t.id) === teamMemberId);
    setForm((prev) => ({
      ...prev,
      teamMemberId: teamMemberId || undefined,
      name: member?.name ?? prev.name,
      // Keep an explicit homepage photo; only seed from avatar when none is set yet.
      photoUrl: prev.photoUrl || member?.avatarUrl || member?.avatar || undefined,
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
      setInitialForm(form);
      toast.success("Homepage director message saved.");
      if (form.teamMemberId && linkedMember && linkedMember.isPublicFacing === false) {
        toast.warning(
          "The linked team member is not public-facing — profile link will 404 until you feature them in CMS → Team.",
        );
      }
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
            Director message block on the public homepage (<code className="text-xs">/</code>). Hero, tagline, and
            mobile-app banner are managed under{" "}
            <a href="/admin/cms" className="text-primary underline-offset-2 hover:underline">
              Site Settings
            </a>
            .
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="shrink-0 w-full sm:w-auto">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Saving..." : hasUnsavedChanges ? "Save Changes" : "Saved"}
        </Button>
      </div>

      {form.teamMemberId && linkedMember && linkedMember.isPublicFacing === false && (
        <div className="flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-950 dark:text-amber-100">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>
            <strong>{linkedMember.name}</strong> is not public-facing. The &quot;View profile&quot; button will not
            work until you feature them on{" "}
            <a href="/admin/cms/team" className="underline font-medium">
              CMS → Team
            </a>
            .
          </p>
        </div>
      )}

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
              <option value="">— Manual entry (links to /lawyers directory) —</option>
              {leadershipTeam.map((member: Record<string, unknown>) => (
                <option key={String(member._id ?? member.id)} value={String(member._id ?? member.id)}>
                  {String(member.name ?? "")}
                  {member.isPublicFacing === false ? " (not public yet)" : ""} —{" "}
                  {resolvePublicTitle(member as { role?: string; leadershipTitle?: string | null })}
                </option>
              ))}
            </select>
            {leadershipTeam.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No partners or senior associates in this firm yet. Add staff in Admin → Users, then set their role.
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
            <CmsImageUploadField
              label="Photo"
              purpose="director_photo"
              value={form.photoUrl}
              onChange={(photoUrl) => setForm((p) => ({ ...p, photoUrl }))}
              hint="Upload from your device or paste a URL. Used on the public homepage. If empty, falls back to the linked team member's avatar."
            />
            <CmsImageUploadField
              label="Signature image"
              purpose="director_signature"
              value={form.signatureUrl}
              onChange={(signatureUrl) => setForm((p) => ({ ...p, signatureUrl }))}
              placeholder="https://... (PNG with transparent background)"
              hint="Upload a PNG signature or paste a URL."
              previewClassName="mt-2 h-10 object-contain"
            />
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

      <Card>
        <CardHeader>
          <CardTitle>Live preview</CardTitle>
          <CardDescription>Matches the public homepage section at <code>/</code> (below the hero).</CardDescription>
        </CardHeader>
        <CardContent className="rounded-xl border border-border overflow-hidden bg-muted/20 p-0">
          <DirectorMessageSection
            previewMode
            settings={{ director_message: form }}
            team={adminTeam}
          />
        </CardContent>
      </Card>
    </div>
  );
}
