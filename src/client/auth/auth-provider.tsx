"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { localAuthClient } from "@/client/auth/local-auth-client";
import { apiClient } from "@/client/api/client";
import { ApiClientError } from "@/client/api/errors";
import { queryKeys } from "@/client/queries/query-keys";
import type { UserDto } from "@/shared/contracts/identity";

export const AUTH_REDIRECT_REASON_KEY = "auth_redirect_reason";
export const AUTH_SESSION_EXPIRED = "session_expired";
export const AUTH_IDLE_TIMEOUT = "idle_timeout";
export const MFA_ENROLLMENT_REQUIRED = "MFA_ENROLLMENT_REQUIRED";

function isMfaEnrollmentRequired(error: ApiClientError): boolean {
  const details = error.details as { reason?: string } | undefined;
  return error.status === 403 && details?.reason === MFA_ENROLLMENT_REQUIRED;
}

export type AuthContextValue = {
  /** undefined = hydrating, null = signed out, UserDto = signed in */
  identityUser: UserDto | null | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  signout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function currentPathWithSearch(): string {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const session = localAuthClient.useSession();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const hasSession = Boolean(session.data?.user);
  const sessionPending = session.isPending;

  const meQuery = useQuery({
    queryKey: queryKeys.identity.me,
    queryFn: ({ signal }) => apiClient.request<UserDto>("/api/v1/users/me", { signal }),
    enabled: hasSession && !sessionPending,
    retry: (failureCount, error) => {
      if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) {
        return false;
      }
      return failureCount < 1;
    },
    staleTime: 30_000,
  });

  const redirectToSignIn = useCallback(
    async (reason?: string) => {
      if (isRedirecting) return;
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/sign-in")) return;

      setIsRedirecting(true);
      const next = encodeURIComponent(currentPathWithSearch());
      try {
        await localAuthClient.signOut();
      } catch {
        // Still redirect when the session cookie is already invalid.
      }
      queryClient.removeQueries({ queryKey: queryKeys.identity.me });
      if (reason) {
        sessionStorage.setItem(AUTH_REDIRECT_REASON_KEY, reason);
      }
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/sign-in?next=${next}`);
    },
    [isRedirecting, queryClient],
  );

  useEffect(() => {
    if (!meQuery.isError) return;
    if (!(meQuery.error instanceof ApiClientError)) return;

    if (meQuery.error.status === 401) {
      const timeout = window.setTimeout(() => void redirectToSignIn(AUTH_SESSION_EXPIRED), 0);
      return () => window.clearTimeout(timeout);
    }

    if (isMfaEnrollmentRequired(meQuery.error)) {
      if (typeof window === "undefined") return;
      if (window.location.pathname.startsWith("/mfa-enroll")) return;
      const next = encodeURIComponent(currentPathWithSearch());
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/mfa-enroll?next=${next}`);
    }
  }, [meQuery.isError, meQuery.error, redirectToSignIn]);

  const identityUser = useMemo((): UserDto | null | undefined => {
    if (sessionPending) return undefined;
    if (!hasSession) return null;
    if (meQuery.isPending) return undefined;
    if (meQuery.isError) {
      if (meQuery.error instanceof ApiClientError) {
        if (meQuery.error.status === 401) return undefined;
        if (isMfaEnrollmentRequired(meQuery.error)) return undefined;
      }
      return null;
    }
    return meQuery.data ?? null;
  }, [sessionPending, hasSession, meQuery.isPending, meQuery.isError, meQuery.error, meQuery.data]);

  const isLoading =
    sessionPending ||
    isRedirecting ||
    (hasSession && meQuery.isPending) ||
    (hasSession &&
      meQuery.isError &&
      meQuery.error instanceof ApiClientError &&
      (meQuery.error.status === 401 || isMfaEnrollmentRequired(meQuery.error)));

  const isAuthenticated = identityUser != null;

  const signout = useCallback(async () => {
    await localAuthClient.signOut();
    queryClient.removeQueries({ queryKey: queryKeys.identity.me });
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/sign-in";
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      identityUser,
      isLoading,
      isAuthenticated,
      signout,
    }),
    [identityUser, isLoading, isAuthenticated, signout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}

/** Read auth context when provider may be absent (e.g. isolated tests). */
export function useOptionalAuthContext(): AuthContextValue | null {
  return useContext(AuthContext);
}
