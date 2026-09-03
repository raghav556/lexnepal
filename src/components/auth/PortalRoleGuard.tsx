"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { LogOut, Scale, ArrowRight } from "lucide-react";
import { SignInButton } from "@/components/ui/signin";
import { Button } from "@/components/ui/button";
import { localAuthClient } from "@/client/auth/local-auth-client";
import { AuthGuardSkeleton } from "@/components/auth/AuthLoadingSkeleton";
import { getPortalForRole, STAFF_ROLES, type UserRole } from "@/hooks/use-current-user";
import { useAuth } from "@/hooks/use-auth";
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
  const [switching, setSwitching] = useState(false);
  const { identityUser, isLoading, isAuthenticated } = useAuth();

  if (skip) return <>{children}</>;

  const shell = cn(
    "min-h-screen flex items-center justify-center bg-background px-4",
    dark && "dark text-foreground",
  );

  if (isLoading || identityUser === undefined) {
    return <AuthGuardSkeleton dark={dark} />;
  }

  if (!isAuthenticated || !identityUser) {
    return (
      <div className={cn(shell, "flex-col gap-4")}>
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
          <Scale className="w-6 h-6 text-primary-foreground" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-foreground">{title}</h2>
        <p className="text-muted-foreground text-sm text-center max-w-xs">{description}</p>
        <SignInButton next={pathname || `/${allowed}`} portal={allowed} />
      </div>
    );
  }

  if (!roleAllowed(identityUser.role, allowed)) {
    const home = getPortalForRole(identityUser.role);
    const next = pathname || `/${allowed}`;

    const switchAccount = async () => {
      setSwitching(true);
      try {
        await localAuthClient.signOut();
      } catch {
        // Still send the user to sign-in even if sign-out fails.
      }
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/sign-in/${allowed}?next=${encodeURIComponent(next)}`);
    };

    return (
      <div className={cn(shell, "flex-col gap-4")} data-portal-gate="wrong-role">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
          <Scale className="w-6 h-6 text-primary-foreground" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-foreground">{portalLabel(allowed)}</h2>
        <p className="text-muted-foreground text-sm text-center max-w-sm">
          You&apos;re signed in as{" "}
          <span className="font-medium text-foreground">{identityUser.email}</span> (
          {identityUser.role.replaceAll("_", " ")}). That account belongs to a different portal.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <Button
            variant="outline"
            onClick={() => {
              window.location.assign(home);
            }}
          >
            Go to my portal
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button onClick={switchAccount} disabled={switching} className="gap-2">
            {switching ? (
              "Signing out…"
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                Sign in with another account
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
