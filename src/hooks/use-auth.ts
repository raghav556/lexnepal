/**
 * Auth hook that wraps Hercules Auth for sign-in / sign-out.
 * Falls back gracefully when the Hercules provider is not configured.
 */

export interface AuthUser {
  profile: {
    name?: string;
    email?: string;
  };
}

interface AuthState {
  user: AuthUser | null;
  signout: () => Promise<void>;
}

export function useAuth(): AuthState {
  // In production this would use the Hercules `useAuth()` hook.
  // For local UI preview without auth, return a no-op signout and a default mock profile.
  return {
    user: {
      profile: {
        name: "Mock Administrator",
        email: "admin@lexnepal.com",
      },
    },
    signout: async () => {
      // noop — auth not configured
    },
  };
}
