"use client";
import { formatNepalTimestamp } from "@/lib/nepali-calendar";

import { useEffect, useRef, useState } from "react";
import {
  useCurrentIdentityUser,
  useOwnAuditEventsQuery,
  useProfileCommands,
  useSessionsQuery,
} from "@/client/queries/identity";
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
import { ClientProfileOverview } from "@/views/shared/profile/ClientProfileOverview";
import { StaffProfileExtras } from "@/views/shared/profile/StaffProfileExtras";
import { AdminProfileExtras } from "@/views/shared/profile/AdminProfileExtras";
import type { ProfileVariant } from "@/views/shared/profile/profile-types";
import { PasswordConfirmDialog } from "@/components/auth/PasswordConfirmDialog";
import { TotpEnrollmentPanel } from "@/components/auth/TotpEnrollmentPanel";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { SessionListPanel } from "@/components/auth/SessionListPanel";
import { ClientQueryError, DashboardButton, DashboardSection } from "@/components/dashboard";
import { clientQueryHasData } from "@/components/dashboard/client-query-boundary";
import { NepalDecoratedHero } from "@/components/dashboard/nepal-decorated-hero";
import { usePagination } from "@/hooks/use-pagination.ts";
import { Pagination } from "@/components/ui/pagination.tsx";
import { updateOwnProfileSchema } from "@/shared/contracts/identity";
import type { TotpEnrollmentPayload } from "@/shared/auth/totp";

type SharedProfilePageProps = {
  variant: ProfileVariant;
};

type MfaPasswordMode = "enable" | "disable" | null;

