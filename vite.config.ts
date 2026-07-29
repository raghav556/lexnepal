import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      // Mock Convex react hooks/components to run fully offline/locally
      { find: "convex/react", replacement: path.resolve(__dirname, "./src/lib/convex-mock.tsx") },
      // The more specific alias must come first
      { find: "@/convex", replacement: path.resolve(__dirname, "./convex") },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      // Shim for @usehercules/auth/react — not published as a sub-path export
      { find: "@usehercules/auth/react", replacement: path.resolve(__dirname, "./src/lib/hercules-react-shim.ts") },
    ],
  },
  server: {
    port: 3001,
  },
});
