import { useState, useContext } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { PreviewContext } from "@/lib/convex-mock.tsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { User, Shield, MonitorSmartphone, Database, Upload, Trash2, KeyRound, ShieldAlert, MonitorX, Laptop, Smartphone, Download, ActivitySquare } from "lucide-react";
import { toast } from "sonner";
import { ROLE_LABELS } from "@/lib/lex-constants.ts";

export default function SharedProfilePage() {
  const preview = useContext(PreviewContext);
  const currentUserObj = useQuery(api.users.getCurrentUser, {});
  const allUsers = useQuery(api.users.listUsers, {});
  const user = allUsers?.find((u) => u._id === currentUserObj?.id);
  
  const sessions = useQuery(api.users.listSessions, { userId: user?._id });
  const revokeSession = useMutation(api.users.revokeSession);
  const updateProfile = useMutation(api.users.updateProfile);
  const changePassword = useMutation(api.users.changePassword);
  const toggle2FA = useMutation(api.users.toggle2FA);

  // States for General Profile
  const [profileForm, setProfileForm] = useState({ name: "", phone: "", bio: "" });
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);

  // Initialize form when user loads
  if (user && !isProfileLoaded) {
    setProfileForm({ name: user.name || "", phone: user.phone || "", bio: user.bio || "" });
    setIsProfileLoaded(true);
  }

  // States for Password Reset
  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });

  const handleSaveProfile = async () => {
    try {
      await updateProfile({ userId: user!._id, ...profileForm });
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
      await changePassword({ userId: user!._id, current: passwordForm.current, newPass: passwordForm.newPass });
      toast.success("Password changed successfully!");
      setPasswordForm({ current: "", newPass: "", confirm: "" });
    } catch {
      toast.error("Failed to change password");
    }
  };

  const handleToggle2FA = async () => {
    const isEnabling = !user?.twoFactorEnabled;
    try {
      await toggle2FA({ userId: user!._id, enabled: isEnabling });
      toast.success(`Two-Factor Authentication ${isEnabling ? "enabled" : "disabled"}!`);
    } catch {
      toast.error("Failed to update 2FA settings");
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeSession({ sessionId });
      toast.success("Session revoked successfully");
    } catch {
      toast.error("Failed to revoke session");
    }
  };

  const handleDataExport = () => {
    toast.success("A zip file containing your data is being generated and will download shortly.");
  };

  if (!user) return <div className="p-6">Loading profile...</div>;

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
          {/* GENERAL TAB */}
          <TabsContent value="general" className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <Card>
              <CardHeader>
                <CardTitle>Avatar</CardTitle>
                <CardDescription>This will be displayed on your profile and across the system.</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-accent/20 flex flex-col items-center justify-center border-2 border-dashed border-accent-foreground/20 overflow-hidden relative group">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-muted-foreground" />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm"><Upload className="w-4 h-4 mr-2" /> Upload new</Button>
                    <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Remove</Button>
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
                    <Input value={user.email} disabled className="bg-muted/50" />
                    <p className="text-xs text-muted-foreground">Contact an administrator to change your email address.</p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>System Role</Label>
                    <Input value={ROLE_LABELS[user.role as any] || user.role} disabled className="bg-muted/50" />
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

          {/* SECURITY TAB */}
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
                  onClick={handleToggle2FA}
                  className="shrink-0"
                >
                  {user.twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SESSIONS TAB */}
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

          {/* DATA TAB */}
          <TabsContent value="data" className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ActivitySquare className="w-5 h-5 text-primary" /> Activity Log</CardTitle>
                <CardDescription>Review recent security events and actions taken on your account.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { action: "Logged in successfully", date: "Today, 10:45 AM", ip: "192.168.1.12" },
                    { action: "Updated profile information", date: "Yesterday, 3:20 PM", ip: "192.168.1.12" },
                    { action: "Logged in successfully", date: "Jul 28, 9:15 AM", ip: "103.10.20.5" },
                  ].map((log, i) => (
                    <div key={i} className="flex flex-col sm:flex-row justify-between sm:items-center py-3 border-b border-border last:border-0 gap-1">
                      <div>
                        <p className="text-sm font-medium">{log.action}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">IP Address: {log.ip}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{log.date}</p>
                    </div>
                  ))}
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
                    Your export will include your profile information, case history, billing records, and audit logs in JSON format.
                  </p>
                  <Button variant="outline" onClick={handleDataExport} className="shrink-0 w-full sm:w-auto">
                    <Download className="w-4 h-4 mr-2" /> Request Archive
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </div>
      </Tabs>
    </div>
  );
}

// Temporary internal Badge component so we don't have to import it and risk conflict if not used
function Badge({ children, variant = "default", className = "" }: { children: React.ReactNode, variant?: string, className?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}