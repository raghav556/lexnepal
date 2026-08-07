import "server-only";
import { ZodError } from "zod";
import { REQUEST_ID_HEADER } from "@/shared/constants/application";
import { AppError, type ApiErrorBody } from "@/shared/errors/api-error";
import { createLogger, type Logger } from "@/server/observability/logger";
import { resolveRequestId } from "@/server/http/request-id";
import { jsonResponse } from "@/server/http/response";

export interface ApiContext {
  request: Request;
  requestId: string;
  logger: Logger;
}

type ApiHandler = (context: ApiContext) => Promise<Response> | Response;

function errorResponse(error: unknown, requestId: string): Response {
  const appError =
    error instanceof AppError
      ? error
      : error instanceof ZodError
        ? new AppError("VALIDATION_FAILED", "Request validation failed", 400, error.flatten())
        : new AppError("INTERNAL_ERROR", "An unexpected error occurred", 500);
  const body: ApiErrorBody = {
    error: {
      code: appError.code,
      message: appError.message,
      requestId,
      ...(appError.details === undefined ? {} : { details: appError.details }),
    },
  };
  return jsonResponse(body, { status: appError.status });
}

export function withApiHandler(route: string, handler: ApiHandler) {
  return async function handledRoute(request: Request): Promise<Response> {
    const startedAt = performance.now();
    const requestId = resolveRequestId(request.headers);
    const logger = createLogger({ requestId, route, method: request.method });
    try {
      const response = await handler({ request, requestId, logger });
      const headers = new Headers(response.headers);
      headers.set(REQUEST_ID_HEADER, requestId);
      logger.info("http.request.completed", {
        status: response.status,
        durationMs: Math.round(performance.now() - startedAt),
      });
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      const response = errorResponse(error, requestId);
      response.headers.set(REQUEST_ID_HEADER, requestId);
      logger.error("http.request.failed", {
        status: response.status,
        durationMs: Math.round(performance.now() - startedAt),
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage: error instanceof AppError ? error.message : "Unexpected server error",
      });
      return response;
    }
  };
}
