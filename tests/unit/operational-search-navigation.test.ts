import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  getOperationalSearchPages,
  STAFF_NAV,
  ADMIN_NAV_TREE,
} from "../../src/lib/operational-navigation";
import { compositeCssColor } from "../support/css-color";

describe("operational search destinations", () => {
  for (const portal of ["staff", "admin"] as const) {
    it(`uses the existing ${portal} navigation with real page routes only`, () => {
      const pages = getOperationalSearchPages(portal);
      const nav =
        portal === "staff"
          ? STAFF_NAV.flatMap((item) => (item.href ? [item.href] : [])).concat("/staff/profile")
          : ADMIN_NAV_TREE.flatMap((group) =>
              group.items.flatMap((item) =>
                item.type === "branch" ? item.items.map((child) => child.href) : [item.href],
              ),
            );
      expect(pages.map((page) => page.href)).toEqual(nav);
      expect(new Set(nav).size).toBe(nav.length);
      for (const href of nav) {
        expect(href === `/${portal}` || href.startsWith(`/${portal}/`)).toBe(true);
        expect(existsSync(`src/app/(${portal})${href}/page.tsx`), href).toBe(true);
      }
    });
  }
  it("retains every existing CMS destination without unsupported modules", () => {
    const admin = getOperationalSearchPages("admin");
    expect(admin.filter((page) => page.href.startsWith("/admin/cms"))).toHaveLength(12);
    expect(
      [...admin, ...getOperationalSearchPages("staff")].some((page) =>
        page.href.includes("conflict-checker"),
      ),
    ).toBe(false);
    const search = readFileSync("src/components/dashboard/global-search-palette.tsx", "utf8");
    expect(search).not.toContain("/admin/conflict-checker");
  });
  it("composites alpha text against the actual surface, rejecting unresolved colors", () => {
    expect(compositeCssColor("rgba(255, 255, 255, 0.8)", "#000000")).toBe("#cccccc");
    expect(compositeCssColor("#ffffff", "#000000")).toBe("#ffffff");
    expect(() => compositeCssColor("var(--missing)", "#000000")).toThrow();
  });
});
