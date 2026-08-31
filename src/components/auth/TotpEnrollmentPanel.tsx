"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { TotpQrCode } from "@/components/auth/TotpQrCode";
import type { TotpEnrollmentPayload } from "@/shared/auth/totp";

type TotpEnrollmentPanelProps = {
  enrollment: TotpEnrollmentPayload;
  busy?: boolean;
  confirmLabel?: string;
  onConfirm: (code: string) => void | Promise<void>;
  onCancel?: () => void;
};

export function TotpEnrollmentPanel({
  enrollment,
  busy = false,
  confirmLabel = "Confirm & enable",
  onConfirm,
  onCancel,
}: TotpEnrollmentPanelProps) {
  const [code, setCode] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!code.trim()) return;
    await onConfirm(code.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <TotpQrCode otpauthUrl={enrollment.otpauthUrl} />
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Scan this QR code with Google Authenticator, Authy, or another TOTP app.
          </p>
          {enrollment.secret ? (
            <div>
              <p className="text-xs font-medium text-foreground">Manual entry key</p>
              <code className="mt-1 block break-all rounded-md bg-muted p-2 text-xs">
                {enrollment.secret}
              </code>
            </div>
          ) : null}
        </div>
      </div>

      {enrollment.backupCodes.length > 0 ? (
        <div className="space-y-2">
          <Label>One-time backup codes</Label>
          <code className="block whitespace-pre-wrap rounded-md bg-muted p-3 text-xs leading-relaxed">
            {enrollment.backupCodes.join("\n")}
          </code>
          <p className="text-xs text-muted-foreground">
            Store these codes securely. They are shown once.
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="totp-code">Six-digit verification code</Label>
        <Input
          id="totp-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          maxLength={8}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\s/g, ""))}
          disabled={busy}
          required
        />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={busy || code.trim().length < 6}>
          {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          {confirmLabel}
        </Button>
      </div>
    </form>
  );
}
