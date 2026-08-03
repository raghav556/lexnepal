/**
 * Auth hook — uses Convex identity when live; mock profile when VITE_USE_MOCK=true.
 */

import { useConvexAuth, useQuery } from "@/client/data/convex-bridge.ts";
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

const useMock = import.meta.env.VITE_USE_MOCK === "true";

export function useAuth(): AuthState {
  const backend = useDomainBackend("identity");
  const { isLoading, isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(api.users.getCurrentUser, backend === "convex" ? {} : "skip");
  const localSession = localAuthClient.useSession();

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

  if (backend === "next") {
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
      isAuthenticated && currentUser
        ? {
            profile: {
              name: currentUser.name,
              email: currentUser.email,
            },
          }
        : null,
    isLoading,
    isAuthenticated: !!isAuthenticated,
    signout: async () => {
      window.location.href = "/";
    },
  };
}
