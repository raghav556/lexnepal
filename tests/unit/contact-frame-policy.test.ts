import { describe, expect, it } from "vitest";
import config from "../../next.config";

describe("Contact map framing policy", () => {
  it("permits the existing map origin only on Contact and retains the shared policy", async () => {
    const rules = await config.headers!();
    const policy = (source: string) =>
      rules
        .find((rule) => rule.source === source)
        ?.headers.find((header) => header.key === "Content-Security-Policy")?.value;
    const shared = policy("/:path*"),
      contact = policy("/contact");
    expect(shared).toBeTruthy();
    expect(contact).toBe(`${shared}; frame-src https://maps.google.com`);
    expect(
      rules
        .filter((rule) =>
          rule.headers.some((header) => header.value.includes("frame-src https://maps.google.com")),
        )
        .map((rule) => rule.source),
    ).toEqual(["/contact"]);
  });

  it("keeps framing and object restrictions on the rest of the application", async () => {
    const rules = await config.headers!();
    const shared = rules
      .find((rule) => rule.source === "/:path*")!
      .headers.find((header) => header.key === "Content-Security-Policy")!.value;
    expect(shared).toContain("default-src 'self'");
    expect(shared).toContain("frame-ancestors 'none'");
    expect(shared).toContain("object-src 'none'");
    expect(shared).not.toContain("maps.google.com");
    expect(shared).not.toContain("frame-src *");
  });
});
