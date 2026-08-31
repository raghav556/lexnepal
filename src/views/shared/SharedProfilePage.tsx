"use client";

import { useEffect, useRef, useState } from "react";
import {
  useCurrentIdentityUser,
  useOwnAuditEvents,
  useProfileCommands,
  useSessions,
} from "@/client/queries/identity";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import {
  User,
  Shield,
  MonitorSmartphone,
  Database,
  Upload,
  Trash2,
  KeyRound,
  ShieldAlert,
  Download,
  ActivitySquare,
} from "lucide-react";
import { toast } from "sonner";
import { ROLE_LABELS } from "@/lib/lex-constants.ts";
import { ProfileLoadingSkeleton } from "@/components/auth/AuthLoadingSkeleton";
import { ProfileHero } from "@/views/shared/profile/ProfileHero";
import { ClientProfileExtras } from "@/views/shared/profile/ClientProfileExtras";
import { StaffProfileExtras } from "@/views/shared/profile/StaffProfileExtras";
import { AdminProfileExtras } from "@/views/shared/profile/AdminProfileExtras";
import type { ProfileVariant } from "@/views/shared/profile/profile-types";
import { PasswordConfirmDialog } from "@/components/auth/PasswordConfirmDialog";
import { TotpEnrollmentPanel } from "@/components/auth/TotpEnrollmentPanel";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { SessionListPanel } from "@/components/auth/SessionListPanel";
import { DashboardButton, DashboardSection, DashboardStatusLabel } from "@/components/dashboard";
import { usePagination } from "@/hooks/use-pagination.ts";
import { Pagination } from "@/components/ui/pagination.tsx";
import type { TotpEnrollmentPayload } from "@/shared/auth/totp";

type SharedProfilePageProps = {
  variant: ProfileVariant;
};

type MfaPasswordMode = "enable" | "disable" | null;

