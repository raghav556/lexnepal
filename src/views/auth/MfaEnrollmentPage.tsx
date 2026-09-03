"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "@/client/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { localAuthClient } from "@/client/auth/local-auth-client";
import { apiClient } from "@/client/api/client";
import { queryKeys } from "@/client/queries/query-keys";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordConfirmDialog } from "@/components/auth/PasswordConfirmDialog";
import { TotpEnrollmentPanel } from "@/components/auth/TotpEnrollmentPanel";
import { getPortalForRole, type UserRole } from "@/hooks/use-current-user";
import { normalizeTotpEnrollment, type TotpEnrollmentPayload } from "@/shared/auth/totp";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import type { UserDto } from "@/shared/contracts/identity";

function safeNextPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("://")) return null;
  return raw;
}

export default function MfaEnrollmentPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const session = localAuthClient.useSession();
  const explicitNext = useMemo(() => safeNextPath(params.get("next")), [params]);

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [totpBusy, setTotpBusy] = useState(false);
  const [totpEnrollment, setTotpEnrollment] = useState<TotpEnrollmentPayload | null>(null);

  const sessionUser = session.data?.user
    ? (session.data.user as typeof session.data.user & { twoFactorEnabled?: boolean })
    : undefined;

  const finishEnrollment = useCallback(async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: queryKeys.identity.me });
      const me = await apiClient.request<UserDto>("/api/v1/users/me");
      const dest = explicitNext ?? getPortalForRole(me.role as UserRole);
      window.location.assign(dest);
    } catch {
      window.location.assign(explicitNext ?? "/admin");
    }
  }, [explicitNext, queryClient]);

  useEffect(() => {
    if (session.isPending) return;
    if (!sessionUser) {
      navigate(`/sign-in?next=${encodeURIComponent("/mfa-enroll")}`);
      return;
    }
    if (sessionUser.twoFactorEnabled) {
      void finishEnrollment();
    }
  }, [session.isPending, sessionUser, navigate, finishEnrollment]);

  const beginEnrollment = async (password: string) => {
    setPasswordBusy(true);
    try {
      const result = await localAuthClient.twoFactor.enable({ password });
      if (result.error) throw new Error(result.error.message);
      const data = result.data;
      if (!data?.totpURI) throw new Error("TOTP enrollment did not return a TOTP payload");
      setTotpEnrollment(
        normalizeTotpEnrollment({
          totpURI: data.totpURI,
          backupCodes: data.backupCodes,
        }),
      );
      setPasswordDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "MFA enrollment failed");
    } finally {
      setPasswordBusy(false);
    }
  };

  const confirmEnrollment = async (code: string) => {
    setTotpBusy(true);
    try {
      const result = await localAuthClient.twoFactor.verifyTotp({ code, trustDevice: false });
      if (result.error) throw new Error(result.error.message);
      toast.success("Multi-factor authentication is enabled");
      await finishEnrollment();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid authenticator code");
    } finally {
      setTotpBusy(false);
    }
  };

  if (session.isPending) {
    return (
      <main className="grid min-h-screen place-items-center bg-muted/30 p-4">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!sessionUser) return null;

  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            Required MFA enrollment
          </CardTitle>
          <CardDescription>
            Administrators and partners must enroll an authenticator before accessing Srimar Law.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!totpEnrollment ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Signed in as{" "}
                <span className="font-medium text-foreground">{sessionUser.email}</span>. Confirm
                your password to generate a QR code for your authenticator app.
              </p>
              <Button className="w-full" onClick={() => setPasswordDialogOpen(true)}>
                Set up authenticator
              </Button>
            </div>
          ) : (
            <TotpEnrollmentPanel
              enrollment={totpEnrollment}
              busy={totpBusy}
              confirmLabel="Confirm and continue"
              onConfirm={confirmEnrollment}
            />
          )}
        </CardContent>
      </Card>

      <PasswordConfirmDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
        title="Verify your password"
        description="Enter your current password to begin MFA enrollment."
        confirmLabel="Create authenticator secret"
        busy={passwordBusy}
        onConfirm={beginEnrollment}
      />
    </main>
  );
}
