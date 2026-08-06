import { Button } from "@/components/ui/button.tsx";
import { LogIn } from "lucide-react";

const authority = process.env.VITE_HERCULES_OIDC_AUTHORITY;
const clientId = process.env.VITE_HERCULES_OIDC_CLIENT_ID;

type SignInButtonProps = {
  /** After local sign-in, prefer this portal path when the account role allows it. */
  next?: string;
};

/**
 * Sign-in button.
 * - Local (default): navigates to Better Auth `/sign-in`.
 * - Hercules: when VITE_HERCULES_OIDC_* are set, redirects to the OIDC authorize URL.
 */
export function SignInButton({ next }: SignInButtonProps = {}) {
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
      window.location.href = `${authority.replace(/\/$/, "")}/authorize?${params.toString()}`;
      return;
    }

    const target = next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in";
    window.location.href = target;
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleSignIn} className="gap-2">
      <LogIn className="w-4 h-4" />
      Sign In
    </Button>
  );
}
