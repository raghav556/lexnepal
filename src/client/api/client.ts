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

  constructor(private readonly options: ApiClientOptions = {}) {
    // Bind fetch — unbound `fetch` throws "Illegal invocation" in the browser.
    this.fetcher = options.fetcher ?? ((input, init) => globalThis.fetch(input, init));
  }

  async request<TResponse, TBody = unknown>(
    path: string,
    request: ApiRequestOptions<TBody> = {},
  ): Promise<TResponse> {
    const url = new URL(path, this.options.baseUrl ?? window.location.origin);
    for (const [key, value] of Object.entries(request.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    try {
      const response = await this.fetcher(url, {
        method: request.method ?? (request.body === undefined ? "GET" : "POST"),
        credentials: "include",
        signal: request.signal,
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
