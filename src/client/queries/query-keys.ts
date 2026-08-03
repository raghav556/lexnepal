export const queryKeys = {
  identity: {
    all: ["identity"] as const,
    users: (role?: string) => ["identity", "users", role ?? "all"] as const,
    directory: ["identity", "directory"] as const,
    settings: ["identity", "settings"] as const,
    rolePermissions: ["identity", "role-permissions"] as const,
    firm: ["identity", "firm"] as const,
    audit: (filters: unknown) => ["identity", "audit", filters] as const,
    sessions: (userId: string) => ["identity", "sessions", userId] as const,
  },
  documents: {
    all: ["documents"] as const,
    list: (filters: unknown) => ["documents", "list", filters] as const,
    search: (filters: unknown) => ["documents", "search", filters] as const,
    recent: (limit: number) => ["documents", "recent", limit] as const,
    detail: (id: string) => ["documents", "detail", id] as const,
  },
  cases: {
    all: ["cases"] as const,
    list: (filters: unknown) => ["cases", "list", filters] as const,
    detail: (id: string) => ["cases", "detail", id] as const,
  },
  clients: {
    all: ["clients"] as const,
    list: ["clients", "list"] as const,
    mine: ["clients", "me"] as const,
    detail: (id: string) => ["clients", "detail", id] as const,
    kycFiles: (id: string) => ["clients", "detail", id, "kyc-files"] as const,
  },
  conflicts: {
    all: ["conflict-checks"] as const,
    recent: ["conflict-checks", "recent"] as const,
    search: (query: string) => ["conflict-checks", "search", query] as const,
  },
  tasks: {
    all: ["tasks"] as const,
    list: (filters: unknown) => ["tasks", "list", filters] as const,
    detail: (id: string) => ["tasks", "detail", id] as const,
    comments: (id: string) => ["tasks", "detail", id, "comments"] as const,
    workload: ["tasks", "workload"] as const,
  },
  cms: {
    all: ["cms"] as const,
    collection: (scope: "public" | "admin", collection: string, filters: unknown) =>
      ["cms", scope, collection, filters] as const,
    settings: (scope: "public" | "admin") => ["cms", scope, "settings"] as const,
    post: (slug: string) => ["cms", "public", "blog-post", slug] as const,
    legal: (slug: string) => ["cms", "public", "legal", slug] as const,
    team: ["cms", "public", "team"] as const,
    applications: (filters: unknown) => ["cms", "admin", "applications", filters] as const,
  },
} as const;
