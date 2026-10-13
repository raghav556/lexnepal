import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { root, resolveFunctionalArtifacts } from "./client-functional-paths.mjs";

export const artifacts = resolveFunctionalArtifacts();
const require = createRequire(path.join(root, "package.json"));
const adapters = path.join(root, "tests/functional/support/adapters.tsx");
const hash = (data) => crypto.createHash("sha256").update(data).digest("hex");
const replacements = new Set([
  "@/hooks/use-current-user",
  "@/hooks/use-auth",
  "@/client/auth/auth-provider",
  "@/client/auth/local-auth-client",
  "@/client/api/client",
  "@/client/navigation",
  "@/components/auth/IdleSessionGuard",
  "@/components/dashboard/global-search-palette",
  "@/lib/pdf-generator",
  "next/link",
  "next/navigation",
]);

export default async function buildClientFunctionalFixture() {
  fs.mkdirSync(artifacts, { recursive: true });
  const result = await build({
    entryPoints: [path.join(root, "tests/functional/support/fixture.tsx")],
    absWorkingDir: root,
    bundle: true,
    write: false,
    outdir: path.join(artifacts, "bundle"),
    platform: "browser",
    jsx: "automatic",
    nodePaths: [path.join(root, "node_modules")],
    loader: { ".css": "local-css" },
    define: { "process.env.NODE_ENV": '"test"', "process.env": "{}" },
    plugins: [
      {
        name: "isolated-client-functional",
        setup(builder) {
          builder.onResolve({ filter: /^(?:react|react-dom)(?:\/.*)?$/ }, (args) => ({
            path: require.resolve(args.path),
          }));
          builder.onResolve({ filter: /^(?:@\/|next\/)/ }, (args) => {
            const key = args.path.replace(/\.(tsx?|jsx?)$/, "");
            if (
              replacements.has(key) ||
              (key.startsWith("@/client/queries/") && key !== "@/client/queries/case-query-error")
            )
              return { path: adapters };
            if (key === "next/dynamic") return { path: key, namespace: "functional-dynamic" };
            if (key.startsWith("@/server/") || key.startsWith("@/db/"))
              throw new Error("Server imports forbidden in functional fixture");
            if (args.path.startsWith("@/")) {
              const source = path.join(root, "src", args.path.slice(2));
              const resolved = [
                source,
                source + ".tsx",
                source + ".ts",
                source + "/index.ts",
                source + "/index.tsx",
              ].find((file) => fs.existsSync(file) && fs.statSync(file).isFile());
              if (!resolved) throw new Error("Unresolved functional import: " + args.path);
              return { path: resolved };
            }
          });
          builder.onLoad({ filter: /.*/, namespace: "functional-dynamic" }, () => ({
            contents: "export default () => () => null;",
            loader: "js",
          }));
        },
      },
    ],
  });
  if (result.warnings.length) throw new Error("Functional bundle warnings require review");
  const js = result.outputFiles.find((file) => file.path.endsWith(".js")).text;
  const moduleCss = result.outputFiles.find((file) => file.path.endsWith(".css")).text;
  const css = await postcss([tailwind({ base: root, optimize: false })]).process(
    fs.readFileSync(path.join(root, "src/index.css"), "utf8"),
    { from: path.join(root, "src/index.css") },
  );
  const parsed = postcss.parse(css.css);
  parsed.walkAtRules("import", (rule) => {
    if (rule.params.startsWith("url(")) rule.remove();
  });
  // Pin an installed, offline font. This is intentionally NOT the reference font:
  // approved-font/CMS comparisons remain a separate authenticated acceptance gate.
  const fontPath = path.join(
    path.dirname(require.resolve("next/package.json")),
    "dist/compiled/@vercel/og/Geist-Regular.ttf",
  );
  const font = fs.readFileSync(fontPath);
  const fontCss = `@font-face{font-family:CUI20Pinned;src:url(data:font/ttf;base64,${font.toString("base64")}) format('truetype');font-display:block} .dashboard-client{--font-sans:CUI20Pinned;--font-serif:CUI20Pinned;font-family:CUI20Pinned,sans-serif}`;
  fs.writeFileSync(path.join(artifacts, "fixture.js"), js);
  fs.writeFileSync(
    path.join(artifacts, "fixture.css"),
    parsed.toString() + "\n" + moduleCss + "\n" + fontCss,
  );
  fs.writeFileSync(
    path.join(artifacts, "fixture-manifest.json"),
    JSON.stringify(
      {
        isolation:
          "In-memory functional commands; all network denied; no server, DB, storage, sessions or jobs",
        jsSHA256: hash(js),
        cssSHA256: hash(parsed.toString() + moduleCss + fontCss),
        limitations: [
          "Synthetic auth/query/command adapters, not authenticated API E2E",
          "PDF engine and global search excluded",
        ],
      },
      null,
      2,
    ),
  );
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await buildClientFunctionalFixture();
