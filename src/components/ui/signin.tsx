import { Button } from "@/components/ui/button.tsx";
import { LogIn } from "lucide-react";

const useMock = (typeof process !== "undefined" ? process.env.VITE_USE_MOCK : import.meta.env.VITE_USE_MOCK) === "true";
const authority = (typeof process !== "undefined" ? process.env.VITE_HERCULES_OIDC_AUTHORITY : import.meta.env.VITE_HERCULES_OIDC_AUTHORITY) as string | undefined;
const clientId = (typeof process !== "undefined" ? process.env.VITE_HERCULES_OIDC_CLIENT_ID : import.meta.env.VITE_HERCULES_OIDC_CLIENT_ID) as string | undefined;

/**
 * Sign-in button.
 * Live: redirects to OIDC authorize endpoint when configured.
 * Mock: navigates to admin portal for local demo.
 */
export function SignInButton() {
  const handleSignIn = () => {
    if (useMock) {
      window.location.href = "/admin";
      return;
    }

    if (!authority || !clientId) {
      alert(
        "Sign-in is not configured. Set VITE_HERCULES_OIDC_AUTHORITY and VITE_HERCULES_OIDC_CLIENT_ID, or enable VITE_USE_MOCK=true for offline demo.",
      );
      return;
    }

    const redirectUri =
      ((typeof process !== "undefined" ? process.env.VITE_AUTH_REDIRECT_URI : import.meta.env.VITE_AUTH_REDIRECT_URI) as string | undefined) ||
      `${window.location.origin}/auth/callback`;
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

