"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useNavigate } from "@/client/navigation";
import { localAuthClient } from "@/client/auth/local-auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

/**
 * First-time invite activation. Uses the same Better Auth reset token as password reset,
 * but with invite-oriented copy. Forgotten passwords use /reset-password.
 */
export default function AccountSetupPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);

  const hasToken = useMemo(() => token.length > 0, [token]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return toast.error("This invitation link is invalid or incomplete");
    if (password.length < 12) return toast.error("Use at least 12 characters");
    if (password !== confirmation) return toast.error("Passwords do not match");
    setBusy(true);
    try {
      const result = await localAuthClient.resetPassword({ newPassword: password, token });
      if (result.error) throw new Error(result.error.message);
      toast.success("Account activated. Sign in with your new password.");
      navigate("/sign-in", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Account activation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Link
            href="/sign-in"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to sign in
          </Link>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            Activate your Srimar Law account
          </CardTitle>
          <CardDescription>
            {hasToken
              ? "Choose a password to finish your firm invitation. You will sign in afterward."
              : "Open the activation link from your invitation email to continue."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasToken ? (
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                Ask your administrator to resend the setup email from{" "}
                <strong className="text-foreground">Admin → Users</strong>, then use the new link.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/sign-in">Return to sign in</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  autoFocus
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <PasswordStrengthIndicator password={password} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmation">Confirm password</Label>
                <Input
                  id="confirmation"
                  type="password"
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  required
                />
              </div>
              <Button className="w-full" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Activating…
                  </>
                ) : (
                  "Activate account"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
