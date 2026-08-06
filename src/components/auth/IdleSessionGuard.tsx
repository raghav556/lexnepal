"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Clock3 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AUTH_IDLE_TIMEOUT, AUTH_REDIRECT_REASON_KEY } from "@/client/auth/auth-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatIdleCountdown, getIdleTimeoutConfig } from "@/shared/auth/session-idle";

const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll", "mousemove"] as const;

type IdleSessionGuardProps = {
  enabled?: boolean;
};

export function IdleSessionGuard({ enabled = true }: IdleSessionGuardProps) {
  const { signout, isAuthenticated } = useAuth();
  const { warningMs, logoutMs } = getIdleTimeoutConfig();
  const idleLimitMs = logoutMs - warningMs;

  const [warningOpen, setWarningOpen] = useState(false);
  const [remainingMs, setRemainingMs] = useState(warningMs);

  const lastActivityRef = useRef(Date.now());
  const warningOpenRef = useRef(false);
  const signedOutRef = useRef(false);

  const markActive = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (warningOpenRef.current) {
      warningOpenRef.current = false;
      setWarningOpen(false);
    }
  }, []);

  const signOutForIdle = useCallback(async () => {
    if (signedOutRef.current) return;
    signedOutRef.current = true;
    sessionStorage.setItem(AUTH_REDIRECT_REASON_KEY, AUTH_IDLE_TIMEOUT);
    await signout();
  }, [signout]);

  useEffect(() => {
    if (!enabled || !isAuthenticated) return;

    const onActivity = () => markActive();
    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, onActivity, { passive: true });
    }

    const interval = window.setInterval(() => {
      const idleMs = Date.now() - lastActivityRef.current;

      if (idleMs >= logoutMs) {
        void signOutForIdle();
        return;
      }

      if (idleMs >= idleLimitMs) {
        const left = logoutMs - idleMs;
        setRemainingMs(left);
        if (!warningOpenRef.current) {
          warningOpenRef.current = true;
          setWarningOpen(true);
        }
      }
    }, 1000);

    return () => {
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, onActivity);
      }
      window.clearInterval(interval);
    };
  }, [enabled, idleLimitMs, isAuthenticated, logoutMs, markActive, signOutForIdle]);

  if (!enabled || !isAuthenticated) return null;

  return (
    <Dialog
      open={warningOpen}
      onOpenChange={(open) => {
        if (!open) markActive();
        warningOpenRef.current = open;
        setWarningOpen(open);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock3 className="size-5 text-amber-500" />
            Session expiring soon
          </DialogTitle>
          <DialogDescription>
            You have been inactive. For security, you will be signed out in{" "}
            <span className="font-medium text-foreground">{formatIdleCountdown(remainingMs)}</span> unless you
            continue working.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => void signOutForIdle()}>
            Sign out now
          </Button>
          <Button onClick={markActive}>Stay signed in</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
