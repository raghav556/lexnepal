import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([".next/**", "dist/**", "coverage/**", "convex/_generated/**"]),
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "convex/react",
              message:
                "Import backend-neutral domain hooks or the transitional client data bridge.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/client/data/convex-bridge.ts"],
    rules: { "no-restricted-imports": "off" },
  },
]);
