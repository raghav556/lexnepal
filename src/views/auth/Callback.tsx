import { useCallback, useRef } from "react";
import { useNavigate } from "@/client/navigation";
import { useAuthCallback } from "@/lib/hercules-react-shim";
import { apiClient } from "@/client/api/client";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Button } from "@/components/ui/button.tsx";
import { getPortalForRole, type UserRole } from "@/hooks/use-current-user";

/**
 * OIDC redirect landing page, used when AUTH_PROVIDER=hercules. The provider has already
 * authenticated the visitor by the time we get here; POSTing the session exchanges that for our own
 * session cookie and tells us which portal the user belongs in.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const roleRef = useRef<UserRole | null>(null);

  const onSync = useCallback(async () => {
    const session = await apiClient.request<{ user: { role: string } }>("/api/v1/auth/session", {
      method: "POST",
      body: {},
    });
    roleRef.current = (session.user?.role as UserRole) ?? null;
  }, []);

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
    isBackendAuthenticated: true,
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
