import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { User, Shield, MonitorSmartphone, Database, Upload, Trash2, KeyRound, ShieldAlert, MonitorX, Laptop, Smartphone, Download, ActivitySquare } from "lucide-react";
import { toast } from "sonner";
import { ROLE_LABELS } from "@/lib/lex-constants.ts";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

export default function SharedProfilePage() {
  const user = useQuery(api.users.getCurrentUser, {});

  const sessions = useQuery(api.users.listMySessions, {});
  const auditLog = useQuery(api.users.getMyAuditLog, {});

  const revokeSession = useMutation(api.users.revokeSession);
  const updateOwnProfile = useMutation(api.users.updateOwnProfile);
  const changePassword = useMutation(api.users.changePassword);
  const generateAvatarUploadUrl = useMutation(api.users.generateAvatarUploadUrl);
  const setAvatarFromStorage = useMutation(api.users.setAvatarFromStorage);
  const beginTotpEnrollment = useMutation(api.users.beginTotpEnrollment);
  const confirmTotpEnrollment = useMutation(api.users.confirmTotpEnrollment);
  const disableTotp = useMutation(api.users.disableTotp);

  const [profileForm, setProfileForm] = useState({ name: "", phone: "", bio: "" });
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });

  const [totpDialogOpen, setTotpDialogOpen] = useState(false);
  const [totpEnrollment, setTotpEnrollment] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [totpCode, setTotpCode] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user && !isProfileLoaded) {
      setProfileForm({ name: user.name || "", phone: user.phone || "", bio: user.bio || "" });
      setIsProfileLoaded(true);
    }
  }, [user, isProfileLoaded]);

  const handleSaveProfile = async () => {
    try {
      await updateOwnProfile({
        name: profileForm.name,
        phone: profileForm.phone || undefined,
        bio: profileForm.bio || undefined,
      });
      toast.success("Profile updated successfully!");
    } catch {
      toast.error("Failed to update profile");
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPass !== passwordForm.confirm) {
      toast.error("New passwords do not match!");
      return;
    }
    if (passwordForm.newPass.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    try {
      await changePassword({ currentPassword: passwordForm.current, newPassword: passwordForm.newPass });
      toast.success("Password changed successfully!");
      setPasswordForm({ current: "", newPass: "", confirm: "" });
    } catch (err: any) {
      toast.error(err?.message || "Failed to change password");
    }
  };

  const handleBegin2FA = async () => {
    try {
      const result = await beginTotpEnrollment({});
      setTotpEnrollment(result);
      setTotpCode("");
      setTotpDialogOpen(true);
    } catch {
      toast.error("Failed to start 2FA enrollment");
    }
  };

  const handleConfirm2FA = async () => {
    try {
      await confirmTotpEnrollment({ code: totpCode });
      toast.success("Two-Factor Authentication enabled!");
      setTotpDialogOpen(false);
      setTotpEnrollment(null);
    } catch {
      toast.error("Invalid authenticator code");
    }
  };

  const handleDisable2FA = async () => {
    const code = window.prompt("Enter your authenticator code to disable 2FA:");
    if (!code) return;
    try {
      await disableTotp({ code });
      toast.success("Two-Factor Authentication disabled");
    } catch {
      toast.error("Invalid authenticator code");
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      const uploadUrl = await generateAvatarUploadUrl({});
      let storageId: string;
      if (typeof uploadUrl === "string" && uploadUrl.startsWith("mock-upload-url")) {
        storageId = uploadUrl.replace("mock-upload-url-", "mock_");
      } else {
        const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
        ({ storageId } = await res.json());
      }
      await setAvatarFromStorage({ storageId });
      toast.success("Avatar updated");
    } catch {
      toast.error("Failed to upload avatar");
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await updateOwnProfile({ avatar: "" });
      toast.success("Avatar removed");
    } catch {
      toast.error("Failed to remove avatar");
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeSession({ sessionId: sessionId as Id<"sessions"> });
      toast.success("Session revoked successfully");
    } catch {
      toast.error("Failed to revoke session");
    }
  };

  const handleDataExport = () => {
    if (!user) return;
    const exportData = {
      profile: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        bio: user.bio,
        barCouncilNumber: user.barCouncilNumber,
        practiceAreas: user.practiceAreas,
        lastLoginAt: user.lastLoginAt,
      },
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `profile-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Profile data downloaded");
  };

  if (user === undefined) return <div className="p-6">Loading profile...</div>;
  if (user === null) return <div className="p-6">Not signed in.</div>;

  const isLawyer = ['partner', 'senior_associate', 'associate', 'paralegal'].includes(user.role);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-foreground">My Profile & Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">Manage your personal information, security, and account preferences.</p>
      </div>

      <Tabs defaultValue="general" className="w-full flex flex-col md:flex-row gap-6">
        <TabsList className="flex md:flex-col h-auto bg-transparent p-0 space-y-1 w-full md:w-56 overflow-x-auto justify-start border-b md:border-b-0 border-border pb-2 md:pb-0 shrink-0">
          <TabsTrigger value="general" className="md:w-full justify-start gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary px-4 py-2.5">
            <User className="w-4 h-4" /> General
          </TabsTrigger>
          <TabsTrigger value="security" className="md:w-full justify-start gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary px-4 py-2.5">
            <Shield className="w-4 h-4" /> Security
          </TabsTrigger>
          <TabsTrigger value="sessions" className="md:w-full justify-start gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary px-4 py-2.5">
            <MonitorSmartphone className="w-4 h-4" /> Active Sessions
          </TabsTrigger>
          <TabsTrigger value="data" className="md:w-full justify-start gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary px-4 py-2.5">
            <Database className="w-4 h-4" /> Data & Privacy
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-w-0">
          <TabsContent value="general" className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <Card>
              <CardHeader>
                <CardTitle>Avatar</CardTitle>
                <CardDescription>This will be displayed on your profile and across the system.</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-accent/20 flex flex-col items-center justify-center border-2 border-dashed border-accent-foreground/20 overflow-hidden relative group">
                  {user.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-muted-foreground" />
                  )}
                  <div
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-2" /> Upload new
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={handleRemoveAvatar}>
                      <Trash2 className="w-4 h-4 mr-2" /> Remove
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Recommended: Square JPG, PNG, or GIF, at least 400x400px.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your basic contact details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} placeholder="+977..." />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Email Address</Label>
                    <Input value={user.email ?? ""} disabled className="bg-muted/50" />
                    <p className="text-xs text-muted-foreground">Contact an administrator to change your email address.</p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>System Role</Label>
                    <Input value={ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role} disabled className="bg-muted/50" />
                  </div>
                </div>

                {isLawyer && (
                  <div className="space-y-2 pt-4 border-t border-border mt-4">
                    <Label>Professional Biography</Label>
                    <Textarea
                      rows={5}
                      placeholder="Enter a professional bio..."
                      value={profileForm.bio}
                      onChange={e => setProfileForm({...profileForm, bio: e.target.value})}
                    />
                    <p className="text-xs text-muted-foreground">This biography may be visible on the firm's public-facing website.</p>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveProfile}>Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5 text-primary" /> Change Password</CardTitle>
                <CardDescription>Ensure your account is using a long, random password to stay secure.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label>Current Password</Label>
                    <Input type="password" value={passwordForm.current} onChange={e => setPasswordForm({...passwordForm, current: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <Input type="password" value={passwordForm.newPass} onChange={e => setPasswordForm({...passwordForm, newPass: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm New Password</Label>
                    <Input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})} required />
                  </div>
                  <Button type="submit">Update Password</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-primary" /> Two-Factor Authentication</CardTitle>
                <CardDescription>Add an extra layer of security to your account using an authenticator app.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6 bg-muted/30 rounded-xl border border-border mx-0 sm:mx-6 mb-6">
                <div>
                  <h4 className="font-medium text-foreground">Authenticator App (TOTP)</h4>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    {user.twoFactorEnabled
                      ? "Two-factor authentication is currently enabled on your account."
                      : "Protect your account from unauthorized access even if your password is compromised."}
                  </p>
                </div>
                <Button
                  variant={user.twoFactorEnabled ? "destructive" : "default"}
                  onClick={user.twoFactorEnabled ? handleDisable2FA : handleBegin2FA}
                  className="shrink-0"
                >
                  {user.twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions" className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <Card>
              <CardHeader>
                <CardTitle>Active Sessions</CardTitle>
                <CardDescription>These are the devices that have logged into your account. Revoke any sessions that you do not recognize.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {sessions?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No active sessions found.</p>
                ) : (
                  sessions?.map((session: any) => (
                    <div key={session._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border border-border rounded-xl bg-card">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-full ${session.isCurrent ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-muted text-muted-foreground'}`}>
                          {session.device.toLowerCase().includes('phone') ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm flex items-center gap-2">
                            {session.device} - {session.browser}
                            {session.isCurrent && <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-200">Current Session</Badge>}
                          </p>
                          <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                            <span>IP: {session.ipAddress}</span>
                            <span>&bull;</span>
                            <span>{session.isCurrent ? "Active now" : `Last active: ${new Date(session.lastActive).toLocaleString()}`}</span>
                          </div>
                        </div>
                      </div>
                      {!session.isCurrent && (
                        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 shrink-0 w-full sm:w-auto" onClick={() => handleRevokeSession(session._id)}>
                          <MonitorX className="w-4 h-4 mr-2" /> Revoke
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ActivitySquare className="w-5 h-5 text-primary" /> Activity Log</CardTitle>
                <CardDescription>Review recent security events and actions taken on your account.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {auditLog === undefined ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : auditLog.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No activity recorded.</p>
                  ) : (
                    auditLog.map((log: any) => (
                      <div key={log._id} className="flex flex-col sm:flex-row justify-between sm:items-center py-3 border-b border-border last:border-0 gap-1">
                        <div>
                          <p className="text-sm font-medium">{log.action}{log.details ? `: ${log.details}` : ""}</p>
                          {log.ipAddress && <p className="text-xs text-muted-foreground mt-0.5">IP Address: {log.ipAddress}</p>}
                        </div>
                        <p className="text-xs text-muted-foreground">{new Date(log._creationTime).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Download className="w-5 h-5 text-primary" /> Export Data</CardTitle>
                <CardDescription>Download a copy of your personal data for your own records or GDPR compliance.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-muted/30 rounded-xl border border-border">
                  <p className="text-sm text-muted-foreground max-w-[70%]">
                    Your export will include your profile information in JSON format.
                  </p>
                  <Button variant="outline" onClick={handleDataExport} className="shrink-0 w-full sm:w-auto">
                    <Download className="w-4 h-4 mr-2" /> Download Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      <Dialog open={totpDialogOpen} onOpenChange={setTotpDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Up Authenticator</DialogTitle>
          </DialogHeader>
          {totpEnrollment && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">Scan this secret in your authenticator app, or enter it manually:</p>
              <code className="block p-3 bg-muted rounded text-xs break-all">{totpEnrollment.secret}</code>
              <p className="text-xs text-muted-foreground break-all">URI: {totpEnrollment.otpauthUrl}</p>
              <div className="space-y-2">
                <Label>Verification Code</Label>
                <Input value={totpCode} onChange={(e) => setTotpCode(e.target.value)} placeholder="6-digit code" maxLength={6} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTotpDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirm2FA}>Confirm & Enable</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Badge({ children, variant = "default", className = "" }: { children: React.ReactNode, variant?: string, className?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}
