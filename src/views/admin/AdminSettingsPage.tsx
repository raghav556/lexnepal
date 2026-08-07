import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { toast } from "sonner";
import { useIdentityCommands, useRolePermissions, useSystemSettings } from "@/client/queries/identity";
import { Save, Settings, CreditCard, Globe, Layers, Blocks, MessageSquare, Wallet, Video, UploadCloud, Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { ROLE_LABELS } from "@/lib/lex-constants.ts";

const ALL_CAPABILITIES = [
  "users.manage",
  "users.view_directory",
  "clients.view_all",
  "clients.manage",
  "kyc.review",
  "cases.view_all",
  "cases.manage",
  "conflicts.manage",
  "finance.manage",
  "hr.manage",
  "cms.manage",
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
  "admin", "partner", "senior_associate", "associate", "paralegal", "intern", "client",
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
    defaultHourlyRate: "5000",
    vatRate: "13",
    invoicePaymentTerms: "14",
    defaultLanguage: "en",
    clientPortalEnabled: true,
    onlineBookingEnabled: true,
    defaultMeetingPlatform: "manual" as "manual" | "google_meet" | "zoom",
    integrations: {
      smsProvider: "none",
      smsKeys: { token: "", accountSid: "", authToken: "" },
      activePayments: ["bank_transfer"] as string[],
      paymentKeys: {
        esewaMerchantId: "",
        khaltiSecretKey: "",
        bankName: "",
        accountName: "",
        accountNumber: "",
        branch: "",
      },
    },
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData((prev) => ({
        ...prev,
        defaultHourlyRate: settings.defaultHourlyRate || "5000",
        vatRate: settings.vatRate || "13",
        invoicePaymentTerms: settings.invoicePaymentTerms || "14",
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
      // Persist only contracted system settings — do not pretend integrations blobs are saved.
      await updateSettings({
        defaultHourlyRate: formData.defaultHourlyRate,
        vatRate: formData.vatRate,
        invoicePaymentTerms: formData.invoicePaymentTerms,
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

  if (!settings) {
    return <div className="p-4 sm:p-6 text-muted-foreground">Loading settings...</div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">System Settings</h1>
          <p className="text-muted-foreground mt-1">Configure internal application behavior and defaults.</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-6 flex-wrap h-auto">
          <TabsTrigger value="general" className="gap-2"><Settings className="w-4 h-4" /> General Settings</TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2"><Blocks className="w-4 h-4" /> Integrations Hub</TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2"><Shield className="w-4 h-4" /> Role Permissions</TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit} className="space-y-6">
          <TabsContent value="general" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Billing & Financials
            </CardTitle>
            <CardDescription>Default values used when generating new invoices and tracking time.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Default Hourly Rate (NPR)</Label>
                <Input 
                  type="number" 
                  value={formData.defaultHourlyRate} 
                  onChange={(e) => setFormData({ ...formData, defaultHourlyRate: e.target.value })} 
                />
              </div>
              <div className="grid gap-2">
                <Label>VAT Rate (%)</Label>
                <Input 
                  type="number" 
                  value={formData.vatRate} 
                  disabled 
                  title="VAT rate is locked to standard Nepal rates."
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Invoice Payment Terms (Days)</Label>
              <Input 
                type="number" 
                value={formData.invoicePaymentTerms} 
                onChange={(e) => setFormData({ ...formData, invoicePaymentTerms: e.target.value })} 
              />
              <p className="text-xs text-muted-foreground">Number of days before an invoice is marked as overdue.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              Feature Toggles
            </CardTitle>
            <CardDescription>Enable or disable core system modules.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base">Client Portal Access</Label>
                <p className="text-sm text-muted-foreground">Allow clients to log in and view their case progress.</p>
              </div>
              <input 
                type="checkbox" 
                checked={formData.clientPortalEnabled}
                onChange={(e) => setFormData({ ...formData, clientPortalEnabled: e.target.checked })}
                className="w-5 h-5 accent-primary" 
              />
            </div>
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="space-y-0.5 pr-4">
                <Label className="text-base">Online Appointments</Label>
                <p className="text-sm text-muted-foreground">
                  Allow prospective clients to book from the public website. When off, public booking
                  is rejected by the API (HTTP 503). Linked client-portal booking is unchanged.
                </p>
              </div>
              <input 
                type="checkbox" 
                checked={formData.onlineBookingEnabled}
                onChange={(e) => setFormData({ ...formData, onlineBookingEnabled: e.target.checked })}
                className="w-5 h-5 accent-primary shrink-0" 
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Localization
            </CardTitle>
            <CardDescription>Default language and regional settings for new users.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="integrations" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              SMS Providers
            </CardTitle>
            <CardDescription>
              Appointment SMS alerts are not connected yet. Confirm / cancel / reschedule notices use
              email today (local Mailpit on development hosts only).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              Payment Gateways
            </CardTitle>
            <CardDescription>
              Local UI sketch for invoice methods. Gateway credentials are not persisted or charged
              through this form yet — billing uses its own payment flows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* eSewa */}
            <div className="space-y-4 p-4 border border-border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">eSewa Digital Wallet</Label>
                  <p className="text-sm text-muted-foreground">Allow clients to pay securely via eSewa.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={formData.integrations.activePayments.includes("esewa")}
                  onChange={(e) => {
                    const act = new Set(formData.integrations.activePayments);
                    e.target.checked ? act.add("esewa") : act.delete("esewa");
                    setFormData({ ...formData, integrations: { ...formData.integrations, activePayments: Array.from(act) } });
                  }}
                  className="w-5 h-5 accent-primary" 
                />
              </div>
              {formData.integrations.activePayments.includes("esewa") && (
                <div className="grid gap-2 mt-2">
                  <Label>eSewa Merchant ID</Label>
                  <Input 
                    placeholder="EPAYTEST"
                    value={formData.integrations.paymentKeys.esewaMerchantId}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      integrations: { ...formData.integrations, paymentKeys: { ...formData.integrations.paymentKeys, esewaMerchantId: e.target.value } }
                    })}
                  />
                </div>
              )}
            </div>

            {/* Khalti */}
            <div className="space-y-4 p-4 border border-border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Khalti Digital Wallet</Label>
                  <p className="text-sm text-muted-foreground">Allow clients to pay securely via Khalti.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={formData.integrations.activePayments.includes("khalti")}
                  onChange={(e) => {
                    const act = new Set(formData.integrations.activePayments);
                    e.target.checked ? act.add("khalti") : act.delete("khalti");
                    setFormData({ ...formData, integrations: { ...formData.integrations, activePayments: Array.from(act) } });
                  }}
                  className="w-5 h-5 accent-primary" 
                />
              </div>
              {formData.integrations.activePayments.includes("khalti") && (
                <div className="grid gap-2 mt-2">
                  <Label>Khalti Secret Key</Label>
                  <Input 
                    type="password"
                    placeholder="live_secret_key_..."
                    value={formData.integrations.paymentKeys.khaltiSecretKey}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      integrations: { ...formData.integrations, paymentKeys: { ...formData.integrations.paymentKeys, khaltiSecretKey: e.target.value } }
                    })}
                  />
                </div>
              )}
            </div>

            {/* Bank Transfer */}
            <div className="space-y-4 p-4 border border-border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Bank Transfer / QR Upload</Label>
                  <p className="text-sm text-muted-foreground">Display bank details and allow clients to upload payment receipts.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={formData.integrations.activePayments.includes("bank_transfer")}
                  onChange={(e) => {
                    const act = new Set(formData.integrations.activePayments);
                    e.target.checked ? act.add("bank_transfer") : act.delete("bank_transfer");
                    setFormData({ ...formData, integrations: { ...formData.integrations, activePayments: Array.from(act) } });
                  }}
                  className="w-5 h-5 accent-primary" 
                />
              </div>
              {formData.integrations.activePayments.includes("bank_transfer") && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="grid gap-2">
                    <Label>Bank Name</Label>
                    <Input 
                      placeholder="Nabil Bank Ltd."
                      value={formData.integrations.paymentKeys.bankName}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        integrations: { ...formData.integrations, paymentKeys: { ...formData.integrations.paymentKeys, bankName: e.target.value } }
                      })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Account Name</Label>
                    <Input 
                      placeholder="Srimar Law Law Firm"
                      value={formData.integrations.paymentKeys.accountName}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        integrations: { ...formData.integrations, paymentKeys: { ...formData.integrations.paymentKeys, accountName: e.target.value } }
                      })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Account Number</Label>
                    <Input 
                      placeholder="0123456789012"
                      value={formData.integrations.paymentKeys.accountNumber}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        integrations: { ...formData.integrations, paymentKeys: { ...formData.integrations.paymentKeys, accountNumber: e.target.value } }
                      })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>FONEPAY QR Image</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="file" 
                        accept="image/*"
                        className="cursor-pointer w-full text-muted-foreground"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            toast.message(
                              "QR upload is not connected yet — file was not stored.",
                            );
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              Online Meeting Platforms
            </CardTitle>
            <CardDescription>
              Preference for staff “Add meeting link” paste hints. Links are always entered manually —
              Meet/Zoom rooms are not auto-generated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              Saved with system settings and shown when confirming appointments. OAuth auto-create is
              not available.
            </p>
          </CardContent>
        </Card>
      </TabsContent>

        <div className="flex justify-end mt-6">
          <Button type="submit" disabled={isSaving} className="gap-2">
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save System Settings"}
          </Button>
        </div>
        </form>

        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Role Permission Matrix
              </CardTitle>
              <CardDescription>
                Capabilities enforced by <code className="text-xs">requirePermission</code>. Admins always retain full access.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {!rolePermissions ? (
                <p className="text-sm text-muted-foreground">Loading permissions…</p>
              ) : (
                <table className="w-full text-sm border-collapse min-w-[640px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-3 font-medium">Capability</th>
                      {MATRIX_ROLES.map((role) => (
                        <th key={role} className="text-center py-2 px-1 font-medium whitespace-nowrap">
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
                <Button
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
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
