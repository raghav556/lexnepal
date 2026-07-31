/**
 * Auth hook — uses Convex identity when live; mock profile when VITE_USE_MOCK=true.
 */

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";

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
  const { isLoading, isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(api.users.getCurrentUser);

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
