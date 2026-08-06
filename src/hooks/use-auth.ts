/** Auth hook — reads the Better Auth session. */

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

export function useAuth(): AuthState {
  const localSession = localAuthClient.useSession();

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
