# Client API

`ApiClient` is the backend-neutral HTTP boundary. It unwraps `{ data }` responses, sends browser session cookies and converts structured, non-JSON, network and legacy errors into `ApiClientError`.

Client modules consume contracts from `src/shared/contracts` and must never import from `src/server`.
