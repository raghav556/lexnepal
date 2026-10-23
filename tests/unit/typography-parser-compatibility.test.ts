import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
const require = createRequire(import.meta.url);
const typography = require("@tailwindcss/typography");
const typographyRequire = createRequire(require.resolve("@tailwindcss/typography"));
const parser = typographyRequire("postcss-selector-parser");
const { commonTrailingPseudos } = typographyRequire("./utils");
it("keeps every actual typography rule and variant byte-identical to the pre-patch consumer", () => {
  const plugin = typography();
  const components: unknown[] = [],
    variants: unknown[] = [];
  plugin.handler({
    theme: (key: string) => {
      expect(key).toBe("typography");
      return plugin.config.theme.typography;
    },
    prefix: (s: string) => s,
    addComponents: (c: unknown) => components.push(c),
    addVariant: (...v: unknown[]) => variants.push(v),
  });
  expect(variants).toHaveLength(33);
  expect(createHash("sha256").update(JSON.stringify({ components, variants })).digest("hex")).toBe(
    "f713d2d55229bbea7f2a6ef6e3c755010e0a44a49e3ad084870447e2d215bb44",
  );
});
it.each([
  [".a::before,.b::before", ["::before", ".a,.b"]],
  [".a::before,.b::after", [null, ".a::before,.b::after"]],
  [":is(.a,.b)::before,:not(.c)::before", ["::before", ":is(.a,.b),:not(.c)"]],
])("preserves typography pseudo-element semantics for %s", (selector, expected) => {
  expect(commonTrailingPseudos(selector)).toEqual(expected);
});
it("parses a large flat selector completely with the patched tokenizer", () => {
  const ast = parser().astSync(".a".repeat(12000));
  expect(ast.nodes).toHaveLength(1);
  expect(ast.nodes[0].nodes).toHaveLength(12000);
  expect(ast.toString()).toBe(".a".repeat(12000));
});
