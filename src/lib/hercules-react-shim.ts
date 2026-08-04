"use client";
/**
 * Shim for @usehercules/auth/react
 *
 * The @usehercules/auth package doesn't publish a /react sub-path.
 * This shim provides the useAuthCallback hook for the auth callback page.
 * In a production build, this would be replaced with the real implementation.
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface AuthCallbackOptions {
  isBackendAuthenticated: boolean;
  onSync: () => Promise<void>;
  onSuccess: () => void;
  onNoAuthParams: () => void;
}

type AuthStatus = "loading" | "syncing" | "success" | "error";

export function useAuthCallback(options: AuthCallbackOptions) {
  const { isBackendAuthenticated, onSync, onSuccess, onNoAuthParams } = options;
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const syncedRef = useRef(false);

  useEffect(() => {
    // Check URL for auth params
    const params = new URLSearchParams(window.location.search);
    const hasAuthParams = params.has("code") || params.has("state") || window.location.hash.includes("access_token");

    if (!hasAuthParams) {
      onNoAuthParams();
      return;
    }

    if (isBackendAuthenticated && !syncedRef.current) {
      syncedRef.current = true;
      setStatus("syncing");
      onSync()
        .then(() => {
          setStatus("success");
          onSuccess();
        })
        .catch((err) => {
          setStatus("error");
          setError(err?.message ?? "Authentication failed");
        });
    }
  }, [isBackendAuthenticated, onSync, onSuccess, onNoAuthParams]);

  const retry = useCallback(() => {
    syncedRef.current = false;
    setStatus("loading");
    setError(null);
  }, []);

  return { status, error, retry };
}
