import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const standaloneDir = path.resolve(root, process.argv[2] ?? ".next/standalone");
const buildOutputDir = path.resolve(root, ".next");

if (!fs.existsSync(path.join(standaloneDir, "server.js"))) {
  console.error(
    `Error: Standalone server.js not found at ${standaloneDir}. Run npm run build first.`,
  );
  process.exit(1);
}

console.log("Assembling standalone release artifact...");

// 1. Build runtime entrypoints
execSync(
  `node scripts/deploy/build-runtime-entrypoints.mjs "${path.join(standaloneDir, "runtime")}"`,
  {
    cwd: root,
    stdio: "inherit",
  },
);

// 2. Copy root CJS configs
for (const file of ["runtime-env.cjs", "app.cjs", "ecosystem.config.cjs"]) {
  const src = path.join(root, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(standaloneDir, file));
  }
}

// 3. Copy drizzle directory
const drizzleSrc = path.join(root, "drizzle");
const drizzleDest = path.join(standaloneDir, "drizzle");
if (fs.existsSync(drizzleSrc)) {
  fs.cpSync(drizzleSrc, drizzleDest, { recursive: true, force: true });
}

// 4. Copy public directory
const publicSrc = path.join(root, "public");
const publicDest = path.join(standaloneDir, "public");
if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, publicDest, { recursive: true, force: true });
}

// 5. Copy .next/static
const staticSrc = path.join(buildOutputDir, "static");
const staticDest = path.join(standaloneDir, ".next/static");
if (fs.existsSync(staticSrc)) {
  fs.cpSync(staticSrc, staticDest, { recursive: true, force: true });
}

// 6. Strip any env files
function stripEnvFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      stripEnvFiles(fullPath);
    } else if ([".env", ".env.local", ".env.runtime"].includes(entry.name)) {
      fs.unlinkSync(fullPath);
    }
  }
}
stripEnvFiles(standaloneDir);

console.log("Standalone artifact assembled. Verifying...");
execSync(`node scripts/deploy/verify-artifact.mjs "${standaloneDir}"`, {
  cwd: root,
  stdio: "inherit",
});
