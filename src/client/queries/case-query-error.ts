import { ApiClientError } from "@/client/api/errors";

export type CaseQueryFailureKind = "forbidden" | "not_found" | "error";

export function caseQueryFailureKind(error: unknown): CaseQueryFailureKind {
  if (error instanceof ApiClientError) {
    if (error.status === 403 || error.code === "FORBIDDEN") return "forbidden";
    if (error.status === 404 || error.code === "NOT_FOUND") return "not_found";
  }
  return "error";
}
