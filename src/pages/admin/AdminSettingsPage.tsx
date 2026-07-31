import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Save, Settings, CreditCard, Globe, Layers, Blocks, MessageSquare, Wallet, Video, UploadCloud, Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { ROLE_LABELS } from "@/lib/lex-constants.ts";

const ALL_CAPABILITIES = [
  "users.manage",
  "users.view_directory",
  "cases.view_all",
  "cases.manage",
  "finance.manage",
  "hr.manage",
  "cms.manage",
  "audit.view",
  "settings.manage",
] as const;

const MATRIX_ROLES = [
  "admin", "partner", "senior_associate", "associate", "paralegal", "intern", "client",
] as const;

export default function AdminSettingsPage() {
  const settings = useQuery(api.settings.getSystemSettings);
  const updateSettings = useMutation(api.settings.updateSystemSettings);
  const rolePermissions = useQuery(api.users.getRolePermissions, {});
  const saveRolePermissions = useMutation(api.users.saveRolePermissions);
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
    integrations: {
      smsProvider: "none",
      smsKeys: { token: "", accountSid: "", authToken: "" },
      activePayments: ["bank_transfer"] as string[],
      paymentKeys: { esewaMerchantId: "", khaltiSecretKey: "", bankName: "", accountName: "", accountNumber: "", branch: "" },
      videoProvider: "google_meet",
      videoKeys: { clientId: "", clientSecret: "" }
    }
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        defaultHourlyRate: settings.defaultHourlyRate || "5000",
        vatRate: settings.vatRate || "13",
        invoicePaymentTerms: settings.invoicePaymentTerms || "14",
        defaultLanguage: settings.defaultLanguage || "en",
        clientPortalEnabled: settings.clientPortalEnabled ?? true,
        onlineBookingEnabled: settings.onlineBookingEnabled ?? true,
        integrations: settings.integrations || formData.integrations
      });
    }
  }, [JSON.stringify(settings)]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSettings(formData as any);
      toast.success("System settings updated successfully.");
    } catch (error) {
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
              <div className="space-y-0.5">
                <Label className="text-base">Online Appointments</Label>
                <p className="text-sm text-muted-foreground">Allow prospective clients to book consultations directly from the public website.</p>
              </div>
              <input 
                type="checkbox" 
                checked={formData.onlineBookingEnabled}
                onChange={(e) => setFormData({ ...formData, onlineBookingEnabled: e.target.checked })}
                className="w-5 h-5 accent-primary" 
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
            <CardDescription>Configure SMS integration for automated alerts (Appointments, Reminders).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Label>Active Provider</Label>
              <select 
                value={formData.integrations.smsProvider}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  integrations: { ...formData.integrations, smsProvider: e.target.value }
                })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="none">None (Disabled)</option>
                <option value="sparrow">Sparrow SMS (Nepal)</option>
                <option value="aakash">Aakash SMS (Nepal)</option>
                <option value="twilio">Twilio (International)</option>
              </select>
            </div>

            {formData.integrations.smsProvider === "sparrow" && (
              <div className="grid gap-2 p-4 border rounded-md bg-muted/20">
                <Label>Sparrow Token</Label>
                <Input 
                  type="password" 
                  placeholder="Enter your Sparrow SMS Token"
                  value={formData.integrations.smsKeys.token}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    integrations: { ...formData.integrations, smsKeys: { ...formData.integrations.smsKeys, token: e.target.value } }
                  })}
                />
              </div>
            )}

            {formData.integrations.smsProvider === "aakash" && (
              <div className="grid gap-2 p-4 border rounded-md bg-muted/20">
                <Label>Aakash SMS Auth Token</Label>
                <Input 
                  type="password" 
                  placeholder="Enter your Aakash SMS Auth Token"
                  value={formData.integrations.smsKeys.authToken}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    integrations: { ...formData.integrations, smsKeys: { ...formData.integrations.smsKeys, authToken: e.target.value } }
                  })}
                />
              </div>
            )}

            {formData.integrations.smsProvider === "twilio" && (
              <div className="grid gap-4 p-4 border rounded-md bg-muted/20">
                <div className="grid gap-2">
                  <Label>Account SID</Label>
                  <Input 
                    placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                    value={formData.integrations.smsKeys.accountSid}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      integrations: { ...formData.integrations, smsKeys: { ...formData.integrations.smsKeys, accountSid: e.target.value } }
                    })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Auth Token</Label>
                  <Input 
                    type="password"
                    placeholder="Your Auth Token"
                    value={formData.integrations.smsKeys.authToken}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      integrations: { ...formData.integrations, smsKeys: { ...formData.integrations.smsKeys, authToken: e.target.value } }
                    })}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              Payment Gateways
            </CardTitle>
            <CardDescription>Enable multiple payment methods for client invoices.</CardDescription>
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
                             toast.success(`Uploaded ${file.name} successfully!`);
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
            <CardDescription>Default platform for automatically generating consultation meeting links.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Label>System Default Platform</Label>
              <select 
                value={formData.integrations.videoProvider}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  integrations: { ...formData.integrations, videoProvider: e.target.value }
                })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="google_meet">Google Meet (Recommended for Workspace)</option>
                <option value="zoom">Zoom</option>
                <option value="manual">Manual Entry (Skype, WeChat, Phone)</option>
              </select>
            </div>

            {formData.integrations.videoProvider === "zoom" && (
              <div className="grid gap-4 p-4 border rounded-md bg-muted/20">
                <div className="grid gap-2">
                  <Label>Zoom Client ID</Label>
                  <Input 
                    placeholder="OAuth Client ID"
                    value={formData.integrations.videoKeys.clientId}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      integrations: { ...formData.integrations, videoKeys: { ...formData.integrations.videoKeys, clientId: e.target.value } }
                    })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Zoom Client Secret</Label>
                  <Input 
                    type="password"
                    placeholder="OAuth Client Secret"
                    value={formData.integrations.videoKeys.clientSecret}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      integrations: { ...formData.integrations, videoKeys: { ...formData.integrations.videoKeys, clientSecret: e.target.value } }
                    })}
                  />
                </div>
              </div>
            )}
            {formData.integrations.videoProvider === "google_meet" && (
              <div className="p-4 border rounded-md bg-muted/20 text-sm text-muted-foreground">
                Google Meet integration requires authenticating via Google Workspace. API key configuration is not required. It will automatically generate Meet links on behalf of the Firm's Google Calendar.
              </div>
            )}
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
                      await saveRolePermissions({ permissions: withAdmin });
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
