"use client";

import Link from "next/link";
import { ChevronUp, LogOut, ShieldOff, User as UserIcon } from "lucide-react";
import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DashboardButton } from "@/components/dashboard";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useIdentityCommands } from "@/client/queries/identity";
import { useI18n } from "@/lib/i18n-context";
import { usePortalBranding } from "@/components/dashboard/portal-branding-context";
import { ROLE_LABELS } from "@/lib/lex-constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export type PortalAccountMenuProps = {
  profileHref: string;
  variant: "dropdown" | "drawer";
  fallbackName?: string;
  /** Render the trigger in light-on-dark mode (for dark sidebar backgrounds, default: true) */
  darkTrigger?: boolean;
  /** Close mobile drawer or run after navigation */
  onAction?: () => void;
  className?: string;
  profileLabel?: string;
  identityCaption?: string;
};

function AccountAvatar({
  name,
  avatarUrl,
  dark = true,
}: {
  name: string;
  avatarUrl: string | null | undefined;
  dark?: boolean;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={cn(
          "size-9 shrink-0 rounded-full object-cover ring-2 shadow-sm",
          dark ? "ring-white/20" : "ring-border/60",
        )}
      />
    );
  }
  const initial = (name?.trim().charAt(0) || "U").toUpperCase();
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm ring-2",
        dark
          ? "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white ring-white/20"
          : "bg-primary text-primary-foreground ring-primary/20",
      )}
    >
      {initial}
    </div>
  );
}

