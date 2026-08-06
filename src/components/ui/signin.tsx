import { Button } from "@/components/ui/button.tsx";
import { LogIn } from "lucide-react";

const authority = process.env.VITE_HERCULES_OIDC_AUTHORITY;
const clientId = process.env.VITE_HERCULES_OIDC_CLIENT_ID;

/** Sign-in button; redirects to the OIDC authorize endpoint when one is configured. */
export function SignInButton() {
  const handleSignIn = () => {
    if (!authority || !clientId) {
      alert(
        "Sign-in is not configured. Set VITE_HERCULES_OIDC_AUTHORITY and VITE_HERCULES_OIDC_CLIENT_ID.",
      );
      return;
    }

    const redirectUri =
      process.env.VITE_AUTH_REDIRECT_URI || `${window.location.origin}/auth/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid profile email",
    });
    window.location.href = `${authority.replace(/\/$/, "")}/authorize?${params.toString()}`;
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleSignIn} className="gap-2">
      <LogIn className="w-4 h-4" />
      Sign In
    </Button>
  );
}
