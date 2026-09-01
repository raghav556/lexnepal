import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { toast } from "sonner";
import {
  useIdentityCommands,
  useRolePermissions,
  useSystemSettings,
} from "@/client/queries/identity";
import { Save, Settings, Globe, Layers, Blocks, MessageSquare, Video, Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { ROLE_LABELS } from "@/lib/lex-constants.ts";
import { DashboardButton, DashboardSection, PortalPageShell } from "@/components/dashboard";

const ALL_CAPABILITIES = [
  "users.manage",
  "users.view_directory",
  "clients.view_all",
  "clients.manage",
  "kyc.review",
  "cases.view_all",
  "cases.manage",
  "conflicts.manage",
  "hr.manage",
  "cms.manage",
  "cms.content_submit",
  "audit.view",
  "settings.manage",
  "documents.read",
  "documents.upload",
  "documents.share",
  "documents.delete",
  "records.dispose",
  "legalHold.manage",
] as const;

const MATRIX_ROLES = [
  "admin",
  "partner",
  "senior_associate",
  "associate",
  "paralegal",
  "intern",
  "client",
] as const;

export default function AdminSettingsPage() {
  const settings = useSystemSettings();
  const { updateSettings, updateRolePermissions } = useIdentityCommands();
  const rolePermissions = useRolePermissions();
  const [permMatrix, setPermMatrix] = useState<Record<string, string[]>>({});
  const [savingPerms, setSavingPerms] = useState(false);

  useEffect(() => {
    if (rolePermissions) setPermMatrix(rolePermissions as Record<string, string[]>);
  }, [rolePermissions]);

  const [formData, setFormData] = useState({
    defaultLanguage: "en",
    clientPortalEnabled: true,
    onlineBookingEnabled: true,
    defaultMeetingPlatform: "manual" as "manual" | "google_meet" | "zoom",
    integrations: {
      smsProvider: "none",
      smsKeys: { token: "", accountSid: "", authToken: "" },
    },
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData((prev) => ({
        ...prev,
        defaultLanguage: settings.defaultLanguage || "en",
        clientPortalEnabled: settings.clientPortalEnabled ?? true,
        onlineBookingEnabled: settings.onlineBookingEnabled ?? true,
        defaultMeetingPlatform: settings.defaultMeetingPlatform ?? "manual",
      }));
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Persist only validated, tenant-scoped settings. Provider secrets stay server-side.
      await updateSettings({
        defaultLanguage: formData.defaultLanguage as "en" | "ne",
        clientPortalEnabled: formData.clientPortalEnabled,
        onlineBookingEnabled: formData.onlineBookingEnabled,
        defaultMeetingPlatform: formData.defaultMeetingPlatform,
      });
      toast.success("System settings updated successfully.");
    } catch {
      toast.error("Failed to update system settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PortalPageShell
      portal="admin"
      loading={!settings}
      loadingLabel="Loading settings…"
      eyebrow="System administration"
      title="System settings"
      description="Configure internal application behavior and defaults."
      icon={Settings}
      contentClassName="max-w-4xl mx-auto"
    >
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-6 flex-wrap h-auto">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="w-4 h-4" /> General Settings
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Blocks className="w-4 h-4" /> Integrations Hub
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2">
            <Shield className="w-4 h-4" /> Role Permissions
          </TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit} className="space-y-6">
          <TabsContent value="general" className="space-y-6">
            <DashboardSection
              title="Feature toggles"
              description="Enable or disable core system modules."
              icon={Layers}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-base">Client Portal Access</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow clients to log in and view their case progress.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.clientPortalEnabled}
                    onChange={(e) =>
                      setFormData({ ...formData, clientPortalEnabled: e.target.checked })
                    }
                    className="w-5 h-5 accent-primary"
                  />
                </div>
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="space-y-0.5 pr-4">
                    <Label className="text-base">Online Appointments</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow prospective clients to book from the public website. When off, public
                      booking is rejected by the API (HTTP 503). Linked client-portal booking is
                      unchanged.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.onlineBookingEnabled}
                    onChange={(e) =>
                      setFormData({ ...formData, onlineBookingEnabled: e.target.checked })
                    }
                    className="w-5 h-5 accent-primary shrink-0"
                  />
                </div>
              </div>
            </DashboardSection>

            <DashboardSection
              title="Localization"
              description="Default language and regional settings for new users."
              icon={Globe}
            >
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>System Default Language</Label>
                  <select
                    value={formData.defaultLanguage}
                    onChange={(e) => setFormData({ ...formData, defaultLanguage: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="en">English</option>
                    <option value="ne">Nepali (नेपाली)</option>
                  </select>
                </div>
              </div>
            </DashboardSection>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <DashboardSection
              title="SMS providers"
              description="Appointment SMS alerts are not connected yet. Confirm / cancel / reschedule notices use email today (local Mailpit on development hosts only)."
              icon={MessageSquare}
            >
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground space-y-2">
                  <p className="font-medium text-foreground">
                    Coming later — do not enter provider tokens expecting delivery.
                  </p>
                  <p>
                    Sparrow / Aakash / Twilio wiring for appointment reminders is deferred. Saving
                    Settings will not enable SMS.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>Active Provider</Label>
                  <select
                    disabled
                    value="none"
                    className="flex h-10 w-full rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
                  >
                    <option value="none">None (SMS disabled)</option>
                  </select>
                </div>
              </div>
            </DashboardSection>

            <DashboardSection
              title="Online meeting platforms"
              description="Preference for staff “Add meeting link” paste hints. Links are always entered manually — Meet/Zoom rooms are not auto-generated."
              icon={Video}
            >
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>Default platform hint</Label>
                  <select
                    value={formData.defaultMeetingPlatform}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        defaultMeetingPlatform: e.target.value as "manual" | "google_meet" | "zoom",
                      })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="manual">Manual / any URL</option>
                    <option value="google_meet">Google Meet (paste hint)</option>
                    <option value="zoom">Zoom (paste hint)</option>
                  </select>
                </div>
                <p className="text-sm text-muted-foreground">
                  Saved with system settings and shown when confirming appointments. OAuth
                  auto-create is not available.
                </p>
              </div>
            </DashboardSection>
          </TabsContent>

          <div className="flex justify-end mt-6">
            <DashboardButton type="submit" disabled={isSaving} className="gap-2">
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save System Settings"}
            </DashboardButton>
          </div>
        </form>

        <TabsContent value="permissions" className="space-y-6">
          <DashboardSection
            title="Role permission matrix"
            description={
              <>
                Capabilities enforced by <code className="text-xs">requirePermission</code>. Admins
                always retain full access.
              </>
            }
            icon={Shield}
          >
            <div className="overflow-x-auto">
              {!rolePermissions ? (
                <p className="text-sm text-muted-foreground">Loading permissions…</p>
              ) : (
                <table className="w-full text-sm border-collapse min-w-[640px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-3 font-medium">Capability</th>
                      {MATRIX_ROLES.map((role) => (
                        <th
                          key={role}
                          className="text-center py-2 px-1 font-medium whitespace-nowrap"
                        >
                          {ROLE_LABELS[role] || role}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ALL_CAPABILITIES.map((cap) => (
                      <tr key={cap} className="border-b border-border/60">
                        <td className="py-2 pr-3 font-mono text-xs">{cap}</td>
                        {MATRIX_ROLES.map((role) => {
                          const checked = (permMatrix[role] || []).includes(cap);
                          const locked = role === "admin";
                          return (
                            <td key={role} className="text-center py-2 px-1">
                              <input
                                type="checkbox"
                                disabled={locked}
                                checked={locked || checked}
                                onChange={() => {
                                  if (locked) return;
                                  setPermMatrix((prev) => {
                                    const current = new Set(prev[role] || []);
                                    if (current.has(cap)) current.delete(cap);
                                    else current.add(cap);
                                    return { ...prev, [role]: Array.from(current) };
                                  });
                                }}
                                className="accent-primary"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="flex justify-end mt-4">
                <DashboardButton
                  disabled={savingPerms || !rolePermissions}
                  className="gap-2"
                  onClick={async () => {
                    setSavingPerms(true);
                    try {
                      const withAdmin = {
                        ...permMatrix,
                        admin: [...ALL_CAPABILITIES],
                      };
                      await updateRolePermissions(withAdmin as any);
                      toast.success("Role permissions saved.");
                    } catch {
                      toast.error("Failed to save permissions.");
                    } finally {
                      setSavingPerms(false);
                    }
                  }}
                >
                  <Save className="w-4 h-4" />
                  {savingPerms ? "Saving…" : "Save Permissions"}
                </DashboardButton>
              </div>
            </div>
          </DashboardSection>
        </TabsContent>
      </Tabs>
    </PortalPageShell>
  );
}
