"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Scale, LogOut, ArrowRight } from "lucide-react";
import { SignInButton } from "@/components/ui/signin";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/client/api/client";
import { ApiClientError } from "@/client/api/errors";
import { localAuthClient } from "@/client/auth/local-auth-client";
import {
  getPortalForRole,
  STAFF_ROLES,
  type UserRole,
} from "@/hooks/use-current-user";
import type { UserDto } from "@/shared/contracts/identity";
import { cn } from "@/lib/utils";

export type PortalAudience = "client" | "staff" | "admin";

function roleAllowed(role: UserRole, allowed: PortalAudience): boolean {
  if (allowed === "admin") return role === "admin";
  if (allowed === "client") return role === "client";
  return STAFF_ROLES.includes(role);
}

function portalLabel(audience: PortalAudience): string {
  if (audience === "admin") return "Admin Console";
  if (audience === "staff") return "Staff Workspace";
  return "Client Portal";
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
  const pathname = usePathname();
  const skip = skipRoleGuards();
  const [mounted, setMounted] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const meQuery = useQuery({
    queryKey: ["identity", "me"],
    queryFn: ({ signal }) => apiClient.request<UserDto>("/api/v1/users/me", { signal }),
    enabled: mounted && !skip,
    retry: (failureCount, error) => {
      if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) {
        return false;
      }
      return failureCount < 1;
    },
    staleTime: 30_000,
  });

  const currentUser = meQuery.data ?? null;

  if (skip) return <>{children}</>;

  const shell = cn(
    "min-h-screen flex items-center justify-center bg-background px-4",
    dark && "dark text-foreground",
  );

  if (!mounted || meQuery.isPending) {
    return (
      <div className={shell}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (meQuery.isError || !currentUser) {
    return (
      <div className={cn(shell, "flex-col gap-4")}>
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
          <Scale className="w-6 h-6 text-primary-foreground" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-foreground">{title}</h2>
        <p className="text-muted-foreground text-sm text-center max-w-xs">{description}</p>
        <SignInButton next={pathname || `/${allowed}`} />
      </div>
    );
  }

  if (!roleAllowed(currentUser.role, allowed)) {
    const home = getPortalForRole(currentUser.role);
    const next = pathname || `/${allowed}`;

    const switchAccount = async () => {
      setSwitching(true);
      try {
        await localAuthClient.signOut();
      } catch {
        // Still send the user to sign-in even if sign-out fails.
      }
      window.location.assign(`/sign-in?next=${encodeURIComponent(next)}`);
    };

    return (
      <div className={cn(shell, "flex-col gap-4")} data-portal-gate="wrong-role">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
          <Scale className="w-6 h-6 text-primary-foreground" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-foreground">{portalLabel(allowed)}</h2>
        <p className="text-muted-foreground text-sm text-center max-w-sm">
          You&apos;re signed in as <span className="font-medium text-foreground">{currentUser.email}</span> (
          {currentUser.role.replaceAll("_", " ")}). That account belongs to a different portal.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <Button variant="outline" onClick={() => { window.location.assign(home); }}>
            Go to my portal
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button onClick={switchAccount} disabled={switching}>
            {switching ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            Sign in with another account
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
