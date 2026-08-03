# Client queries

Domain hooks choose Convex or Next.js through `useDomainBackend`. Components consume these hooks and never branch on backend flags themselves.

Query keys use `[domain, operation, parameters]`. Mutations invalidate the domain root key so all affected list/detail keys are refreshed consistently.