export default function SharedProfilePage({ variant }: SharedProfilePageProps) {
  const user = useCurrentIdentityUser();
  const { signout } = useAuth();
  const sessions = useSessions(user?.id);
  const auditLog = useOwnAuditEvents();
  const {
    revokeSession,
    revokeAllOtherSessions,
    updateProfile,
    changePassword,
    uploadAvatar,
    removeAvatar,
    beginTotp,
    confirmTotp,
    disableTotp,
  } = useProfileCommands();

  const [profileForm, setProfileForm] = useState({ name: "", phone: "", bio: "" });
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });

  const [mfaPasswordMode, setMfaPasswordMode] = useState<MfaPasswordMode>(null);
  const [mfaPasswordBusy, setMfaPasswordBusy] = useState(false);
  const [totpDialogOpen, setTotpDialogOpen] = useState(false);
  const [totpEnrollment, setTotpEnrollment] = useState<TotpEnrollmentPayload | null>(null);
  const [totpBusy, setTotpBusy] = useState(false);
  const [sessionsBusy, setSessionsBusy] = useState(false);

  const {
    paginatedItems: paginatedAuditLogs,
    currentPage: auditPage,
    totalPages: auditTotalPages,
    goToPage: auditGoToPage,
    nextPage: auditNextPage,
    prevPage: auditPrevPage,
  } = usePagination({ items: auditLog || [], itemsPerPage: 6 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user && !isProfileLoaded) {
      setProfileForm({ name: user.name || "", phone: user.phone || "", bio: user.bio || "" });
      setIsProfileLoaded(true);
    }
  }, [user, isProfileLoaded]);

  const handleSaveProfile = async () => {
    try {
      await updateProfile({
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
      await changePassword(passwordForm.current, passwordForm.newPass);
      toast.success("Password changed successfully!");
      setPasswordForm({ current: "", newPass: "", confirm: "" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    }
  };

  const handleMfaPasswordConfirm = async (password: string) => {
    setMfaPasswordBusy(true);
    try {
      if (mfaPasswordMode === "enable") {
        const result = await beginTotp(password);
        setTotpEnrollment(result);
        setMfaPasswordMode(null);
        setTotpDialogOpen(true);
      } else if (mfaPasswordMode === "disable") {
        await disableTotp(password);
        toast.success("Two-Factor Authentication disabled");
        setMfaPasswordMode(null);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setMfaPasswordBusy(false);
    }
  };

  const handleConfirm2FA = async (code: string) => {
    setTotpBusy(true);
    try {
      await confirmTotp(code);
      toast.success("Two-Factor Authentication enabled!");
      setTotpDialogOpen(false);
      setTotpEnrollment(null);
    } catch {
      toast.error("Invalid authenticator code");
    } finally {
      setTotpBusy(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      await uploadAvatar(file);
      toast.success("Avatar uploaded and queued for malware scanning");
    } catch {
      toast.error("Failed to upload avatar");
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await removeAvatar();
      toast.success("Avatar removed");
    } catch {
      toast.error("Failed to remove avatar");
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setSessionsBusy(true);
    try {
      await revokeSession(sessionId);
      toast.success("Session revoked successfully");
    } catch {
      toast.error("Failed to revoke session");
    } finally {
      setSessionsBusy(false);
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    if (!user) return;
    setSessionsBusy(true);
    try {
      const result = await revokeAllOtherSessions(user.id);
      toast.success(
        result.revoked > 0
          ? `Signed out of ${result.revoked} other device${result.revoked === 1 ? "" : "s"}`
          : "No other active sessions to revoke",
      );
    } catch {
      toast.error("Failed to revoke other sessions");
    } finally {
      setSessionsBusy(false);
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
        practiceAreas: (user as typeof user & { practiceAreas?: string[] }).practiceAreas,
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

  if (user === undefined) return <ProfileLoadingSkeleton />;
  if (user === null) return <div className="p-6">Not signed in.</div>;

  const isLawyer = ["partner", "senior_associate", "associate", "paralegal"].includes(user.role);

  const portalExtras =
    variant === "client" ? (
      <ClientProfileExtras />
    ) : variant === "staff" ? (
      <StaffProfileExtras user={user} />
    ) : (
      <AdminProfileExtras user={user} />
    );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <ProfileHero user={user} variant={variant} onSignOut={signout} />
      {portalExtras}

      <Tabs defaultValue="general" className="w-full flex flex-col md:flex-row gap-6">
        <TabsList className="flex md:flex-col h-auto bg-transparent p-0 space-y-1 w-full md:w-56 overflow-x-auto justify-start border-b md:border-b-0 border-dashboard-border pb-2 md:pb-0 shrink-0">
          <TabsTrigger
            value="general"
            className="md:w-full justify-start gap-2.5 rounded-xl border border-transparent px-4 py-2.5 text-xs font-semibold text-dashboard-neutral transition-all data-[state=active]:border-dashboard-primary/30 data-[state=active]:bg-dashboard-primary-soft data-[state=active]:text-dashboard-primary hover:text-foreground hover:bg-dashboard-panel-hover"
          >
            <User className="w-4 h-4" /> General
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="md:w-full justify-start gap-2.5 rounded-xl border border-transparent px-4 py-2.5 text-xs font-semibold text-dashboard-neutral transition-all data-[state=active]:border-dashboard-primary/30 data-[state=active]:bg-dashboard-primary-soft data-[state=active]:text-dashboard-primary hover:text-foreground hover:bg-dashboard-panel-hover"
          >
            <Shield className="w-4 h-4" /> Security
          </TabsTrigger>
          <TabsTrigger
            value="sessions"
            className="md:w-full justify-start gap-2.5 rounded-xl border border-transparent px-4 py-2.5 text-xs font-semibold text-dashboard-neutral transition-all data-[state=active]:border-dashboard-primary/30 data-[state=active]:bg-dashboard-primary-soft data-[state=active]:text-dashboard-primary hover:text-foreground hover:bg-dashboard-panel-hover"
          >
            <MonitorSmartphone className="w-4 h-4" /> Active Sessions
          </TabsTrigger>
          <TabsTrigger
            value="data"
            className="md:w-full justify-start gap-2.5 rounded-xl border border-transparent px-4 py-2.5 text-xs font-semibold text-dashboard-neutral transition-all data-[state=active]:border-dashboard-primary/30 data-[state=active]:bg-dashboard-primary-soft data-[state=active]:text-dashboard-primary hover:text-foreground hover:bg-dashboard-panel-hover"
          >
            <Database className="w-4 h-4" /> Data & Privacy
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-w-0">
          <TabsContent
            value="general"
            className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-2"
          >
            <DashboardSection
              title="Avatar"
              description="This will be displayed on your profile and across the system."
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="w-24 h-24 rounded-2xl bg-dashboard-neutral-soft flex flex-col items-center justify-center border-2 border-dashed border-dashboard-border overflow-hidden relative group shrink-0">
                  {user.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-dashboard-neutral" />
                  )}
                  <div
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <DashboardButton
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-1.5" /> Upload new
                    </DashboardButton>
                    <DashboardButton
                      variant="ghost"
                      size="sm"
                      className="text-dashboard-danger hover:bg-dashboard-danger-soft"
                      onClick={handleRemoveAvatar}
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" /> Remove
                    </DashboardButton>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Recommended: Square JPG, PNG, or GIF, at least 400x400px.
                  </p>
                </div>
              </div>
            </DashboardSection>

            <DashboardSection
              title="Personal Information"
              description="Update your basic contact details."
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Full Name</Label>
                    <Input
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="border-dashboard-border bg-dashboard-panel"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Phone Number</Label>
                    <Input
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      placeholder="+977..."
                      className="border-dashboard-border bg-dashboard-panel"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs font-semibold text-foreground">Email Address</Label>
                    <Input
                      value={user.email ?? ""}
                      disabled
                      className="border-dashboard-border bg-dashboard-neutral-soft/50 text-muted-foreground"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Contact an administrator to change your email address.
                    </p>
                  </div>
                  {variant !== "client" ? (
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-xs font-semibold text-foreground">System Role</Label>
                      <Input
                        value={ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role}
                        disabled
                        className="border-dashboard-border bg-dashboard-neutral-soft/50 text-muted-foreground"
                      />
                    </div>
                  ) : null}
                </div>

                {isLawyer && variant === "staff" && (
                  <div className="space-y-1.5 pt-4 border-t border-dashboard-border mt-4">
                    <Label className="text-xs font-semibold text-foreground">
                      Professional Biography
                    </Label>
                    <Textarea
                      rows={4}
                      placeholder="Enter a professional bio..."
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                      className="border-dashboard-border bg-dashboard-panel"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      This biography may be visible on the firm&apos;s public-facing website.
                    </p>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <DashboardButton onClick={handleSaveProfile}>Save Changes</DashboardButton>
                </div>
              </div>
            </DashboardSection>
          </TabsContent>

          <TabsContent
            value="security"
            className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-2"
          >
            <DashboardSection
              title="Change Password"
              description="Ensure your account is using a long, random password to stay secure."
              icon={KeyRound}
            >
              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Current Password</Label>
                  <Input
                    type="password"
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                    required
                    className="border-dashboard-border bg-dashboard-panel"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">New Password</Label>
                  <Input
                    type="password"
                    value={passwordForm.newPass}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })}
                    required
                    className="border-dashboard-border bg-dashboard-panel"
                  />
                  <PasswordStrengthIndicator password={passwordForm.newPass} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Confirm New Password
                  </Label>
                  <Input
                    type="password"
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                    required
                    className="border-dashboard-border bg-dashboard-panel"
                  />
                </div>
                <DashboardButton type="submit">Update Password</DashboardButton>
              </form>
            </DashboardSection>

            <DashboardSection
              title="Two-Factor Authentication"
              description="Add an extra layer of security to your account using an authenticator app."
              icon={ShieldAlert}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 bg-dashboard-neutral-soft/50 rounded-xl border border-dashboard-border">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Authenticator App (TOTP)
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md">
                    {user.twoFactorEnabled
                      ? "Two-factor authentication is currently enabled on your account."
                      : "Protect your account from unauthorized access even if your password is compromised."}
                  </p>
                </div>
                <DashboardButton
                  variant={user.twoFactorEnabled ? "destructive" : "primary"}
                  size="sm"
                  onClick={() => setMfaPasswordMode(user.twoFactorEnabled ? "disable" : "enable")}
                  disabled={user.twoFactorEnabled && user.twoFactorRequired}
                  className="shrink-0"
                >
                  {user.twoFactorEnabled && user.twoFactorRequired
                    ? "Required by policy"
                    : user.twoFactorEnabled
                      ? "Disable 2FA"
                      : "Enable 2FA"}
                </DashboardButton>
              </div>
            </DashboardSection>
          </TabsContent>

          <TabsContent
            value="sessions"
            className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-2"
          >
            <DashboardSection
              title="Active Sessions"
              description="These are the devices that have logged into your account. Revoke any sessions that you do not recognize."
              icon={MonitorSmartphone}
            >
              <SessionListPanel
                sessions={sessions}
                busy={sessionsBusy}
                onRevokeSession={handleRevokeSession}
                onRevokeAllOther={handleRevokeAllOtherSessions}
              />
            </DashboardSection>
          </TabsContent>

          <TabsContent
            value="data"
            className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-2"
          >
            <DashboardSection
              title="Activity Log"
              description="Review recent security events and actions taken on your account."
              icon={ActivitySquare}
              actions={
                auditLog && auditLog.length > 0 ? (
                  <span className="text-[11px] font-mono font-medium text-muted-foreground bg-dashboard-neutral-soft px-2 py-0.5 rounded border border-dashboard-border">
                    {auditLog.length} total events
                  </span>
                ) : null
              }
            >
              <div className="space-y-4">
                {auditLog === undefined ? (
                  <p className="text-xs text-muted-foreground">Loading...</p>
                ) : auditLog.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No activity recorded.
                  </p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {paginatedAuditLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex flex-col sm:flex-row justify-between sm:items-center p-3 rounded-xl border border-dashboard-border bg-dashboard-neutral-soft/30 hover:bg-dashboard-panel-hover transition-colors gap-2"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-dashboard-panel border border-dashboard-border text-dashboard-primary shadow-xs">
                              <ActivitySquare className="size-3.5" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">
                                {log.action}
                                {log.details ? `: ${log.details}` : ""}
                              </p>
                              {log.ipAddress ? (
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  IP: {log.ipAddress}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <p className="text-[11px] font-mono text-muted-foreground shrink-0 sm:text-right">
                            {new Date(log.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                    {auditTotalPages > 1 && (
                      <Pagination
                        currentPage={auditPage}
                        totalPages={auditTotalPages}
                        onPageChange={auditGoToPage}
                        onNextPage={auditNextPage}
                        onPrevPage={auditPrevPage}
                      />
                    )}
                  </>
                )}
              </div>
            </DashboardSection>

            <DashboardSection
              title="Export Data"
              description="Download a copy of your personal data for your own records or GDPR compliance."
              icon={Download}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-dashboard-neutral-soft/50 rounded-xl border border-dashboard-border">
                <p className="text-xs text-muted-foreground max-w-[70%]">
                  Your export will include your profile information in JSON format.
                </p>
                <DashboardButton
                  variant="outline"
                  size="sm"
                  onClick={handleDataExport}
                  className="shrink-0 w-full sm:w-auto"
                >
                  <Download className="w-4 h-4 mr-1.5" /> Download Profile
                </DashboardButton>
              </div>
            </DashboardSection>
          </TabsContent>
        </div>
      </Tabs>

      <PasswordConfirmDialog
        open={mfaPasswordMode !== null}
        onOpenChange={(open) => {
          if (!open) setMfaPasswordMode(null);
        }}
        title={
          mfaPasswordMode === "disable"
            ? "Disable two-factor authentication"
            : "Enable two-factor authentication"
        }
        description="Enter your current password to continue."
        confirmLabel={mfaPasswordMode === "disable" ? "Disable 2FA" : "Continue"}
        busy={mfaPasswordBusy}
        onConfirm={handleMfaPasswordConfirm}
      />

      <Dialog open={totpDialogOpen} onOpenChange={setTotpDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-dashboard-panel border-dashboard-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Set up authenticator</DialogTitle>
          </DialogHeader>
          {totpEnrollment ? (
            <TotpEnrollmentPanel
              enrollment={totpEnrollment}
              busy={totpBusy}
              onConfirm={handleConfirm2FA}
              onCancel={() => {
                setTotpDialogOpen(false);
                setTotpEnrollment(null);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