export default function SharedProfilePage({ variant }: SharedProfilePageProps) {
  const user = useCurrentIdentityUser();
  const sessionsQuery = useSessionsQuery(user?.id);
  const auditQuery = useOwnAuditEventsQuery();
  const sessions = sessionsQuery.data;
  const auditLog =
    variant === "client" && !clientQueryHasData(auditQuery) ? undefined : auditQuery.data;
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

  const [profileBusy, setProfileBusy] = useState(false);
  const profileLock = useRef(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const avatarLock = useRef(false);
  const [profileError, setProfileError] = useState("");
  const [sessionConfirm, setSessionConfirm] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState("");
  const sessionLock = useRef(false);
  const [profileForm, setProfileForm] = useState({ name: "", phone: "", bio: "" });
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });
  const [clientPasswordBusy, setClientPasswordBusy] = useState(false);
  const clientPasswordRequest = useRef(false);

  const [mfaPasswordMode, setMfaPasswordMode] = useState<MfaPasswordMode>(null);
  const [mfaPasswordBusy, setMfaPasswordBusy] = useState(false);
  const [totpDialogOpen, setTotpDialogOpen] = useState(false);
  const [totpEnrollment, setTotpEnrollment] = useState<TotpEnrollmentPayload | null>(null);
  const [totpBusy, setTotpBusy] = useState(false);
  const [sessionsBusy, setSessionsBusy] = useState(false);
  const [clientTab, setClientTab] = useState("security");

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

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (profileLock.current) return;
    const input = updateOwnProfileSchema.safeParse({
      name: profileForm.name,
      phone: profileForm.phone || null,
      ...(variant === "staff" &&
      user &&
      ["partner", "senior_associate", "associate", "paralegal"].includes(user.role)
        ? { bio: profileForm.bio || null }
        : {}),
    });
    if (!input.success) {
      setProfileError(input.error.issues[0]?.message || "Check your profile fields.");
      return;
    }
    profileLock.current = true;
    setProfileBusy(true);
    setProfileError("");
    try {
      await updateProfile(input.data);
      toast.success("Profile updated successfully!");
    } catch {
      setProfileError("Could not save your profile. Your changes are retained; please retry.");
    } finally {
      profileLock.current = false;
      setProfileBusy(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clientPasswordRequest.current) return;
    if (passwordForm.newPass !== passwordForm.confirm) {
      toast.error("New passwords do not match!");
      return;
    }
    if (passwordForm.newPass.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    clientPasswordRequest.current = true;
    setClientPasswordBusy(true);
    try {
      await changePassword(passwordForm.current, passwordForm.newPass);
      toast.success("Password changed successfully!");
      setPasswordForm({ current: "", newPass: "", confirm: "" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      clientPasswordRequest.current = false;
      setClientPasswordBusy(false);
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
    if (!file || !user || avatarLock.current) return;
    if (
      !["image/jpeg", "image/png"].includes(file.type) ||
      file.size < 1 ||
      file.size > 5 * 1024 * 1024
    ) {
      toast.error("Choose a JPG or PNG image up to 5 MB.");
      e.target.value = "";
      return;
    }
    avatarLock.current = true;
    setAvatarBusy(true);
    try {
      await uploadAvatar(file);
      toast.success("Avatar uploaded and queued for malware scanning");
    } catch {
      toast.error("Failed to upload avatar");
    } finally {
      avatarLock.current = false;
      setAvatarBusy(false);
      e.target.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    if (avatarLock.current) return;
    avatarLock.current = true;
    setAvatarBusy(true);
    try {
      await removeAvatar();
      toast.success("Avatar removed");
    } catch {
      toast.error("Failed to remove avatar");
    } finally {
      avatarLock.current = false;
      setAvatarBusy(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (sessionLock.current) return;
    sessionLock.current = true;
    setSessionsBusy(true);
    setSessionError("");
    try {
      await revokeSession(sessionId);
      toast.success("Session revoked successfully");
      setSessionConfirm(null);
    } catch {
      setSessionError("Could not revoke this session. Please retry.");
    } finally {
      sessionLock.current = false;
      setSessionsBusy(false);
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    if (!user || sessionLock.current) return;
    sessionLock.current = true;
    setSessionError("");
    setSessionsBusy(true);
    try {
      const result = await revokeAllOtherSessions(user.id);
      setSessionConfirm(null);
      toast.success(
        result.revoked > 0
          ? `Signed out of ${result.revoked} other device${result.revoked === 1 ? "" : "s"}`
          : "No other active sessions to revoke",
      );
    } catch {
      setSessionError("Could not revoke other sessions. Please retry.");
    } finally {
      sessionLock.current = false;
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
    variant === "staff" ? (
      <StaffProfileExtras user={user} />
    ) : variant === "admin" ? (
      <AdminProfileExtras user={user} />
    ) : null;
  const tabTriggerClass =
    variant === "client"
      ? "w-auto justify-start gap-2.5 rounded-lg border border-transparent px-4 py-2.5 text-xs font-semibold text-dashboard-neutral transition-all data-[state=active]:border-dashboard-primary/30 data-[state=active]:bg-dashboard-primary-soft data-[state=active]:text-dashboard-primary hover:text-foreground hover:bg-dashboard-panel-hover"
      : "md:w-full justify-start gap-2.5 rounded-xl border border-transparent px-4 py-2.5 text-xs font-semibold text-dashboard-neutral transition-all data-[state=active]:border-dashboard-primary/30 data-[state=active]:bg-dashboard-primary-soft data-[state=active]:text-dashboard-primary hover:text-foreground hover:bg-dashboard-panel-hover";

  return (
    <div
      className={
        variant === "client"
          ? "mx-auto w-full max-w-7xl space-y-5 p-4 pb-24 sm:p-6 lg:p-8"
          : "premium-profile-page p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6"
      }
    >
      {variant === "client" ? (
        <>
          <NepalDecoratedHero
            eyebrow="Client Portal"
            title="Profile"
            description="Manage your personal information and account security."
            className="client-profile-hero"
          />
          <ClientProfileOverview
            user={user}
            updateProfile={updateProfile}
            onAvatarUpload={handleAvatarUpload}
            onRemoveAvatar={handleRemoveAvatar}
            onSelectTab={(tab) => {
              setClientTab(tab);
              document.getElementById("client-profile-account-controls")?.scrollIntoView({
                behavior: "auto",
                block: "start",
              });
            }}
          />
        </>
      ) : (
        <>
          <ProfileHero user={user} variant={variant} />
          {portalExtras}
        </>
      )}

      <Tabs
        id={variant === "client" ? "client-profile-account-controls" : undefined}
        defaultValue={variant === "client" ? undefined : "general"}
        value={variant === "client" ? clientTab : undefined}
        onValueChange={variant === "client" ? setClientTab : undefined}
        className={
          variant === "client"
            ? "w-full min-w-0 space-y-4"
            : "w-full flex flex-col md:flex-row gap-6"
        }
      >
        <TabsList
          aria-label={variant === "client" ? "Account security and privacy" : "Profile settings"}
          className={
            variant === "client"
              ? "flex h-auto w-full min-w-0 justify-start gap-2 overflow-x-auto rounded-none border-b border-dashboard-border bg-transparent p-0 pb-2 [scrollbar-width:thin] [&_[data-slot=tabs-trigger]]:shrink-0"
              : "flex md:flex-col h-auto bg-transparent p-0 space-y-1 w-full md:w-56 overflow-x-auto justify-start border-b md:border-b-0 border-dashboard-border pb-2 md:pb-0 shrink-0"
          }
        >
          {variant !== "client" ? (
            <TabsTrigger value="general" className={tabTriggerClass}>
              <User className="w-4 h-4" /> General
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="security" className={tabTriggerClass}>
            <Shield className="w-4 h-4" /> Security
          </TabsTrigger>
          <TabsTrigger value="sessions" className={tabTriggerClass}>
            <MonitorSmartphone className="w-4 h-4" /> Active Sessions
          </TabsTrigger>
          <TabsTrigger value="data" className={tabTriggerClass}>
            <Database className="w-4 h-4" /> Data & Privacy
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-w-0">
          {variant !== "client" ? (
            <TabsContent
              value="general"
              className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-2"
            >
              <DashboardSection
                title="General Information"
                description="Manage your personal details and how you appear across the workspace."
                icon={User}
              >
                <div className="profile-general-grid">
                  <div className="profile-photo-workspace">
                    <div className="w-24 h-24 rounded-2xl bg-dashboard-neutral-soft flex flex-col items-center justify-center border-2 border-dashed border-dashboard-border overflow-hidden relative group shrink-0">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-10 h-10 text-dashboard-neutral" />
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <DashboardButton
                          variant="outline"
                          size="sm"
                          disabled={avatarBusy}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="w-4 h-4 mr-1.5" /> Upload new
                        </DashboardButton>
                        <DashboardButton
                          variant="ghost"
                          size="sm"
                          className="text-dashboard-danger hover:bg-dashboard-danger-soft"
                          disabled={avatarBusy || !user.avatar}
                          onClick={handleRemoveAvatar}
                        >
                          <Trash2 className="w-4 h-4 mr-1.5" /> Remove
                        </DashboardButton>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        JPG or PNG, up to 5 MB. Uploads are scanned before appearing on your
                        profile.
                      </p>
                    </div>
                  </div>
                  <form className="space-y-4 min-w-0" onSubmit={handleSaveProfile}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="profile-name"
                          className="text-xs font-semibold text-foreground"
                        >
                          Full Name
                        </Label>
                        <Input
                          id="profile-name"
                          required
                          maxLength={200}
                          value={profileForm.name}
                          onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                          className="border-dashboard-border bg-dashboard-panel"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="profile-phone"
                          className="text-xs font-semibold text-foreground"
                        >
                          Phone Number
                        </Label>
                        <Input
                          id="profile-phone"
                          type="tel"
                          maxLength={50}
                          value={profileForm.phone}
                          onChange={(e) =>
                            setProfileForm({ ...profileForm, phone: e.target.value })
                          }
                          placeholder="+977..."
                          className="border-dashboard-border bg-dashboard-panel"
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <Label
                          htmlFor="profile-email"
                          className="text-xs font-semibold text-foreground"
                        >
                          Email Address
                        </Label>
                        <Input
                          id="profile-email"
                          value={user.email ?? ""}
                          disabled
                          className="border-dashboard-border bg-dashboard-neutral-soft/50 text-muted-foreground"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Contact an administrator to change your email address.
                        </p>
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <Label
                          htmlFor="profile-role"
                          className="text-xs font-semibold text-foreground"
                        >
                          System Role
                        </Label>
                        <Input
                          id="profile-role"
                          value={ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role}
                          disabled
                          className="border-dashboard-border bg-dashboard-neutral-soft/50 text-muted-foreground"
                        />
                      </div>
                    </div>

                    {isLawyer && variant === "staff" && (
                      <div className="space-y-1.5 pt-4 border-t border-dashboard-border mt-4">
                        <Label
                          htmlFor="profile-bio"
                          className="text-xs font-semibold text-foreground"
                        >
                          Professional Biography
                        </Label>
                        <Textarea
                          id="profile-bio"
                          maxLength={2000}
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

                    {profileError ? (
                      <p role="alert" className="text-sm text-destructive">
                        {profileError}
                      </p>
                    ) : null}
                    <div className="flex justify-start pt-2">
                      <DashboardButton type="submit" disabled={profileBusy} aria-busy={profileBusy}>
                        {profileBusy ? "Saving..." : "Save Changes"}
                      </DashboardButton>
                    </div>
                  </form>
                </div>
              </DashboardSection>
            </TabsContent>
          ) : null}

          <TabsContent
            value="security"
            className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-2"
          >
            <DashboardSection
              title="Change Password"
              description="Ensure your account is using a long, random password to stay secure."
              icon={KeyRound}
              className={variant === "client" ? "mx-auto max-w-4xl" : undefined}
            >
              <form
                onSubmit={handlePasswordChange}
                className={
                  variant === "client" ? "grid gap-4 md:grid-cols-2" : "space-y-4 max-w-md"
                }
              >
                <div className="space-y-1.5">
                  <Label
                    htmlFor="profile-current-password"
                    className="text-xs font-semibold text-foreground"
                  >
                    Current Password
                  </Label>
                  <Input
                    id="profile-current-password"
                    type="password"
                    autoComplete="current-password"
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                    required
                    className="border-dashboard-border bg-dashboard-panel"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="profile-new-password"
                    className="text-xs font-semibold text-foreground"
                  >
                    New Password
                  </Label>
                  <Input
                    id="profile-new-password"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.newPass}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })}
                    required
                    className="border-dashboard-border bg-dashboard-panel"
                  />
                  <PasswordStrengthIndicator password={passwordForm.newPass} />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="profile-confirm-password"
                    className="text-xs font-semibold text-foreground"
                  >
                    Confirm New Password
                  </Label>
                  <Input
                    id="profile-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                    required
                    className="border-dashboard-border bg-dashboard-panel"
                  />
                </div>
                <DashboardButton
                  type="submit"
                  disabled={clientPasswordBusy}
                  aria-busy={clientPasswordBusy}
                  className={variant === "client" ? "md:self-end md:justify-self-start" : undefined}
                >
                  {clientPasswordBusy ? "Updating password…" : "Update Password"}
                </DashboardButton>
              </form>
            </DashboardSection>

            <DashboardSection
              title="Two-Factor Authentication"
              description="Add an extra layer of security to your account using an authenticator app."
              icon={ShieldAlert}
              className={variant === "client" ? "mx-auto max-w-4xl" : undefined}
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
              {sessionsQuery.isError ? (
                <ClientQueryError
                  title="Sessions unavailable"
                  onRetry={() => {
                    void sessionsQuery.refetch();
                  }}
                  retrying={sessionsQuery.isFetching}
                />
              ) : sessionsQuery.isPending ? (
                <p className="text-sm text-muted-foreground" role="status">
                  Loading sessions…
                </p>
              ) : (
                <SessionListPanel
                  sessions={sessions}
                  busy={sessionsBusy}
                  onRevokeSession={(id) => {
                    setSessionError("");
                    setSessionConfirm(id);
                  }}
                  onRevokeAllOther={() => {
                    setSessionError("");
                    setSessionConfirm("all");
                  }}
                />
              )}
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
                    {auditLog.length} loaded event{auditLog.length === 1 ? "" : "s"}
                  </span>
                ) : null
              }
            >
              <div className="space-y-4">
                {variant === "client" && auditQuery.isError ? (
                  <ClientQueryError
                    title="Activity unavailable"
                    onRetry={() => {
                      void auditQuery.refetch();
                    }}
                    retrying={auditQuery.isFetching}
                  />
                ) : null}
                {auditLog === undefined ? (
                  variant === "client" && auditQuery.isError ? null : (
                    <p className="text-xs text-muted-foreground">Loading...</p>
                  )
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
                          className="flex flex-col lg:flex-row justify-between lg:items-center p-3 rounded-xl border border-dashboard-border bg-dashboard-neutral-soft/30 hover:bg-dashboard-panel-hover transition-colors gap-2"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-dashboard-panel border border-dashboard-border text-dashboard-primary shadow-xs">
                              <ActivitySquare className="size-3.5" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">
                                {variant === "client"
                                  ? log.action
                                  : log.action
                                      .replace(/[._:-]+/g, " ")
                                      .replace(/\b\w/g, (letter) => letter.toUpperCase())}
                              </p>
                              {variant !== "client" ? (
                                <details className="text-xs text-muted-foreground">
                                  <summary>Technical event details</summary>
                                  <p className="break-all">
                                    {log.action}
                                    {log.details ? `: ${log.details}` : ""}
                                  </p>
                                  {log.ipAddress ? <p>IP: {log.ipAddress}</p> : null}
                                </details>
                              ) : null}
                            </div>
                          </div>
                          <p className="text-[11px] font-mono text-muted-foreground shrink-0 lg:text-right">
                            {formatNepalTimestamp(log.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                    {auditTotalPages > 1 && (
                      <Pagination
                        className={variant === "client" ? "client-pagination" : undefined}
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
              title={variant === "client" ? "Download Profile Information" : "Export Data"}
              description="Download a JSON copy of the profile fields shown here. This does not include matters, documents or a full account archive."
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

      <Dialog
        open={sessionConfirm !== null}
        onOpenChange={(open: boolean) => {
          if (!open && !sessionsBusy) setSessionConfirm(null);
        }}
      >
        <DialogContent aria-label="Confirm session revocation">
          <DialogHeader>
            <DialogTitle>
              {sessionConfirm === "all" ? "Sign out other sessions?" : "Revoke this session?"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            Your current session stays active. The selected other device sessions will need to sign
            in again.
          </p>
          {sessionError ? (
            <p role="alert" className="text-sm text-destructive">
              {sessionError}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <DashboardButton
              variant="outline"
              disabled={sessionsBusy}
              onClick={() => setSessionConfirm(null)}
            >
              Cancel
            </DashboardButton>
            <DashboardButton
              disabled={sessionsBusy}
              onClick={() =>
                void (sessionConfirm === "all"
                  ? handleRevokeAllOtherSessions()
                  : handleRevokeSession(sessionConfirm!))
              }
            >
              {sessionsBusy ? "Revoking..." : "Confirm revocation"}
            </DashboardButton>
          </div>
        </DialogContent>
      </Dialog>
      <PasswordConfirmDialog
        dialogLabel={
          mfaPasswordMode === "enable" ? "Enable authenticator" : "Disable authenticator"
        }
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
        <DialogContent
          aria-label="Set up authenticator"
          className="sm:max-w-lg bg-dashboard-panel border-dashboard-border"
        >
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
