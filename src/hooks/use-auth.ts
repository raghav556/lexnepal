/** Unified auth hook — Better Auth session + /api/v1/users/me via AuthProvider. */

import { useAuthContext } from "@/client/auth/auth-provider";
import type { UserDto } from "@/shared/contracts/identity";

export interface AuthUser {
  profile: {
    name?: string;
    email?: string;
  };
}

interface AuthState {
  /** Legacy session-shaped user for existing UI (identity-first when hydrated). */
  user: AuthUser | null;
  /** LexNepal identity user — undefined while loading, null when signed out. */
  identityUser: UserDto | null | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  signout: () => Promise<void>;
}

export function useAuth(): AuthState {
  const { identityUser, isLoading, isAuthenticated, signout } = useAuthContext();

  const user: AuthUser | null =
    identityUser != null
      ? {
          profile: {
            name: identityUser.name ?? undefined,
            email: identityUser.email ?? undefined,
          },
        }
      : null;

  return {
    user,
    identityUser,
    isLoading,
    isAuthenticated,
    signout,
  };
}
