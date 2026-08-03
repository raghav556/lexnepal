import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const useMock = env.VITE_USE_MOCK === "true";

  const alias: { find: string | RegExp; replacement: string }[] = [
    { find: "@/convex", replacement: path.resolve(__dirname, "./convex") },
    { find: "@", replacement: path.resolve(__dirname, "./src") },
    {
      find: "@usehercules/auth/react",
      replacement: path.resolve(__dirname, "./src/lib/hercules-react-shim.ts"),
    },
  ];

  // Offline demo mode — opt-in via VITE_USE_MOCK=true
  if (useMock) {
    alias.unshift({
      find: "convex/react",
      replacement: path.resolve(__dirname, "./src/lib/convex-mock.tsx"),
    });
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias },
    server: {
      port: 3002,
      proxy: {
        "/api": { target: "http://127.0.0.1:3001", changeOrigin: false },
      },
    },
  };
});
