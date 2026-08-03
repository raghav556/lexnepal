import type { ApiErrorBody, ApiErrorCode } from "@/shared/errors/api-error";

export class ApiClientError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status: number,
    public readonly requestId?: string,
    public readonly details?: unknown,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }

  static async fromResponse(response: Response): Promise<ApiClientError> {
    let body: Partial<ApiErrorBody> | undefined;
    try {
      body = (await response.json()) as Partial<ApiErrorBody>;
    } catch {
      // Non-JSON upstream failures still receive a stable client error.
    }
    return new ApiClientError(
      body?.error?.code ?? statusCode(response.status),
      body?.error?.message ?? `Request failed with status ${response.status}`,
      response.status,
      body?.error?.requestId ?? response.headers.get("x-request-id") ?? undefined,
      body?.error?.details,
    );
  }
}

export function normalizeApiError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) return error;
  if (error && typeof error === "object") {
    const candidate = error as { message?: unknown; data?: { code?: unknown; message?: unknown } };
    const code = typeof candidate.data?.code === "string" ? candidate.data.code : undefined;
    const message =
      typeof candidate.data?.message === "string"
        ? candidate.data.message
        : typeof candidate.message === "string"
          ? candidate.message
          : "The request could not be completed";
    return new ApiClientError(
      toApiErrorCode(code),
      message,
      code === "UNAUTHENTICATED" ? 401 : 500,
      undefined,
      undefined,
      error,
    );
  }
  return new ApiClientError(
    "INTERNAL_ERROR",
    "The request could not be completed",
    500,
    undefined,
    undefined,
    error,
  );
}

function statusCode(status: number): ApiErrorCode {
  if (status === 400) return "BAD_REQUEST";
  if (status === 401) return "UNAUTHENTICATED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 429) return "RATE_LIMITED";
  if (status === 503) return "SERVICE_UNAVAILABLE";
  return "INTERNAL_ERROR";
}

function toApiErrorCode(code: string | undefined): ApiErrorCode {
  return [
    "BAD_REQUEST",
    "UNAUTHENTICATED",
    "FORBIDDEN",
    "NOT_FOUND",
    "CONFLICT",
    "RATE_LIMITED",
    "VALIDATION_FAILED",
    "SERVICE_UNAVAILABLE",
    "INTERNAL_ERROR",
  ].includes(code ?? "")
    ? (code as ApiErrorCode)
    : "INTERNAL_ERROR";
}
