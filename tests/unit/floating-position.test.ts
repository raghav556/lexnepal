import { describe, expect, it } from "vitest";
import { getFloatingPosition } from "../../src/lib/floating-position";

describe("floating panel positioning", () => {
  it("shifts a sidebar notification panel inside a narrow viewport", () => {
    expect(
      getFloatingPosition({
        anchor: { top: 82, right: 176, bottom: 122, left: 136 },
        contentWidth: 320,
        contentHeight: 350,
        viewportWidth: 387,
        viewportHeight: 500,
        align: "end",
      }),
    ).toEqual({ left: 8, top: 130 });
  });

  it("flips above its trigger when there is not enough room below", () => {
    expect(
      getFloatingPosition({
        anchor: { top: 440, right: 370, bottom: 480, left: 330 },
        contentWidth: 320,
        contentHeight: 300,
        viewportWidth: 387,
        viewportHeight: 500,
        align: "end",
      }),
    ).toEqual({ left: 50, top: 132 });
  });
});
