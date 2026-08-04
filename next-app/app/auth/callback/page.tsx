"use client";
import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthCallback } from "@usehercules/auth/react";
import { useLegacyIdentityCallback } from "@/client/queries/identity";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/convex/users";

function getPortalForRole(role: UserRole): string {
  if (role === "admin") return "/admin";
  if (role === "client") return "/client";
  return "/staff";
}

export default function AuthCallback() {
  const router = useRouter();
  const { isBackendAuthenticated: isConvexAuthenticated, sync: updateCurrentUser } = useLegacyIdentityCallback();
  // Store the role returned by updateCurrentUser so we can redirect correctly
  const roleRef = useRef<UserRole | null>(null);

  const onSync = useCallback(async () => {
    const result = await updateCurrentUser();
    roleRef.current = result.role;
  }, [updateCurrentUser]);

  const navigateByRole = useCallback(() => {
    const role = roleRef.current;
    if (role) {
      router.replace(getPortalForRole(role));
    } else {
      router.replace("/");
    }
  }, [router]);

  const navigateHome = useCallback(() => router.replace("/"), [router]);

  const { status, error, retry } = useAuthCallback({
    isBackendAuthenticated: isConvexAuthenticated,
    onSync,
    onSuccess: navigateByRole,
    onNoAuthParams: navigateHome,
  });

  if (status === "error" && error) {
    return (
      <div className="flex flex-col items-center justify-center h-svh gap-6 px-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-destructive font-medium">Something went wrong</p>
          <p className="text-sm text-muted-foreground max-w-md">{error}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={navigateHome}>
            Return home
          </Button>
          <Button onClick={retry}>Try again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-svh gap-4">
      <Spinner className="size-8" />
      <p className="text-sm text-muted-foreground">Signing you in...</p>
    </div>
  );
}

