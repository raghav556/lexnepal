import { readFileSync } from "node:fs";
import postcss from "postcss";
import { expect, it } from "vitest";
import nextConfig from "../../next.config";

it("keeps global external stylesheet imports compatible with the response CSP", async () => {
  const headers = await nextConfig.headers?.();
  const policy = headers
    ?.find((route) => route.source === "/:path*")
    ?.headers.find((header) => header.key.toLowerCase() === "content-security-policy")?.value;
  expect(policy).toBeDefined();

  const directives = new Map(
    policy!.split(";").map((directive) => {
      const [name, ...sources] = directive.trim().split(/\s+/);
      return [name, sources];
    }),
  );
  const allowed =
    directives.get("style-src-elem") ??
    directives.get("style-src") ??
    directives.get("default-src") ??
    [];
  const blocked: string[] = [];
  postcss.parse(readFileSync("src/index.css", "utf8")).walkAtRules("import", (rule) => {
    const url = rule.params.match(/^(?:url\(\s*)?["']?(https?:\/\/[^"'\s)]+)/i)?.[1];
    if (!url) return; // Package imports are resolved by the CSS build, not the browser.
    const resource = new URL(url);
    if (
      !allowed.includes("*") &&
      !allowed.includes(resource.origin) &&
      !allowed.includes(resource.protocol)
    ) {
      blocked.push(url);
    }
  });
  expect(blocked).toEqual([]);
});
