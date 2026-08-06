import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "@/client/navigation";
import { localAuthClient } from "@/client/auth/local-auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const mode = useMemo(() => (token ? "reset" as const : "request" as const), [token]);

  const requestReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: window.location.origin,
        },
        body: JSON.stringify({ email, redirectTo }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof body.message === "string" ? body.message : "Could not send reset email");
      }
      setSent(true);
      toast.success("If an account exists for that email, reset instructions were sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send reset email");
    } finally {
      setBusy(false);
    }
  };

  const submitNewPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 12) return toast.error("Use at least 12 characters");
    if (password !== confirmation) return toast.error("Passwords do not match");
    setBusy(true);
    try {
      const result = await localAuthClient.resetPassword({ newPassword: password, token });
      if (result.error) throw new Error(result.error.message);
      toast.success("Password updated. You can now sign in.");
      window.location.href = "/sign-in";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Password reset failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-dvh grid place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Link
            href="/sign-in"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to sign in
          </Link>
          <CardTitle>{mode === "request" ? "Reset your password" : "Choose a new password"}</CardTitle>
          <CardDescription>
            {mode === "request"
              ? "Enter your work email and we will send a secure reset link if the account exists."
              : "Set a new password for your LexNepal account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "request" ? (
            sent ? (
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  Check your inbox for <strong className="text-foreground">{email}</strong>. The link expires
                  after a short time for security.
                </p>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/sign-in">Return to sign in</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={requestReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Work email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    autoFocus
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <Button className="w-full" disabled={busy}>
                  {busy ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Mail className="size-4" />
                      Send reset link
                    </>
                  )}
                </Button>
              </form>
            )
          ) : (
            <form onSubmit={submitNewPassword} className="space-y-4">
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
                {busy ? "Saving…" : "Update password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
