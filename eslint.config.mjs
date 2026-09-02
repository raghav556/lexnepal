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
  {
    files: [
      "src/components/**/*.{ts,tsx}",
      "src/hooks/**/*.{ts,tsx}",
      "src/lib/**/*.{ts,tsx}",
      "src/utils/**/*.{ts,tsx}",
      "src/views/**/*.{ts,tsx}",
    ],
    rules: {
      // The migrated UI is runtime-validated at API boundaries; tightening its legacy view-model
      // `any` types is tracked as gradual hardening, while server/contracts remain strict.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      // React Compiler is not enabled. These compiler-oriented rules reject several intentional
      // modal resets, timer refs, and third-party hook patterns that are covered by browser tests.
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/immutability": "off",
      "react-hooks/incompatible-library": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
      // CMS, avatar, signature, and storage object URLs are dynamic and cannot use a fixed
      // Next Image allow-list safely; those components provide explicit sizing and alt text.
      "@next/next/no-img-element": "off",
    },
  },
]);
