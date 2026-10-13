import React, { useSyncExternalStore } from "react";
export * from "../visual/support/adapters";

const blocked = () => {
  throw new Error("Navigation fixture commands are disabled");
};
let identityRole = "staff";
const subscribe = (listener: () => void) => {
  window.addEventListener("popstate", listener);
  return () => window.removeEventListener("popstate", listener);
};
export function usePathname() {
  return useSyncExternalStore(subscribe, () => window.location.pathname);
}
export function navigate(path: string, replace = false) {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Invalid fixture path");
  window.history[replace ? "replaceState" : "pushState"]({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
export function setIdentityRole(role: string) {
  identityRole = role;
  window.dispatchEvent(new PopStateEvent("popstate"));
}
export const useRouter = () => ({
  push: navigate,
  replace: (path: string) => navigate(path, true),
  refresh: blocked,
});
export const useAuth = () => ({
  identityUser: {
    id: "navigation-fixture",
    name: "Synthetic shell reviewer",
    email: "navigation@example.invalid",
    role: identityRole,
  },
  isLoading: false,
  isAuthenticated: true,
  signout: blocked,
});
export const useAuthContext = useAuth;
export const useCurrentUser = () => useAuth().identityUser;
export const getPortalForRole = (role: string) =>
  role === "admin" ? "/admin" : role === "client" ? "/client" : "/staff";
export const CommandCenter = () => null;
export const useLeads = () => ({ data: [] });
export const useLeaveRequests = () => [];
export const useClients = (options?: { enabled?: boolean }) =>
  options?.enabled === false
    ? []
    : [
        {
          _id: "search-client",
          fullName: "Synthetic Search Client",
          email: "search@example.invalid",
          type: "individual",
        },
      ];
export function FixtureLink({ href, onClick, children, ...props }: React.ComponentProps<"a">) {
  return (
    <a
      href={href}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (
          !event.defaultPrevented &&
          href?.startsWith("/") &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey
        ) {
          event.preventDefault();
          navigate(href);
        }
      }}
    >
      {children}
    </a>
  );
}
export default FixtureLink;
