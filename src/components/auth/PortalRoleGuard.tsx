"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Scale } from "lucide-react";
import { SignInButton } from "@/components/ui/signin";
import {
  getPortalForRole,
  STAFF_ROLES,
  useCurrentUser,
  type UserRole,
} from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";

export type PortalAudience = "client" | "staff" | "admin";

function roleAllowed(role: UserRole, allowed: PortalAudience): boolean {
  if (allowed === "admin") return role === "admin";
  if (allowed === "client") return role === "client";
  return STAFF_ROLES.includes(role);
}

function skipRoleGuards(): boolean {
  return process.env.NEXT_PUBLIC_SKIP_ROLE_GUARDS === "1";
}

type PortalRoleGuardProps = {
  allowed: PortalAudience;
  title: string;
  description: string;
  dark?: boolean;
  children: ReactNode;
};

export function PortalRoleGuard({
  allowed,
  title,
  description,
  dark = false,
  children,
}: PortalRoleGuardProps) {
  const currentUser = useCurrentUser();
  const router = useRouter();
  const skip = skipRoleGuards();

  useEffect(() => {
    if (skip) return;
    if (currentUser === undefined || currentUser === null) return;
    if (!roleAllowed(currentUser.role, allowed)) {
      router.replace(getPortalForRole(currentUser.role));
    }
  }, [allowed, currentUser, router, skip]);

  if (skip) return <>{children}</>;

  const shell = cn(
    "min-h-screen flex items-center justify-center bg-background px-4",
    dark && "dark text-foreground",
  );

  if (currentUser === undefined) {
    return (
      <div className={shell}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (currentUser === null) {
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

  if (!roleAllowed(currentUser.role, allowed)) {
    return (
      <div className={cn(shell, "flex-col gap-4")}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Redirecting to your portal…</p>
      </div>
    );
  }

  return <>{children}</>;
}
