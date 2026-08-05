/**
 * Auth hook — Better Auth (Next) when identity=next; Convex only when identity=convex/shadow.
 * Mock profile when VITE_USE_MOCK=true.
 */

import { useConvexAuth, useQuery, convexRuntimeEnabled } from "@/client/data/convex-bridge.ts";
import { api } from "@/convex/_generated/api.js";
import { useDomainBackend } from "@/client/data/provider";
import { localAuthClient } from "@/client/auth/local-auth-client";

export interface AuthUser {
  profile: {
    name?: string;
    email?: string;
  };
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signout: () => Promise<void>;
}

const useMock =
  (typeof process !== "undefined" ? process.env.VITE_USE_MOCK : import.meta.env.VITE_USE_MOCK) ===
  "true";

export function useAuth(): AuthState {
  const backend = useDomainBackend("identity");
  const localSession = localAuthClient.useSession();
  const { isLoading: convexLoading, isAuthenticated: convexAuthed } = useConvexAuth();
  const currentUser = useQuery(
    api.users.getCurrentUser,
    backend === "convex" && convexRuntimeEnabled ? {} : "skip",
  );

  if (useMock) {
    return {
      user: {
        profile: {
          name: "Mock Administrator",
          email: "admin@srimarlaw.com.np",
        },
      },
      isLoading: false,
      isAuthenticated: true,
      signout: async () => {
        /* noop in mock */
      },
    };
  }

  if (backend === "next" || !convexRuntimeEnabled) {
    return {
      user: localSession.data?.user
        ? { profile: { name: localSession.data.user.name, email: localSession.data.user.email } }
        : null,
      isLoading: localSession.isPending,
      isAuthenticated: Boolean(localSession.data?.user),
      signout: async () => {
        await localAuthClient.signOut();
        window.location.href = "/sign-in";
      },
    };
  }

  return {
    user:
      convexAuthed && currentUser
        ? {
            profile: {
              name: currentUser.name,
              email: currentUser.email,
            },
          }
        : null,
    isLoading: convexLoading,
    isAuthenticated: !!convexAuthed,
    signout: async () => {
      window.location.href = "/";
    },
  };
}
