import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([".next/**", "coverage/**"]),
  {
    rules: {
      // An underscore prefix marks a binding that exists only to satisfy a signature or shape.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "convex/react",
              message: "Convex is decommissioned; use the domain hooks in src/client/queries.",
            },
            {
              name: "react-router-dom",
              message: "Use @/client/navigation, which wraps the Next router.",
            },
          ],
        },
      ],
    },
  },
]);
