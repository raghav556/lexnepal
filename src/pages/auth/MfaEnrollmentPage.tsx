import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { localAuthClient } from "@/client/auth/local-auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function MfaEnrollmentPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const begin = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await localAuthClient.twoFactor.enable({ password });
      if (result.error) throw new Error(result.error.message);
      setTotpUri(result.data.totpURI);
      setBackupCodes(result.data.backupCodes);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "MFA enrollment failed");
    } finally { setBusy(false); }
  };

  const confirm = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await localAuthClient.twoFactor.verifyTotp({ code, trustDevice: false });
      if (result.error) throw new Error(result.error.message);
      toast.success("Multi-factor authentication is enabled");
      navigate("/admin");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid authenticator code");
    } finally { setBusy(false); }
  };

  return <main className="min-h-screen grid place-items-center bg-muted/30 p-4">
    <Card className="w-full max-w-xl"><CardHeader><CardTitle>Required MFA enrollment</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {!totpUri ? <form onSubmit={begin} className="space-y-4">
          <p className="text-sm text-muted-foreground">Administrators and partners must enroll an authenticator before accessing LexNepal.</p>
          <div><Label htmlFor="password">Current password</Label><Input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
          <Button className="w-full" disabled={busy}>Create authenticator secret</Button>
        </form> : <form onSubmit={confirm} className="space-y-4">
          <div><Label>Authenticator URI</Label><code className="block break-all rounded bg-muted p-3 text-xs">{totpUri}</code></div>
          <div><Label>One-time backup codes</Label><code className="block whitespace-pre-wrap rounded bg-muted p-3 text-xs">{backupCodes.join("\n")}</code><p className="mt-1 text-xs text-muted-foreground">Store these codes securely. They are shown once.</p></div>
          <div><Label htmlFor="code">Six-digit code</Label><Input id="code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} required /></div>
          <Button className="w-full" disabled={busy}>Confirm and continue</Button>
        </form>}
      </CardContent>
    </Card>
  </main>;
}
