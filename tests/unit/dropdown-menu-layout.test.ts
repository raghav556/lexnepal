import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DropdownMenu } from "../../src/components/ui/dropdown-menu";

describe("dropdown menu layout", () => {
  it("allows icon menus to shrink to their trigger without retaining full width", () => {
    const markup = renderToStaticMarkup(
      createElement(
        DropdownMenu,
        { className: "inline-flex w-auto shrink-0" },
        createElement("button", { type: "button" }, "Notifications"),
      ),
    );

    expect(markup).toContain("inline-flex");
    expect(markup).toContain("w-auto");
    expect(markup).not.toMatch(/class="[^"]*\bw-full\b/);
  });

  it("keeps full width as the default for account menus", () => {
    const markup = renderToStaticMarkup(
      createElement(DropdownMenu, null, createElement("button", { type: "button" }, "Account")),
    );

    expect(markup).toMatch(/class="[^"]*\bw-full\b/);
  });
});
