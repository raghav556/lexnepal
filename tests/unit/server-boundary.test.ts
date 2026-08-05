import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function walk(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(child) : [child];
  });
}

describe("server-only architecture boundary", () => {
  it("marks every server TypeScript module as server-only", () => {
    const files = walk(path.resolve("src/server")).filter((file) => file.endsWith(".ts"));
    const unmarked = files.filter(
      (file) => !/^import ["']server-only["'];/m.test(fs.readFileSync(file, "utf8")),
    );
    expect(unmarked).toEqual([]);
  });

  it("prevents client components from importing server modules", () => {
    const files = [...walk(path.resolve("src/app")), ...walk(path.resolve("src"))].filter(
      (file) => /\.tsx?$/.test(file),
    );
    const serverRoot = path.resolve("src/server");
    const violations = files.filter((file) => {
      const source = fs.readFileSync(file, "utf8");
      if (!/^\s*["']use client["'];/m.test(source)) return false;
      const specifiers = [...source.matchAll(/(?:from\s+|import\s*\()\s*["']([^"']+)["']/g)].map(
        (match) => match[1],
      );
      return specifiers.some((specifier) => {
        if (specifier === "@/server" || specifier.startsWith("@/server/")) return true;
        if (!specifier.startsWith(".")) return false;
        const resolved = path.resolve(path.dirname(file), specifier);
        return resolved === serverRoot || resolved.startsWith(`${serverRoot}${path.sep}`);
      });
    });
    expect(violations).toEqual([]);
  });
});
