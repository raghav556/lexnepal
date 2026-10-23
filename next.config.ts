import type { NextConfig } from "next";
import path from "path";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === "production";
const deploymentGitSha = process.env.GIT_SHA?.trim();

// Turbopack must include linked dependencies within its filesystem root.
// The application directory stays rootDir; only development's resolver boundary
// expands when a worktree shares node_modules through a Windows junction.
let turbopackRoot = rootDir;
if (!isProduction) {
  const dependencyDirectory = realpathSync(path.join(rootDir, "node_modules"));
  while (true) {
    const relative = path.relative(turbopackRoot, dependencyDirectory);
    if (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`)) {
      break;
    }
    const parent = path.dirname(turbopackRoot);
    if (parent === turbopackRoot)
      throw new Error("Linked dependencies must share a filesystem root");
    turbopackRoot = parent;
  }
}

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https:${isProduction ? "" : " http://127.0.0.1:* http://localhost:* ws: wss:"}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(isProduction
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  output: "standalone",
  ...(deploymentGitSha ? { generateBuildId: async () => deploymentGitSha } : {}),
  poweredByHeader: false,
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  // The development-only floating button covers fixed portal navigation.
  // Compile/runtime error reporting and Fast Refresh remain enabled.
  devIndicators: false,
  env: {
    VITE_HERCULES_OIDC_AUTHORITY: process.env.VITE_HERCULES_OIDC_AUTHORITY,
    VITE_HERCULES_OIDC_CLIENT_ID: process.env.VITE_HERCULES_OIDC_CLIENT_ID,
    VITE_AUTH_REDIRECT_URI: process.env.VITE_AUTH_REDIRECT_URI,
    DEV: process.env.NODE_ENV !== "production" ? "true" : "",
  },
  experimental: {
    // Keep the complete portal route tree usable on modest localhost machines.
    preloadEntriesOnStart: false,
    webpackMemoryOptimizations: true,
  },
  turbopack: {
    root: turbopackRoot,
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/contact",
        headers: [{ key: "Content-Security-Policy", value: `${contentSecurityPolicy}; frame-src https://maps.google.com` }],
      },
    ];
  },
};

export default nextConfig;