function AccountIdentity({
  name,
  email,
  avatarUrl,
  compact,
  dark = true,
}: {
  name: string;
  email?: string | null;
  avatarUrl: string | null | undefined;
  compact?: boolean;
  dark?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3 min-w-0 flex-1", compact && "min-w-0")}>
      <AccountAvatar name={name} avatarUrl={avatarUrl} dark={dark} />
      <div className="min-w-0 flex-1 text-left">
        <p
          className={cn(
            "truncate text-[13px] font-semibold leading-snug tracking-tight",
            dark ? "text-white" : "text-foreground",
          )}
          title={name}
        >
          {name}
        </p>
        {email ? (
          <p
            className={cn(
              "truncate text-[11px] font-medium leading-tight",
              dark ? "text-slate-300" : "text-muted-foreground",
            )}
            title={email}
          >
            {email}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function PortalAccountMenu({
  profileHref,
  variant,
  fallbackName = "Account",
  darkTrigger = true,
  onAction,
  className,
  profileLabel,
  identityCaption,
}: PortalAccountMenuProps) {
  const { signout } = useAuth();
  const user = useCurrentUser();
  const { revokeAllSessions } = useIdentityCommands();
  const { t } = useI18n();
  const { heroImageUrl } = usePortalBranding();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const name = user?.name ?? fallbackName;
  const email = user?.email;
  const identityHeader = (
    <div
      className="portal-account-identity"
      style={{
        backgroundImage: `linear-gradient(100deg, var(--dashboard-sidebar) 35%, transparent), url(${heroImageUrl || "/images/staff-home-nepal.jpg"})`,
      }}
    >
      <AccountIdentity name={name} email={email} avatarUrl={user?.avatar} />
      {user?.role ? (
        <span className="portal-account-role">
          {ROLE_LABELS[user.role] ?? user.role.replaceAll("_", " ")}
        </span>
      ) : null}
    </div>
  );
  const profile = (
    <>
      <UserIcon className="size-4" aria-hidden />
      {profileLabel ?? t("nav.profile")}
    </>
  );

  async function leave(everywhere: boolean) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (everywhere) {
        if (!user?.id)
          throw new Error("Your identity is unavailable. Please reload and try again.");
        // The existing self-service endpoint preserves this session; signout ends it next.
        await revokeAllSessions(user.id);
      }
      await signout({ reportErrors: true });
      onAction?.();
    } catch {
      setError(
        everywhere
          ? "Could not complete sign out everywhere. Some sessions may remain active. Please retry."
          : "Could not sign out. Please retry.",
      );
      toast.error("Sign out could not be completed");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function ask() {
    setError("");
    setConfirm(true);
  }
  const confirmation = (
    <div className="space-y-4">
      <p className="text-sm">
        Sign out other active sessions, then sign out on this device. You will need to sign in
        again.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <DashboardButton
          variant="outline"
          disabled={busy}
          onClick={() => {
            setConfirm(false);
            requestAnimationFrame(() => triggerRef.current?.focus());
          }}
        >
          Cancel
        </DashboardButton>
        <DashboardButton disabled={busy} aria-busy={busy} onClick={() => void leave(true)}>
          {busy ? "Signing out..." : "Sign out everywhere"}
        </DashboardButton>
      </div>
    </div>
  );

  if (variant === "drawer")
    return (
      <div
        className={cn(
          "portal-account-drawer shrink-0 border-t border-white/10 px-4 py-3",
          !darkTrigger && "portal-account-drawer-light",
          className,
        )}
      >
        {identityHeader}
        {confirm ? (
          <div
            className="portal-account-confirm mt-3"
            role="group"
            aria-label="Confirm sign out everywhere"
          >
            <h3 className="mb-2 font-semibold">Sign out everywhere?</h3>
            {confirmation}
          </div>
        ) : (
          <div className="mt-3 grid gap-1">
            <Link className="portal-account-drawer-action" href={profileHref} onClick={onAction}>
              {profile}
            </Link>
            <button
              ref={triggerRef}
              type="button"
              className="portal-account-drawer-action portal-account-security"
              disabled={busy}
              onClick={ask}
            >
              <ShieldOff className="size-4" aria-hidden />
              Sign out everywhere
            </button>
            <button
              type="button"
              className="portal-account-drawer-action portal-account-signout"
              disabled={busy}
              onClick={() => void leave(false)}
            >
              <LogOut className="size-4" aria-hidden />
              {busy ? "Signing out..." : t("nav.signout")}
            </button>
            {error ? (
              <p role="alert" className="text-sm text-rose-200">
                {error}
              </p>
            ) : null}
          </div>
        )}
      </div>
    );

  return (
    <div className={className}>
      <DropdownMenu keyboardNavigation>
        <DropdownMenuTrigger asChild>
          <button
            ref={triggerRef}
            type="button"
            aria-label="Open account menu"
            className={cn(
              "portal-account-trigger group flex w-full items-center justify-between gap-3 rounded-xl border p-2",
              darkTrigger
                ? "border-white/15 bg-white/5 hover:bg-white/10"
                : "border-dashboard-border bg-dashboard-panel",
            )}
          >
            <AccountIdentity
              name={name}
              email={identityCaption ?? email}
              avatarUrl={user?.avatar}
              dark={darkTrigger}
            />
            <ChevronUp className="size-4 shrink-0 text-slate-400" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          collisionAware
          align="start"
          side="top"
          className="portal-account-menu"
          aria-label="Account"
        >
          <DropdownMenuLabel className="portal-account-heading">{identityHeader}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={profileHref} onClick={onAction}>
              {profile}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <div className="portal-account-section-label">Security &amp; sessions</div>
          <DropdownMenuItem onClick={ask}>
            <ShieldOff className="size-4" aria-hidden />
            Sign out everywhere
          </DropdownMenuItem>
          <DropdownMenuItem
            className="portal-account-signout"
            aria-disabled={busy}
            onClick={() => void leave(false)}
          >
            <LogOut className="size-4" aria-hidden />
            {busy ? "Signing out..." : t("nav.signout")}
          </DropdownMenuItem>
          {error ? (
            <p role="alert" className="px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {!confirm && error ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <Dialog
        open={confirm}
        onOpenChange={(open: boolean) => {
          if (!busy) {
            setConfirm(open);
            if (!open) requestAnimationFrame(() => triggerRef.current?.focus());
          }
        }}
      >
        <DialogContent aria-label="Sign out everywhere" className="portal-account-confirm">
          <DialogHeader>
            <DialogTitle>Sign out everywhere?</DialogTitle>
            <DialogDescription>End active account sessions.</DialogDescription>
          </DialogHeader>
          {confirmation}
        </DialogContent>
      </Dialog>
    </div>
  );
}
