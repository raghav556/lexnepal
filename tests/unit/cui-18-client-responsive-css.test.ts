import path from "node:path";
import { build } from "esbuild";
import postcss from "postcss";
import { beforeAll, describe, expect, it } from "vitest";

// Compile the actual CSS module and evaluate its media declarations. These checks
// prove stylesheet rules, not browser geometry, visual appearance or contrast.
let sheet: postcss.Root;
let css: string;
beforeAll(async () => {
  const result = await build({
    entryPoints: ["src/app/(client)/client-accessibility.module.css"],
    bundle: true,
    write: false,
    outdir: path.resolve(".unused-cui18-output"),
    loader: { ".css": "local-css" },
    logLevel: "silent",
  });
  expect(result.warnings).toEqual([]);
  css = result.outputFiles.find((file) => file.path.endsWith(".css"))!.text;
  sheet = postcss.parse(css);
});

function properties(selectorPart: string, width: number, reducedMotion = false) {
  const declarations: Record<string, string> = {};
  sheet.walkRules((rule) => {
    if (!rule.selector.includes(selectorPart)) return;
    let parent = rule.parent;
    while (parent && parent.type !== "root") {
      if (parent.type === "atrule" && parent.name === "media") {
        const max = parent.params.match(/max-width:\s*(\d+)px/);
        const min = parent.params.match(/min-width:\s*(\d+)px/);
        if ((max && width > Number(max[1])) || (min && width < Number(min[1]))) return;
        if (parent.params.includes("prefers-reduced-motion") && !reducedMotion) return;
      }
      parent = parent.parent;
    }
    rule.walkDecls((declaration) => {
      declarations[declaration.prop] = declaration.value;
    });
  });
  return declarations;
}

describe("CUI-18 Client-scoped compiled stylesheet", () => {
  it("scopes every selector to the Client shell and avoids Staff/Admin leakage", () => {
    sheet.walkRules((rule) => {
      for (const selector of postcss.list.comma(rule.selector)) {
        expect(selector).toContain("[data-client-shell].dashboard-theme.dashboard-client");
      }
    });
    expect(css).not.toContain(":global");
  });

  it.each([1440, 1280, 1024, 768, 390, 360])("uses the intended rules at %s px", (width) => {
    const compact = width < 1024;
    expect(properties(".client-desktop-sidebar", width).display).toBe(compact ? "none" : undefined);
    expect(properties(".client-mobile-header", width).display).toBe(compact ? "flex" : undefined);
    expect(properties(".client-documents-toolbar", width)["grid-template-columns"]).toBe(
      width >= 1280 ? undefined : width < 768 ? "minmax(0, 1fr)" : "repeat(2, minmax(0, 1fr))",
    );
    expect(properties("#client-main-content", width)["padding-bottom"]).toBe(
      compact ? "calc(5rem + env(safe-area-inset-bottom, 0px))" : undefined,
    );
  });

  it("keeps table and tab overflow in their own containers", () => {
    expect(properties(".client-documents-table-wrap", 360)["overflow-x"]).toBe("auto");
    expect(properties(".client-matter-detail-tablist", 360)["overflow-x"]).toBe("auto");
    expect(properties(".client-matter-detail-tablist", 360)["max-width"]).toBe("100%");
  });

  it("raises small operational labels without changing decorative avatar lettering", () => {
    expect(properties(".client-messages-channel-meta", 1440)["font-size"]).toBe("0.75rem");
    expect(properties(".client-matter-detail-fact-label", 360)["font-size"]).toBe("0.75rem");
    expect(properties(".client-home-matter-avatar", 1440)["font-size"]).toBeUndefined();
  });

  it("keeps the skip link discoverable on focus and uses existing focus tokens", () => {
    expect(properties(".client-skip-link:focus", 1440).transform).toBe("none");
    expect(css).toContain("2px solid var(--dashboard-focus)");
    expect(css).toContain("var(--dashboard-sidebar-focus)");
  });

  it("provides compact touch targets and disables prolonged motion when requested", () => {
    expect(properties(".client-identity-open", 390)["min-height"]).toBe("2.75rem");
    expect(properties(".client-mobile-bottom-nav", 390)["padding-bottom"]).toContain(
      "safe-area-inset-bottom",
    );
    expect(properties("*::before", 1440, true)["animation-duration"]).toBe("0.01ms");
    expect(properties("*::before", 1440, true)["scroll-behavior"]).toBe("auto");
    expect(properties("*::before", 1440, false)["animation-duration"]).toBeUndefined();
  });
});
