import { useCallback, useRef } from "react";
import { useNavigate } from "@/client/navigation";
import { useAuthCallback } from "@usehercules/auth/react";
import { useLegacyIdentityCallback } from "@/client/queries/identity";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Button } from "@/components/ui/button.tsx";
import { getPortalForRole, type UserRole } from "@/hooks/use-current-user";

export default function AuthCallback() {
  const navigate = useNavigate();
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
      navigate(getPortalForRole(role), { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const navigateHome = useCallback(() => navigate("/", { replace: true }), [navigate]);

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
