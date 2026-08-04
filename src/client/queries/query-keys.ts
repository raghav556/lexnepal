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
  hearings: {
    all: ["hearings"] as const,
    list: (filters: unknown) => ["hearings", "list", filters] as const,
    detail: (id: string) => ["hearings", "detail", id] as const,
  },
  sop: {
    all: ["sop-templates"] as const,
    list: (practiceArea?: string) => ["sop-templates", "list", practiceArea ?? "all"] as const,
  },
  research: {
    all: ["research"] as const,
    list: ["research", "list"] as const,
    detail: (id: string) => ["research", "detail", id] as const,
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
  financial: {
    all: ["financial"] as const,
    invoices: (filters?: unknown) => ["financial", "invoices", filters] as const,
    timeEntries: (filters?: unknown) => ["financial", "time-entries", filters] as const,
    trustTransactions: (filters?: unknown) => ["financial", "trust-transactions", filters] as const,
    expenses: (filters?: unknown) => ["financial", "expenses", filters] as const,
    payments: (filters?: unknown) => ["financial", "payments", filters] as const,
  },
  crm: {
    all: ["crm"] as const,
    leads: (filters?: unknown) => ["crm", "leads", filters] as const,
    appointments: (filters?: unknown) => ["crm", "appointments", filters] as const,
    availableSlots: (date: string) => ["crm", "available-slots", date] as const,
  },
  envelopes: {
    all: ["envelopes"] as const,
  },
  analytics: {
    dashboard: ["analytics", "dashboard"] as const,
  },
} as const;
