import { describe, expect, it } from "vitest";
import { resolvePublicContact } from "../../src/lib/business-settings";

describe("business settings", () => {
  it("uses only configured public contact details", () => {
    expect(resolvePublicContact({ phone: " +977-9800000000 ", email: "office@example.com" })).toBe(
      "Phone: +977-9800000000\nEmail: office@example.com",
    );
    expect(resolvePublicContact({})).toBe(
      "Verified phone and email details are available on our Contact page.",
    );
  });
});
