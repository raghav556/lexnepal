"use client";

import { cn } from "@/lib/utils";

type AuthLoadingSkeletonProps = {
  className?: string;
  label?: string;
};

/** Shared auth-resolving placeholder for headers, guards, and profile shells. */
export function AuthLoadingSkeleton({
  className,
  label = "Loading account",
}: AuthLoadingSkeletonProps) {
  return (
    <div
      className={cn("h-9 rounded-md bg-muted/50 animate-pulse shrink-0", className)}
      role="status"
      aria-busy="true"
      aria-label={label}
    />
  );
}

export function AuthGuardSkeleton({ dark = false }: { dark?: boolean }) {
  return (
    <div
      className={cn(
        "min-h-screen flex flex-col items-center justify-center gap-3 bg-background px-4",
        dark && "dark text-foreground",
      )}
      role="status"
      aria-busy="true"
      aria-label="Checking your session"
    >
      <div className="h-10 w-10 rounded-xl bg-muted/60 animate-pulse" />
      <div className="h-3 w-32 rounded bg-muted/50 animate-pulse" />
    </div>
  );
}

export function ProfileLoadingSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-4xl space-y-6 p-6"
      role="status"
      aria-busy="true"
      aria-label="Loading profile"
    >
      <div className="h-28 rounded-xl bg-muted/40 animate-pulse" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-48 rounded-xl bg-muted/30 animate-pulse" />
        <div className="h-48 rounded-xl bg-muted/30 animate-pulse" />
      </div>
    </div>
  );
}
