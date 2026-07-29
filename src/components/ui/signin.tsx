import { Button } from "@/components/ui/button.tsx";
import { LogIn } from "lucide-react";

/**
 * Placeholder sign-in button.
 * When Hercules Auth is configured, this should call the Hercules sign-in flow.
 * For UI preview without a backend, it just shows the button.
 */
export function SignInButton() {
  const handleSignIn = () => {
    // In production this would trigger Hercules auth redirect.
    // For now, alert that auth is not configured for local preview.
    alert("Sign-in requires Hercules Auth to be configured. Set VITE_CONVEX_URL and auth environment variables.");
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleSignIn} className="gap-2">
      <LogIn className="w-4 h-4" />
      Sign In
    </Button>
  );
}
