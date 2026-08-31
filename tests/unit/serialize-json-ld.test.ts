import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "../../src/shared/seo/serialize-json-ld";

describe("serializeJsonLd", () => {
  it("preserves JSON data while escaping HTML-significant characters", () => {
    const serialized = serializeJsonLd({ title: '</script><script>alert("xss")</script>&' });

    expect(serialized).not.toContain("</script>");
    expect(JSON.parse(serialized)).toEqual({
      title: '</script><script>alert("xss")</script>&',
    });
  });

  it("returns valid JSON for undefined", () => {
    expect(serializeJsonLd(undefined)).toBe("null");
  });
});
