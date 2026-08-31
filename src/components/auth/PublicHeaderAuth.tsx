"use client";

import Link from "next/link";
import { ChevronDown, LogOut, LayoutDashboard } from "lucide-react";
import { SignInButton } from "@/components/ui/signin";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AuthLoadingSkeleton } from "@/components/auth/AuthLoadingSkeleton";
import { useAuth } from "@/hooks/use-auth";
import { getPortalForRole } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";

/** Public header auth — single unified auth source, skeleton while hydrating. */
export function PublicHeaderAuth({ mobile = false }: { mobile?: boolean }) {
  const { identityUser, isLoading, isAuthenticated, signout } = useAuth();

  if (isLoading || identityUser === undefined) {
    return <AuthLoadingSkeleton className={mobile ? "w-full" : "w-[5.75rem]"} />;
  }

  if (isAuthenticated && identityUser) {
    const portalHref = getPortalForRole(identityUser.role);
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "font-medium text-foreground shrink-0 gap-1.5",
              mobile && "w-full justify-between",
            )}
          >
            <span className="truncate">My Portal</span>
            <ChevronDown className="size-4 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="truncate">{identityUser.name}</DropdownMenuLabel>
          <p className="px-2 pb-1.5 text-xs text-muted-foreground truncate">{identityUser.email}</p>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={portalHref} className="cursor-pointer flex items-center gap-2">
              <LayoutDashboard className="size-4" />
              Open portal
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => void signout()}
            className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <LogOut className="size-4 mr-2" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return mobile ? (
    <div className="w-full [&_button]:w-full">
      <SignInButton />
    </div>
  ) : (
    <SignInButton />
  );
}
