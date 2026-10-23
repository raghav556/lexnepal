import { useSyncExternalStore, type ComponentProps } from "react";
import type { UserDto } from "@/shared/contracts/identity";

// Only routing/identity/idle boundaries are adapted. Appointment hooks and fetch are real.
const blocked = () => {
  throw new Error("Fixture identity mutations are disabled");
};
const user = {
  id: "71000000-0000-4000-8000-000000000001",
  _id: "71000000-0000-4000-8000-000000000001",
  name: "Prabin Shrestha",
  role: "associate",
  email: "staff@example.invalid",
} as UserDto;
const subscribe = (callback: () => void) => {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
};
export const usePathname = () => useSyncExternalStore(subscribe, () => location.pathname);
export function useSearchParams() {
  const search = useSyncExternalStore(subscribe, () => location.search);
  return new URLSearchParams(search);
}
export function navigate(path: string) {
  history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
export const useRouter = () => ({ push: navigate, replace: navigate, refresh: blocked });
export const useNavigate = () => navigate;
export const useLocation = () => ({ pathname: usePathname(), search: location.search });
export const useAuthContext = () => ({
  identityUser: user,
  isAuthenticated: true,
  isLoading: false,
  signout: blocked,
});
export const localAuthClient = {
  signOut: blocked,
  twoFactor: { enable: blocked, verifyTotp: blocked, disable: blocked },
};
export const IdleSessionGuard = () => null;
export default function FixtureLink({ href, onClick, ...props }: ComponentProps<"a">) {
  return (
    <a
      href={href}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (href?.startsWith("/") && !event.defaultPrevented) {
          event.preventDefault();
          navigate(href);
        }
      }}
    />
  );
}
export { FixtureLink as Link };
