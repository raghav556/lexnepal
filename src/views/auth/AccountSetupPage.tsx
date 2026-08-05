import { useState } from "react";
import { useNavigate, useSearchParams } from "@/client/navigation";
import { localAuthClient } from "@/client/auth/local-auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AccountSetupPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return toast.error("The invitation link is invalid");
    if (password.length < 12) return toast.error("Use at least 12 characters");
    if (password !== confirmation) return toast.error("Passwords do not match");
    setBusy(true);
    try {
      const result = await localAuthClient.resetPassword({ newPassword: password, token });
      if (result.error) throw new Error(result.error.message);
      toast.success("Password set. You can now sign in.");
      navigate("/sign-in");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Account activation failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="min-h-screen grid place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Activate your LexNepal account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <div>
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
              {busy ? "Activating…" : "Activate account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
