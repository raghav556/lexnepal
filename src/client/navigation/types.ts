import type { ComponentProps, ReactNode } from "react";

export type NavigateOptions = {
  replace?: boolean;
};

export type NavigateFunction = (to: string, options?: NavigateOptions) => void;

export type AppLinkProps = {
  href: string;
  children?: ReactNode;
  className?: string;
  replace?: boolean;
  prefetch?: boolean;
  onClick?: ComponentProps<"a">["onClick"];
  target?: string;
  rel?: string;
} & Omit<ComponentProps<"a">, "href">;

export type SearchParamsTuple = [
  { get: (name: string) => string | null; toString: () => string },
  (nextInit: URLSearchParams) => void,
];
