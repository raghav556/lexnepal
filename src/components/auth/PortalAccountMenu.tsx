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
  /** Render the trigger in light-on-dark mode (for dark sidebar backgrounds) */
  darkTrigger?: boolean;
  /** Close mobile drawer or run after navigation */
  onAction?: () => void;
  className?: string;
};

function AccountAvatar({
  name,
  avatarUrl,
  dark,
}: {
  name: string;
  avatarUrl: string | null | undefined;
  dark?: boolean;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={cn(
          "size-8 shrink-0 rounded-full object-cover ring-1",
          dark ? "ring-white/20" : "ring-border/60",
        )}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full",
        dark ? "bg-white/15" : "bg-primary/10",
      )}
    >
      <UserIcon className={cn("size-4", dark ? "text-blue-200" : "text-primary")} />
    </div>
  );
}

function AccountIdentity({
  name,
  email,
  avatarUrl,
  compact,
  dark,
}: {
  name: string;
  email?: string | null;
  avatarUrl: string | null | undefined;
  compact?: boolean;
  dark?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", compact && "min-w-0")}>
      <AccountAvatar name={name} avatarUrl={avatarUrl} dark={dark} />
      <div className="min-w-0 flex-1 text-left">
        <p className={cn("truncate text-xs font-medium", dark ? "text-white" : "text-foreground")}>
          {name}
        </p>
        {email ? (
          <p
            className={cn(
              "truncate text-[10px]",
              dark ? "text-blue-200/60" : "text-muted-foreground",
            )}
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
  darkTrigger = false,
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
        className={cn("shrink-0 border-t border-sidebar-border bg-sidebar px-4 py-4", className)}
      >
        <AccountIdentity name={displayName} email={email} avatarUrl={avatarUrl} compact />
        <div className="mt-3 space-y-1">
          <Link
            href={profileHref}
            onClick={onAction}
            className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
          >
            <UserIcon className="size-4 shrink-0" />
            Profile & Settings
          </Link>
          {showLanguageToggle ? (
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
            >
              <Globe className="size-4 shrink-0" />
              Language ({language === "en" ? "नेपाली" : "English"})
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void handleSignOutEverywhere()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent"
          >
            <ShieldOff className="size-4 shrink-0" />
            Sign out everywhere
          </button>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
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
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
              darkTrigger
                ? "hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-blue-400/50"
                : "hover:bg-sidebar-accent",
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
                "size-4 shrink-0",
                darkTrigger ? "text-blue-300/50" : "text-sidebar-foreground/50",
              )}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="w-full min-w-[220px] mb-2">
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
