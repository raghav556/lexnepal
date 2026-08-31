"use client";

import { LogOut, User as UserIcon } from "lucide-react";
import type { UserDto } from "@/shared/contracts/identity";
import { ROLE_LABELS } from "@/lib/lex-constants";
import { DashboardButton, DashboardStatusLabel } from "@/components/dashboard";
import { cn } from "@/lib/utils";
import { formatMemberSince, PROFILE_COPY, type ProfileVariant } from "./profile-types";

type ProfileHeroProps = {
  user: UserDto;
  variant: ProfileVariant;
  onSignOut: () => void;
  className?: string;
};

export function ProfileHero({ user, variant, onSignOut, className }: ProfileHeroProps) {
  const copy = PROFILE_COPY[variant];
  const roleLabel = ROLE_LABELS[user.role] ?? user.role.replaceAll("_", " ");

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-dashboard-border bg-gradient-to-br from-dashboard-panel via-dashboard-panel to-dashboard-primary-soft/40 p-6 sm:p-8 shadow-sm transition-all hover:shadow-md",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-dashboard-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 left-1/3 size-48 rounded-full bg-dashboard-accent/10 blur-3xl"
      />
      <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4 sm:gap-5">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl border-2 border-dashboard-border bg-dashboard-neutral-soft shadow-md sm:size-24">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center bg-dashboard-primary-soft">
                <UserIcon className="size-9 text-dashboard-primary sm:size-10" />
              </div>
            )}
          </div>
          <div className="min-w-0 space-y-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-dashboard-accent">
                {copy.title}
              </p>
              <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {user.name ?? "Account"}
              </h1>
              <p className="mt-1 max-w-xl text-xs sm:text-sm text-muted-foreground">
                {copy.subtitle}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DashboardStatusLabel
                status="active"
                label={roleLabel}
                className="text-xs font-semibold"
              />
              <span className="text-xs text-muted-foreground">
                Member since {formatMemberSince(user.createdAt)}
              </span>
            </div>
          </div>
        </div>
        <DashboardButton
          variant="outline"
          size="sm"
          className="shrink-0 gap-2 self-start border-dashboard-danger/30 text-dashboard-danger hover:bg-dashboard-danger-soft hover:text-dashboard-danger"
          onClick={() => void onSignOut()}
        >
          <LogOut className="size-4" />
          Sign out
        </DashboardButton>
      </div>
    </section>
  );
}
