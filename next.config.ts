import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  env: {
    VITE_HERCULES_OIDC_AUTHORITY: process.env.VITE_HERCULES_OIDC_AUTHORITY,
    VITE_HERCULES_OIDC_CLIENT_ID: process.env.VITE_HERCULES_OIDC_CLIENT_ID,
    VITE_AUTH_REDIRECT_URI: process.env.VITE_AUTH_REDIRECT_URI,
    DEV: process.env.NODE_ENV !== "production" ? "true" : "",
  },
  turbopack: {
    // Avoid picking a parent lockfile (e.g. under the user home) as the workspace root.
    root: rootDir,
  },
};

export default nextConfig;
