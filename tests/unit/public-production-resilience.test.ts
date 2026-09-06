import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("public production resilience", () => {
  it("renders deterministic branding and navigation fallbacks", () => {
    const layout = source("src/app/(public)/layout.tsx");
    const shell = source("src/app/(public)/public-layout-shell.tsx");
    const routes = source("src/shared/public-routes.ts");

    expect(layout).toContain('firmName: "Srimar Law"');
    expect(layout).toContain("DEFAULT_PUBLIC_HEADER_NAV");
    expect(shell).toContain("DEFAULT_PUBLIC_HEADER_NAV");
    expect(shell).toContain("initialData: initial && initial.length > 0 ? initial : undefined");
    expect(routes).toContain('{ label: "Home", href: "/"');
  });

  it("never resolves public traffic to an arbitrary active firm", () => {
    for (const path of [
      "src/server/repositories/cms-repository.ts",
      "src/server/repositories/crm-repository.ts",
    ]) {
      const repository = source(path);
      expect(repository).not.toContain("fallbackSlugs");
      expect(repository).not.toContain("anyActive");
      expect(repository).toContain("eq(firms.slug, slug)");
      expect(repository).toContain("eq(firms.isActive, true)");
      expect(repository).toContain("isNull(firms.deletedAt)");
    }
  });

  it("makes deployments traceable and validates public CMS after restart", () => {
    const deploy = source("deploy.sh");
    const runtimeEnvironment = source("runtime-env.cjs");
    const nextConfig = source("next.config.ts");

    expect(deploy).toContain("prepare_build_metadata");
    expect(deploy).toContain("validate_deploy_configuration");
    expect(deploy).toContain("/api/v1/public/cms/settings");
    expect(deploy).toContain("/api/v1/public/cms/navigation?location=header");
    expect(deploy).toContain("EXPECTED_GIT_SHA");
    expect(deploy).toContain('aria-label="Loading navigation"');
    expect(deploy).toContain("127.0.0.1:1/lexnepal_build");
    expect(runtimeEnvironment).toContain('path.join(process.cwd(), ".next", "BUILD_ID")');
    expect(nextConfig).toContain("generateBuildId");
  });

  it("packages and verifies the complete production runtime", () => {
    const deploy = source("deploy.sh");
    const runtimeBuilder = source("scripts/deploy/build-runtime-entrypoints.mjs");
    const artifactVerifier = source("scripts/deploy/verify-artifact.mjs");
    const inventory = source("scripts/migration/generate-convex-inventory.mjs");
    const ecosystem = source("ecosystem.config.cjs");

    expect(deploy).toContain("assert_clean_release_source");
    expect(deploy).toContain("REMOTE_MIGRATION_COMMAND:=node runtime/migrate.mjs");
    expect(deploy).toContain("REMOTE_BACKGROUND_RESTART_COMMAND");
    expect(deploy).toContain('DATABASE_URL="$DEPLOY_TEST_DATABASE_URL" npm run test');
    expect(deploy).toContain("ensure_build_time_storage_secret");
    expect(deploy).toContain("verify-artifact.mjs");
    expect(runtimeBuilder).toContain('worker: "scripts/jobs/worker.ts"');
    expect(runtimeBuilder).toContain('migrate: "scripts/db/migrate.mjs"');
    expect(artifactVerifier).toContain('".env.local"');
    expect(artifactVerifier).toContain('"tests"');
    expect(inventory).toContain('"convex-source.zip"');
    expect(ecosystem).toContain('script: "runtime/worker.mjs"');
    expect(ecosystem).toContain('script: "runtime/scheduler.mjs"');
  });
});
