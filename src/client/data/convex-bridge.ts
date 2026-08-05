/**
 * Transitional Convex boundary.
 *
 * When every domain flag is `next`, export no-op hooks so product UI and adapters
 * do not require ConvexProvider. When any domain is `convex`/`shadow`, re-export
 * real convex/react (provider required for rollback).
 *
 * Delete this bridge after the last Convex-backed domain is cut over (cleanup C2).
 */
import { createElement, Fragment, type ReactNode } from "react";
import * as ConvexReact from "convex/react";
import { readBuildBackendFlags } from "@/client/data/backend-config";

const flags = readBuildBackendFlags();
export const convexRuntimeEnabled = Object.values(flags).some(
  (value) => value === "convex" || value === "shadow",
);

function NoopProvider({ children }: { children: ReactNode }) {
  return createElement(Fragment, null, children);
}

const noopQuery = ((_query: unknown, args: unknown) =>
  args === "skip" ? undefined : undefined) as unknown as typeof ConvexReact.useQuery;

const noopMutation = ((_mutation: unknown) => {
  const mutate = async () => {
    throw new Error("Convex mutations are disabled while all BACKEND_* flags are next");
  };
  return Object.assign(mutate, { withOptimisticUpdate: () => mutate });
}) as unknown as typeof ConvexReact.useMutation;

const noopConvexAuth = (() => ({
  isLoading: false,
  isAuthenticated: false,
})) as unknown as typeof ConvexReact.useConvexAuth;

const Always = ({ children }: { children: ReactNode }) =>
  createElement(Fragment, null, children);
const Never = (_props: { children: ReactNode }) => null;

export const useQuery = convexRuntimeEnabled ? ConvexReact.useQuery : noopQuery;
export const useMutation = convexRuntimeEnabled ? ConvexReact.useMutation : noopMutation;
export const useAction = convexRuntimeEnabled
  ? ConvexReact.useAction
  : (noopMutation as unknown as typeof ConvexReact.useAction);
export const useConvexAuth = convexRuntimeEnabled ? ConvexReact.useConvexAuth : noopConvexAuth;
export const ConvexProvider = convexRuntimeEnabled ? ConvexReact.ConvexProvider : NoopProvider;
export const ConvexReactClient = ConvexReact.ConvexReactClient;
export const Authenticated = convexRuntimeEnabled ? ConvexReact.Authenticated : Always;
export const Unauthenticated = convexRuntimeEnabled ? ConvexReact.Unauthenticated : Never;
export const AuthLoading = convexRuntimeEnabled ? ConvexReact.AuthLoading : Never;

export const PreviewProvider =
  ((ConvexReact as { PreviewProvider?: typeof NoopProvider }).PreviewProvider as
    | typeof NoopProvider
    | undefined) || NoopProvider;
