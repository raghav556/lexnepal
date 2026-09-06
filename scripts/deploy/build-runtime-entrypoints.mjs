import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outputDirectory = path.resolve(root, process.argv[2] ?? ".next/standalone/runtime");

await build({
  absWorkingDir: root,
  entryPoints: {
    worker: "scripts/jobs/worker.ts",
    scheduler: "scripts/jobs/scheduler.ts",
    "worker-once": "scripts/jobs/worker-once.ts",
    "scheduler-once": "scripts/jobs/scheduler-once.ts",
    migrate: "scripts/db/migrate.mjs",
    "migration-status": "scripts/db/migration-status.mjs",
  },
  outdir: outputDirectory,
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  conditions: ["react-server", "node", "import", "default"],
  external: ["next", "next/*", "@opentelemetry/api"],
  outExtension: { ".js": ".mjs" },
  banner: {
    js: 'import "../runtime-env.cjs"; import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
  sourcemap: false,
  minify: false,
  logLevel: "info",
});
