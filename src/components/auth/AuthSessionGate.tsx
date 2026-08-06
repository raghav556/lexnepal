"use client";

import type { ReactNode } from "react";
import { Scale } from "lucide-react";
import { AuthGuardSkeleton } from "@/components/auth/AuthLoadingSkeleton";
import { SignInButton } from "@/components/ui/signin";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type AuthSessionGateProps = {
  title: string;
  description: string;
  dark?: boolean;
  children: ReactNode;
  /** Optional loading UI (defaults to spinner). */
  loadingFallback?: ReactNode;
};

/**
 * Session gate for Vite portal layouts — Better Auth / useAuth only (no Convex Authenticated).
 */
export function AuthSessionGate({
  title,
  description,
  dark = false,
  children,
  loadingFallback,
}: AuthSessionGateProps) {
  const { isLoading, isAuthenticated } = useAuth();

  const shell = cn(
    "min-h-screen flex items-center justify-center bg-background px-4",
    dark && "dark text-foreground",
  );

  if (isLoading) {
    return loadingFallback ?? <AuthGuardSkeleton dark={dark} />;
  }

  if (!isAuthenticated) {
    return (
      <div className={cn(shell, "flex-col gap-4")}>
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
          <Scale className="w-6 h-6 text-primary-foreground" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-foreground">{title}</h2>
        <p className="text-muted-foreground text-sm text-center max-w-xs">{description}</p>
        <SignInButton />
      </div>
    );
  }

  return <>{children}</>;
}
