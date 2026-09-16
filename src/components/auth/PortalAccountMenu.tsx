"use client";

import Link from "next/link";
import { ChevronUp, Globe, LogOut, ShieldOff, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useIdentityCommands } from "@/client/queries/identity";
import { useI18n } from "@/lib/i18n-context";
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
  showLanguageToggle?: boolean;
  /** Render the trigger in light-on-dark mode (for dark sidebar backgrounds, default: true) */
  darkTrigger?: boolean;
  /** Close mobile drawer or run after navigation */
  onAction?: () => void;
  className?: string;
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
  showLanguageToggle = false,
  darkTrigger = true,
  onAction,
  className,
}: PortalAccountMenuProps) {
  const { signout } = useAuth();
  const identityUser = useCurrentUser();
  const { revokeAllSessions } = useIdentityCommands();
  const { t, language, setLanguage } = useI18n();

  const displayName = identityUser?.name ?? fallbackName;
  const email = identityUser?.email;
  const avatarUrl = identityUser?.avatar ?? null;

  const handleSignOut = async () => {
    onAction?.();
    await signout();
  };

  const handleSignOutEverywhere = async () => {
    if (!identityUser?.id) {
      await handleSignOut();
      return;
    }
    try {
      await revokeAllSessions(identityUser.id);
      toast.success("Signed out of all other devices");
    } catch {
      toast.message("Could not revoke remote sessions — signing out here");
    }
    onAction?.();
    await signout();
  };

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "ne" : "en");
  };

  if (variant === "drawer") {
    return (
      <div
        className={cn(
          "shrink-0 border-t border-white/10 px-4 py-4",
          darkTrigger ? "bg-sidebar/50" : "bg-sidebar",
          className,
        )}
      >
        <AccountIdentity
          name={displayName}
          email={email}
          avatarUrl={avatarUrl}
          compact
          dark={darkTrigger}
        />
        <div className="mt-3 space-y-1">
          <Link
            href={profileHref}
            onClick={onAction}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              darkTrigger
                ? "text-slate-200 hover:bg-white/10 hover:text-white"
                : "text-sidebar-foreground hover:bg-sidebar-accent",
            )}
          >
            <UserIcon
              className={cn(
                "size-4 shrink-0",
                darkTrigger ? "text-slate-400" : "text-muted-foreground",
              )}
            />
            Profile & Settings
          </Link>
          {showLanguageToggle ? (
            <button
              type="button"
              onClick={toggleLanguage}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                darkTrigger
                  ? "text-slate-200 hover:bg-white/10 hover:text-white"
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <Globe
                className={cn(
                  "size-4 shrink-0",
                  darkTrigger ? "text-slate-400" : "text-muted-foreground",
                )}
              />
              Language ({language === "en" ? "नेपाली" : "English"})
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void handleSignOutEverywhere()}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              darkTrigger
                ? "text-slate-300 hover:bg-white/10 hover:text-white"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent",
            )}
          >
            <ShieldOff
              className={cn(
                "size-4 shrink-0",
                darkTrigger ? "text-slate-400" : "text-muted-foreground",
              )}
            />
            Sign out everywhere
          </button>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              darkTrigger
                ? "text-rose-400 hover:bg-rose-500/15 hover:text-rose-300"
                : "text-destructive hover:bg-destructive/10",
            )}
          >
            <LogOut className="size-4 shrink-0" />
            {t("nav.signout")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "group flex w-full items-center justify-between gap-3 rounded-xl p-2 transition-all duration-200",
              darkTrigger
                ? "border border-white/10 bg-white/[0.04] hover:bg-white/[0.09] hover:border-white/20 focus-visible:ring-2 focus-visible:ring-blue-400/50"
                : "border border-transparent hover:bg-sidebar-accent",
            )}
          >
            <AccountIdentity
              name={displayName}
              email={email}
              avatarUrl={avatarUrl}
              compact
              dark={darkTrigger}
            />
            <ChevronUp
              className={cn(
                "size-4 shrink-0 transition-transform duration-200",
                darkTrigger
                  ? "text-slate-400 group-hover:text-white"
                  : "text-muted-foreground group-hover:text-foreground",
              )}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="w-[230px] mb-2">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={profileHref} className="cursor-pointer">
              <UserIcon className="mr-2 size-4" /> Profile & Settings
            </Link>
          </DropdownMenuItem>
          {showLanguageToggle ? (
            <DropdownMenuItem onClick={toggleLanguage} className="cursor-pointer">
              <Globe className="mr-2 size-4" /> Language ({language === "en" ? "नेपाली" : "English"}
              )
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => void handleSignOutEverywhere()}
            className="cursor-pointer"
          >
            <ShieldOff className="mr-2 size-4" /> Sign out everywhere
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => void handleSignOut()}
            className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <LogOut className="mr-2 size-4" /> {t("nav.signout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
