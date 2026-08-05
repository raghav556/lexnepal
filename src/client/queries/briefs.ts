/* eslint-disable @typescript-eslint/no-explicit-any */
import { anyApi as api } from "convex/server";
import {
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "@/client/data/convex-bridge";
import { useDomainBackend } from "@/client/data/provider";

/**
 * Case briefs remain Convex-only until a PG domain exists.
 * When BACKEND_CASES=next, hooks return empty / throw on write (UI should gate).
 */
export function useCaseBriefs(caseId: string | null): any[] {
  const backend = useDomainBackend("cases");
  const convex = useConvexQuery(
    (api as any).briefs.list,
    backend === "convex" && caseId ? { caseId } : "skip",
  ) as any[] | undefined;
  return backend === "convex" ? convex || [] : [];
}

export function useCaseBriefCommands() {
  const backend = useDomainBackend("cases");
  const createBrief = useConvexMutation((api as any).briefs.create);
  const updateBrief = useConvexMutation((api as any).briefs.update);
  const deleteBrief = useConvexMutation((api as any).briefs.delete);

  const unavailable = () => {
    throw new Error("Case briefs are not available on the Next backend yet.");
  };

  return {
    briefsAvailable: backend === "convex",
    async create(input: Record<string, unknown>) {
      if (backend !== "convex") return unavailable();
      return createBrief(input);
    },
    async update(input: Record<string, unknown>) {
      if (backend !== "convex") return unavailable();
      return updateBrief(input);
    },
    async remove(input: Record<string, unknown>) {
      if (backend !== "convex") return unavailable();
      return deleteBrief(input);
    },
  };
}
