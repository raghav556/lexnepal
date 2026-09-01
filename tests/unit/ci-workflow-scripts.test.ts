import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("GitHub Actions npm scripts", () => {
  it("references only scripts declared in package.json", () => {
    const root = process.cwd();
    const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    const workflow = readFileSync(
      resolve(root, ".github/workflows/next-foundation-ci.yml"),
      "utf8",
    );
    const referenced = [...workflow.matchAll(/npm run ([A-Za-z0-9:_-]+)/g)].map(
      (match) => match[1],
    );
    const missing = referenced.filter((script) => !packageJson.scripts[script]);

    expect(referenced.length).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });
});
