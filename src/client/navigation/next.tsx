"use client";

import NextLink from "next/link";
import {
  useRouter,
  useParams as useNextParams,
  usePathname as useNextPathname,
  useSearchParams as useNextSearchParams,
} from "next/navigation";
import { useCallback } from "react";
import type { AppLinkProps, NavigateFunction, SearchParamsTuple } from "./types";

export function Link({ href, children, replace, prefetch, ...rest }: AppLinkProps) {
  return (
    <NextLink href={href} replace={replace} prefetch={prefetch} {...rest}>
      {children}
    </NextLink>
  );
}

export function useNavigate(): NavigateFunction {
  const router = useRouter();
  return useCallback(
    (to, options) => {
      if (options?.replace) router.replace(to);
      else router.push(to);
    },
    [router],
  );
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T {
  return useNextParams() as T;
}

export function usePathname(): string {
  return useNextPathname();
}

export function useSearchParams(): SearchParamsTuple {
  const params = useNextSearchParams();
  const router = useRouter();
  const pathname = useNextPathname();
  const setParams = useCallback(
    (nextInit: URLSearchParams) => {
      const q = nextInit.toString();
      router.replace(q ? `${pathname}?${q}` : pathname);
    },
    [router, pathname],
  );
  return [params, setParams];
}

export type { AppLinkProps, NavigateFunction, NavigateOptions, SearchParamsTuple } from "./types";
