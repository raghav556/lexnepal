import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  env: {
    VITE_USE_MOCK: process.env.VITE_USE_MOCK,
    VITE_HERCULES_OIDC_AUTHORITY: process.env.VITE_HERCULES_OIDC_AUTHORITY,
    VITE_HERCULES_OIDC_CLIENT_ID: process.env.VITE_HERCULES_OIDC_CLIENT_ID,
    VITE_CONVEX_URL: process.env.VITE_CONVEX_URL,
    VITE_AUTH_REDIRECT_URI: process.env.VITE_AUTH_REDIRECT_URI,
    DEV: process.env.NODE_ENV !== 'production' ? 'true' : ''
  },
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    return {
      fallback: [
        {
          source: '/:path*',
          destination: 'http://localhost:3002/:path*',
        },
      ],
    };
  },
};

export default nextConfig;

