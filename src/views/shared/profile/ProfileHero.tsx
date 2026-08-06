"use client";

import { LogOut, User as UserIcon } from "lucide-react";
import type { UserDto } from "@/shared/contracts/identity";
import { ROLE_LABELS } from "@/lib/lex-constants";
import { Button } from "@/components/ui/button";
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
        "relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-primary/8 via-background to-accent/10 p-6 sm:p-8",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_100%_0%,oklch(0.68_0.12_60_/_0.12),transparent_55%)]"
      />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4 sm:gap-5">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl border-2 border-background bg-muted shadow-md sm:size-24">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center bg-primary/10">
                <UserIcon className="size-9 text-primary sm:size-10" />
              </div>
            )}
          </div>
          <div className="min-w-0 space-y-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                {copy.title}
              </p>
              <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {user.name ?? "Account"}
              </h1>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">{copy.subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {roleLabel}
              </span>
              <span className="text-xs text-muted-foreground">
                Member since {formatMemberSince(user.createdAt)}
              </span>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-2 self-start border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => void onSignOut()}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
    </section>
  );
}
