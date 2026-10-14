import { useMemo, useSyncExternalStore } from "react";
export * from "../navigation/adapters";
export { default, default as Link } from "../navigation/adapters";
import { navigate } from "../navigation/adapters";
import { ApiClientError } from "@/client/api/errors";

export type CasesFixtureState = "populated" | "loading" | "empty" | "error" | "forbidden";
let state: CasesFixtureState = "populated";
let primaryColor: string | undefined;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const createAttempts: Record<string, unknown>[] = [];
export let retryCount = 0;
export function setCasesState(next: CasesFixtureState, brand?: string) {
  state = next;
  primaryColor = brand;
  listeners.forEach((listener) => listener());
}
const clients = [
  { _id: "client-a", fullName: "Synthetic Ravi Sharma" },
  { _id: "client-b", fullName: "Synthetic Himalayan Trading — extended client name" },
];
const users = [
  { _id: "lawyer-a", name: "Synthetic Sita Adhikari", role: "lawyer" },
  { _id: "lawyer-b", name: "Synthetic Nabin Shrestha", role: "paralegal" },
  { _id: "client-user", name: "Excluded Client User", role: "client" },
];
// Twenty-three test-only records exercise the unchanged ten-record pagination.
const records = Array.from({ length: 23 }, (_, index) => ({
  _id: `synthetic-case-${index + 1}`,
  caseNumber: `TEST-2083-${String(index + 1).padStart(3, "0")}`,
  title:
    index === 0
      ? "Synthetic construction dispute — long matter title and full legal identity for narrow-screen review"
      : `Synthetic matter ${index + 1}`,
  status:
    index === 20
      ? "closed_won"
      : index === 21
        ? "closed_lost"
        : ["inquiry", "active", "on_hold", "closed"][index % 4],
  closureOutcome: index === 3 ? "settled" : null,
  practiceArea: "Civil Litigation",
  filingDate: "2026-07-28",
  nextHearing: index === 0 ? "2026-10-28" : null,
  clientId: index % 2 ? "client-b" : "client-a",
  assignedLawyerId: index % 2 ? "lawyer-b" : "lawyer-a",
}));
const hearings = [
  {
    _id: "hearing-a",
    caseId: "synthetic-case-2",
    status: "scheduled",
    dateGregorian: "2026-11-06",
    dateBs: "20 Kartik 2083",
  },
  {
    _id: "hearing-b",
    caseId: "synthetic-case-2",
    status: "scheduled",
    dateGregorian: "2026-10-20",
    dateBs: "03 Kartik 2083",
  },
  { _id: "hearing-bs", caseId: "synthetic-case-3", status: "scheduled", dateBs: "18 Kartik 2083" },
];
export function useCasesQuery() {
  const current = useSyncExternalStore(subscribe, () => state);
  return {
    data: current === "loading" ? undefined : current === "empty" ? [] : records,
    isPending: current === "loading",
    isLoading: current === "loading",
    isError: current === "error" || current === "forbidden",
    error:
      current === "forbidden"
        ? new ApiClientError("FORBIDDEN", "Synthetic access denial", 403)
        : new Error("Synthetic query failure"),
    refetch: async () => {
      retryCount++;
      setCasesState("populated", primaryColor);
    },
  };
}
export const useCases = () => useCasesQuery().data;
export const useClients = () => clients;
export const useStaffDirectory = () => users;
export const useHearings = () => hearings;
export function useCreateCase() {
  return async (input: Record<string, unknown>) => {
    createAttempts.push(input);
    await new Promise((resolve) => window.setTimeout(resolve, 100));
    if (input.title === "Synthetic rejected creation")
      throw new Error("Synthetic creation rejected");
    return { id: "synthetic-created-case" };
  };
}
export const usePublicCmsSettings = () => ({ firmName: "Srimar Law", primaryColor });
export const useNavigate = () => navigate;
export function useSearchParams() {
  const query = useSyncExternalStore(
    (listener) => {
      window.addEventListener("popstate", listener);
      return () => window.removeEventListener("popstate", listener);
    },
    () => window.location.search,
  );
  return useMemo(() => new URLSearchParams(query), [query]);
}
