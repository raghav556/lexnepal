import { ApiClientError, normalizeApiError } from "@/client/api/errors";

export interface ApiClientOptions {
  baseUrl?: string;
  fetcher?: typeof fetch;
}

export interface ApiRequestOptions<TBody = unknown> {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, string | number | boolean | undefined>;
  body?: TBody;
  signal?: AbortSignal;
}

export class ApiClient {
  private readonly fetcher: typeof fetch;
  private readonly inFlightGetRequests = new Map<string, Promise<unknown>>();

  constructor(private readonly options: ApiClientOptions = {}) {
    // Bind fetch — unbound `fetch` throws "Illegal invocation" in the browser.
    this.fetcher = options.fetcher ?? ((input, init) => globalThis.fetch(input, init));
  }

  request<TResponse, TBody = unknown>(
    path: string,
    request: ApiRequestOptions<TBody> = {},
  ): Promise<TResponse> {
    const url = new URL(path, this.options.baseUrl ?? window.location.origin);
    const method = request.method ?? (request.body === undefined ? "GET" : "POST");
    for (const [key, value] of Object.entries(request.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    if (method === "GET") {
      const requestKey = url.toString();
      const existing = this.inFlightGetRequests.get(requestKey);
      if (existing) return existing as Promise<TResponse>;

      const pending = this.performRequest<TResponse, TBody>(url, method, request);
      this.inFlightGetRequests.set(requestKey, pending);
      return pending.finally(() => {
        if (this.inFlightGetRequests.get(requestKey) === pending) {
          this.inFlightGetRequests.delete(requestKey);
        }
      });
    }

    return this.performRequest<TResponse, TBody>(url, method, request);
  }

  private async performRequest<TResponse, TBody>(
    url: URL,
    method: NonNullable<ApiRequestOptions<TBody>["method"]>,
    request: ApiRequestOptions<TBody>,
  ): Promise<TResponse> {
    try {
      const response = await this.fetcher(url, {
        method,
        credentials: "include",
        /*
         * Identical GET calls share the same parsed in-flight promise. Keeping
         * that request alive through a brief React Query observer unmount avoids
         * duplicate network work in React Strict Mode. Mutations still honor
         * explicit cancellation.
         */
        signal: method === "GET" ? undefined : request.signal,
        headers: request.body === undefined ? undefined : { "content-type": "application/json" },
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
      });
      if (!response.ok) throw await ApiClientError.fromResponse(response);
      if (response.status === 204) return undefined as TResponse;
      const payload = (await response.json()) as { data?: TResponse } | TResponse;
      return typeof payload === "object" && payload !== null && "data" in payload
        ? (payload.data as TResponse)
        : (payload as TResponse);
    } catch (error) {
      throw normalizeApiError(error);
    }
  }
}

export const apiClient = new ApiClient();
