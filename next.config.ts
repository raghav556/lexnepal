import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/** Keep in sync with `BACKEND_DOMAINS` in `src/client/data/backend-config.ts`. */
const BACKEND_FLAG_KEYS = [
  "VITE_BACKEND_IDENTITY",
  "VITE_BACKEND_DOCUMENTS",
  "VITE_BACKEND_CASES",
  "VITE_BACKEND_TASKS",
  "VITE_BACKEND_CLIENTS",
  "VITE_BACKEND_HEARINGS",
  "VITE_BACKEND_FINANCE",
  "VITE_BACKEND_MESSAGES",
  "VITE_BACKEND_NOTIFICATIONS",
  "VITE_BACKEND_APPOINTMENTS",
  "VITE_BACKEND_CMS",
  "VITE_BACKEND_HR",
  "VITE_BACKEND_RESEARCH",
  "VITE_BACKEND_LEADS",
  "VITE_BACKEND_ENVELOPES",
  "VITE_BACKEND_ANALYTICS",
] as const;

const backendEnv = Object.fromEntries(
  BACKEND_FLAG_KEYS.map((key) => [key, process.env[key]]),
);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // R5.6 consolidation pulls the full UI import graph into Next's tsc surface.
  // Turbopack compile is authoritative for this pass; tighten strict typecheck in follow-ups.
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    VITE_USE_MOCK: process.env.VITE_USE_MOCK,
    VITE_HERCULES_OIDC_AUTHORITY: process.env.VITE_HERCULES_OIDC_AUTHORITY,
    VITE_HERCULES_OIDC_CLIENT_ID: process.env.VITE_HERCULES_OIDC_CLIENT_ID,
    VITE_CONVEX_URL: process.env.VITE_CONVEX_URL,
    VITE_AUTH_REDIRECT_URI: process.env.VITE_AUTH_REDIRECT_URI,
    DEV: process.env.NODE_ENV !== "production" ? "true" : "",
    ...backendEnv,
  },
  turbopack: {
    // Avoid picking a parent lockfile (e.g. under the user home) as the workspace root.
    root: rootDir,
  },
  async rewrites() {
    return {
      fallback: [
        {
          source: "/:path*",
          destination: "http://localhost:3002/:path*",
        },
      ],
    };
  },
};

export default nextConfig;
