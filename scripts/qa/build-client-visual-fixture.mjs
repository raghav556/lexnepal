import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import sharp from "sharp";
import { root, resolveVisualArtifacts } from "./client-visual-paths.mjs";

export const artifacts = resolveVisualArtifacts();
const require = createRequire(path.join(root, "package.json"));
const adapters = path.join(root, "tests/visual/support/adapters.tsx");
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

export default async function buildClientVisualFixture() {
  fs.mkdirSync(artifacts, { recursive: true });
  const result = await build({
    entryPoints: [path.join(root, "tests/visual/support/fixture.tsx")],
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
        name: "isolated-client-visual",
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
            if (key === "next/dynamic") return { path: key, namespace: "visual-dynamic" };
            if (key.startsWith("@/server/") || key.startsWith("@/db/"))
              throw new Error("Server imports forbidden in visual fixture");
            if (args.path.startsWith("@/")) {
              const source = path.join(root, "src", args.path.slice(2));
              const resolved = [
                source,
                source + ".tsx",
                source + ".ts",
                source + "/index.ts",
                source + "/index.tsx",
              ].find((file) => fs.existsSync(file) && fs.statSync(file).isFile());
              if (!resolved) throw new Error("Unresolved visual import: " + args.path);
              return { path: resolved };
            }
          });
          builder.onLoad({ filter: /.*/, namespace: "visual-dynamic" }, () => ({
            contents: "export default () => () => null;",
            loader: "js",
          }));
        },
      },
    ],
  });
  if (result.warnings.length) throw new Error("Visual bundle warnings require review");
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
  const fontCss = `@font-face{font-family:CUI19Pinned;src:url(data:font/ttf;base64,${font.toString("base64")}) format('truetype');font-display:block} .dashboard-client{--font-sans:CUI19Pinned;--font-serif:CUI19Pinned;font-family:CUI19Pinned,sans-serif}`;
  fs.writeFileSync(path.join(artifacts, "fixture.js"), js);
  fs.writeFileSync(
    path.join(artifacts, "fixture.css"),
    parsed.toString() + "\n" + moduleCss + "\n" + fontCss,
  );
  const references = [];
  const referenceDir = path.join(root, "doc/ui-reference/client/references");
  const frozenReferences = JSON.parse(
    fs.readFileSync(path.join(root, "tests/visual/reference-manifest.json"), "utf8"),
  );
  for (const file of fs
    .readdirSync(referenceDir)
    .filter((file) => file.endsWith(".jpg"))
    .sort()) {
    const bytes = fs.readFileSync(path.join(referenceDir, file));
    const metadata = await sharp(bytes).metadata();
    references.push({
      file,
      width: metadata.width,
      height: metadata.height,
      sha256: hash(bytes),
      bodyOnly: /^(03|05)-/.test(file),
    });
  }
  if (JSON.stringify(references) !== JSON.stringify(frozenReferences))
    throw new Error("Frozen visual reference pack differs from the checkpoint inventory");
  fs.writeFileSync(
    path.join(artifacts, "fixture-manifest.json"),
    JSON.stringify(
      {
        isolation:
          "Fresh about:blank Chromium contexts; all network denied; query/auth adapters synthetic; no Next server, DB, sessions or storage",
        font: {
          source: "installed Next Geist-Regular.ttf",
          sha256: hash(font),
          approvedReferenceFont: false,
        },
        cssSHA256: hash(parsed.toString() + moduleCss + fontCss),
        jsSHA256: hash(js),
        references,
        limitations: [
          "Mocked data adapters are not the locked real API fixture path",
          "No approved CMS logo/hero asset",
          "Pinned substitute font differs from approved reference typography",
          "Screenshots are candidate evidence, not automatically approved baselines",
        ],
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await buildClientVisualFixture();
