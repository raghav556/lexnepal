import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Home, Plus, Save, Trash2, UserCircle2 } from "lucide-react";
import { DashboardButton, DashboardSection, PortalPageShell } from "@/components/dashboard";
import { toast } from "sonner";
import { useAdminTeam, useCmsCommands, useCmsSettings } from "@/client/queries/cms";
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
import {
  DEFAULT_TRUSTED_ORGANIZATIONS,
  parseTrustedOrganizations,
  type TrustedOrganizationsSettings,
} from "@/shared/trusted-organizations";
import { DirectorMessageSection } from "@/views/public/DirectorMessageSection";
import { CmsImageUploadField } from "@/components/cms/CmsImageUploadField";

export default function AdminCMSHomepage() {
  const settings = useCmsSettings("admin") || {};
  const adminTeam = useAdminTeam() || [];
  const leadershipTeam = useMemo(() => filterLeadershipTeam(adminTeam), [adminTeam]);
  const { updateSettings } = useCmsCommands();
  const [form, setForm] = useState<DirectorMessageSettings>(DEFAULT_DIRECTOR_MESSAGE);
  const [initialForm, setInitialForm] = useState<DirectorMessageSettings>(DEFAULT_DIRECTOR_MESSAGE);
  const [trustedForm, setTrustedForm] = useState<TrustedOrganizationsSettings>({
    ...DEFAULT_TRUSTED_ORGANIZATIONS,
    names: [...DEFAULT_TRUSTED_ORGANIZATIONS.names],
  });
  const [initialTrustedForm, setInitialTrustedForm] = useState<TrustedOrganizationsSettings>({
    ...DEFAULT_TRUSTED_ORGANIZATIONS,
    names: [...DEFAULT_TRUSTED_ORGANIZATIONS.names],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingTrusted, setIsSavingTrusted] = useState(false);

  useEffect(() => {
    const parsed = parseDirectorMessage(settings.director_message);
    if (parsed) {
      setForm(parsed);
      setInitialForm(parsed);
    }
    const trusted = parseTrustedOrganizations(settings.trusted_organizations);
    setTrustedForm(trusted);
    setInitialTrustedForm(trusted);
  }, [settings.director_message, settings.trusted_organizations]);

  const preview = useMemo(
    () => resolveDirectorProfile(form, adminTeam as Parameters<typeof resolveDirectorProfile>[1]),
    [form, adminTeam],
  );

  const linkedMember = useMemo(
    () =>
      form.teamMemberId
        ? adminTeam.find(
            (m: { _id?: string; id?: string }) => (m._id ?? m.id) === form.teamMemberId,
          )
        : undefined,
    [adminTeam, form.teamMemberId],
  );

  const hasUnsavedChanges = JSON.stringify(form) !== JSON.stringify(initialForm);
  const hasUnsavedTrusted =
    JSON.stringify(trustedForm) !== JSON.stringify(initialTrustedForm);

  const handleTeamChange = (teamMemberId: string) => {
    const member = leadershipTeam.find(
      (t: { _id?: string; id?: string }) => (t._id ?? t.id) === teamMemberId,
    );
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

  const handleSaveTrusted = async () => {
    const names = trustedForm.names.map((name) => name.trim()).filter(Boolean);
    setIsSavingTrusted(true);
    try {
      const payload: TrustedOrganizationsSettings = {
        isVisible: trustedForm.isVisible,
        sectionTitle: trustedForm.sectionTitle.trim() || DEFAULT_TRUSTED_ORGANIZATIONS.sectionTitle,
        names,
      };
      await updateSettings({
        settings: [{ key: "trusted_organizations", value: payload }],
      });
      setTrustedForm(payload);
      setInitialTrustedForm(payload);
      toast.success(
        payload.isVisible
          ? "Trusted-by section saved."
          : "Trusted-by section hidden on the public homepage.",
      );
    } catch {
      toast.error("Failed to save trusted-by section.");
    } finally {
      setIsSavingTrusted(false);
    }
  };

  return (
    <PortalPageShell
      portal="admin"
      decorated
      showTodayDate
      eyebrow="Content management"
      title="Homepage"
      description={
        <>
          Public homepage blocks for <code className="text-xs">/</code>. Hide the trusted-by
          marquee when client relationships are confidential. Hero, tagline, and mobile-app banner
          are managed under{" "}
          <a
            href="/admin/cms"
            className="text-white underline underline-offset-2 hover:text-white/80"
          >
            Site Settings
          </a>
          .
        </>
      }
      icon={Home}
      actions={
        <DashboardButton
          onClick={handleSave}
          disabled={isSaving}
          state={isSaving ? "loading" : undefined}
          className="w-full sm:w-auto"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : hasUnsavedChanges ? "Save Changes" : "Saved"}
        </DashboardButton>
      }
      contentClassName="max-w-5xl mx-auto"
    >
      <DashboardSection
        title="Trusted by"
        description="Marquee of organization names on the public homepage. Turn this off when matters are confidential and you must not publish client relationships."
      >
        <div className="space-y-4">
          <label className="flex items-start gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={trustedForm.isVisible}
              onChange={(e) => setTrustedForm((p) => ({ ...p, isVisible: e.target.checked }))}
              className="mt-0.5 rounded border-input"
            />
            <span>
              Show on homepage
              <span className="block text-xs font-normal text-muted-foreground">
                Uncheck to hide the entire strip. Saved names are kept so you can show it later.
              </span>
            </span>
          </label>
          <div className="space-y-2">
            <Label>Section title</Label>
            <Input
              value={trustedForm.sectionTitle}
              onChange={(e) => setTrustedForm((p) => ({ ...p, sectionTitle: e.target.value }))}
              placeholder="Trusted By Leading Organizations"
            />
          </div>
          <div className="space-y-2">
            <Label>Organization names</Label>
            <div className="space-y-2">
              {trustedForm.names.map((name, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={name}
                    onChange={(e) =>
                      setTrustedForm((p) => ({
                        ...p,
                        names: p.names.map((item, i) => (i === index ? e.target.value : item)),
                      }))
                    }
                    placeholder="Organization name"
                  />
                  <DashboardButton
                    type="button"
                    variant="outline"
                    className="shrink-0 px-3"
                    onClick={() =>
                      setTrustedForm((p) => ({
                        ...p,
                        names: p.names.filter((_, i) => i !== index),
                      }))
                    }
                    aria-label={`Remove ${name || "organization"}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </DashboardButton>
                </div>
              ))}
            </div>
            <DashboardButton
              type="button"
              variant="outline"
              onClick={() => setTrustedForm((p) => ({ ...p, names: [...p.names, ""] }))}
              disabled={trustedForm.names.length >= 40}
            >
              <Plus className="w-4 h-4" />
              Add organization
            </DashboardButton>
          </div>
          <DashboardButton
            onClick={handleSaveTrusted}
            disabled={isSavingTrusted}
            state={isSavingTrusted ? "loading" : undefined}
            className="w-full sm:w-auto"
          >
            <Save className="w-4 h-4" />
            {isSavingTrusted ? "Saving..." : hasUnsavedTrusted ? "Save trusted-by" : "Saved"}
          </DashboardButton>
        </div>
      </DashboardSection>

      {form.teamMemberId && linkedMember && linkedMember.isPublicFacing === false && (
        <div className="flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-950 dark:text-amber-100">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>
            <strong>{linkedMember.name}</strong> is not public-facing. The &quot;View profile&quot;
            button will not work until you feature them on{" "}
            <a href="/admin/cms/team" className="underline font-medium">
              CMS → Team
            </a>
            .
          </p>
        </div>
      )}

      <DashboardSection title="Visibility & section title">
        <div className="space-y-4">
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
        </div>
      </DashboardSection>

      <DashboardSection
        title="Director profile link"
        description={
          <>
            Link a partner or senior associate. Their public leadership title and profile at{" "}
            <code>/lawyers/[id]</code> are managed in CMS → Team.
          </>
        }
        icon={UserCircle2}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Team member</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.teamMemberId ?? ""}
              onChange={(e) => handleTeamChange(e.target.value)}
            >
              <option value="">— Manual entry (links to /lawyers directory) —</option>
              {leadershipTeam.map((member: Record<string, unknown>) => (
                <option
                  key={String(member._id ?? member.id)}
                  value={String(member._id ?? member.id)}
                >
                  {String(member.name ?? "")}
                  {member.isPublicFacing === false ? " (not public yet)" : ""} —{" "}
                  {resolvePublicTitle(member as { role?: string; leadershipTitle?: string | null })}
                </option>
              ))}
            </select>
            {leadershipTeam.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No partners or senior associates in this firm yet. Add staff in Admin → Users, then
                set their role.
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
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
                Auto-filled from the team member&apos;s leadership title when linked. Override here
                if needed.
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
        </div>
      </DashboardSection>

      <DashboardSection
        title="Message"
        description="The director's personal message displayed on the homepage."
      >
        <Textarea
          rows={6}
          value={form.message}
          onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
          placeholder="Write the director's message..."
          className="resize-y min-h-[140px]"
        />
      </DashboardSection>

      <DashboardSection
        title="Live preview"
        description={
          <>
            Matches the public homepage section at <code>/</code> (below the hero).
          </>
        }
      >
        <div className="rounded-xl border border-dashboard-border overflow-hidden bg-dashboard-neutral-soft/20 p-0 -mx-1 -mb-1">
          <DirectorMessageSection
            previewMode
            settings={{ director_message: form }}
            team={adminTeam}
          />
        </div>
      </DashboardSection>
    </PortalPageShell>
  );
}
