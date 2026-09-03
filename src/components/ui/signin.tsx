import { Button } from "@/components/ui/button.tsx";
import { LogIn } from "lucide-react";
import { signInPathForPortal, type PortalIntent } from "@/shared/auth/portal-intent";

const authority = process.env.VITE_HERCULES_OIDC_AUTHORITY;
const clientId = process.env.VITE_HERCULES_OIDC_CLIENT_ID;

type SignInButtonProps = {
  /** After local sign-in, prefer this portal path when the account role allows it. */
  next?: string;
  /** Preset portal tab on the unified sign-in page. */
  portal?: PortalIntent;
};

/**
 * Sign-in button.
 * - Local (default): navigates to Better Auth `/sign-in`.
 * - Hercules: when VITE_HERCULES_OIDC_* are set, redirects to the OIDC authorize URL.
 */
export function SignInButton({ next, portal = "client" }: SignInButtonProps = {}) {
  const handleSignIn = () => {
    if (authority && clientId) {
      const redirectUri =
        process.env.VITE_AUTH_REDIRECT_URI || `${window.location.origin}/auth/callback`;
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid profile email",
      });
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = `${authority.replace(/\/$/, "")}/authorize?${params.toString()}`;
      return;
    }

    window.location.href = signInPathForPortal(portal, next);
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleSignIn} className="gap-2">
      <LogIn className="w-4 h-4" />
      Sign In
    </Button>
  );
}
