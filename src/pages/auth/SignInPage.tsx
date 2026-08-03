import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { localAuthClient } from "@/client/auth/local-auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (needsTwoFactor) {
        const result = await localAuthClient.twoFactor.verifyTotp({ code, trustDevice: false });
        if (result.error) throw new Error(result.error.message);
      } else {
        const result = await localAuthClient.signIn.email({ email, password, rememberMe: false });
        if (result.error) throw new Error(result.error.message);
        if ((result.data as typeof result.data & { twoFactorRedirect?: boolean })?.twoFactorRedirect) {
          setNeedsTwoFactor(true);
          return;
        }
      }
      const response = await fetch("/api/v1/auth/session", { credentials: "include" });
      const session = await response.json();
      if (!response.ok && session.error?.details?.reason === "MFA_ENROLLMENT_REQUIRED") {
        navigate("/mfa-enroll");
        return;
      }
      if (!response.ok) throw new Error(session.error?.message ?? "Session could not be established");
      const role = session.data?.user?.role;
      navigate(role === "admin" ? "/admin" : role === "client" ? "/client" : "/staff");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="min-h-screen grid place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {needsTwoFactor ? "Two-factor verification" : "Sign in to LexNepal"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {needsTwoFactor ? (
              <div>
                <Label htmlFor="code">Authenticator code</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  required
                />
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>
              </>
            )}
            <Button className="w-full" disabled={busy}>
              {busy ? "Please wait…" : needsTwoFactor ? "Verify" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
