import { describe, expect, it } from "vitest";
import {
  blogPostInputSchema,
  cmsSettingsUpdateSchema,
  navigationInputSchema,
  testimonialInputSchema,
} from "../../src/shared/contracts/cms";

describe("CMS input contracts", () => {
  it("rejects executable or sensitive setting keys", () => {
    expect(
      cmsSettingsUpdateSchema.safeParse({
        settings: [{ key: "liveChatWidgetScript", value: "<script>alert(1)</script>" }],
      }).success,
    ).toBe(false);
    expect(
      cmsSettingsUpdateSchema.safeParse({
        settings: [{ key: "newsletterApiToken", value: "secret" }],
      }).success,
    ).toBe(false);
  });

  it("allows only relative or HTTPS navigation targets", () => {
    const base = { label: "Home", location: "header", order: 0, isActive: true } as const;
    expect(navigationInputSchema.safeParse({ ...base, url: "/" }).success).toBe(true);
    expect(navigationInputSchema.safeParse({ ...base, url: "https://example.com" }).success).toBe(
      true,
    );
    expect(navigationInputSchema.safeParse({ ...base, url: "javascript:alert(1)" }).success).toBe(
      false,
    );
    expect(navigationInputSchema.safeParse({ ...base, url: "http://example.com" }).success).toBe(
      false,
    );
  });

  it("requires a publish date for published blog posts", () => {
    const post = {
      title: "Post",
      slug: "post",
      category: "Legal",
      excerpt: "Summary",
      content: "Content",
      author: "Lex Nepal",
      status: "published",
      publishDate: "",
    } as const;
    expect(blogPostInputSchema.safeParse(post).success).toBe(false);
    expect(
      blogPostInputSchema.safeParse({ ...post, publishDate: "2026-08-02T00:00:00.000Z" }).success,
    ).toBe(true);
  });

  it("constrains testimonial ratings to one through five", () => {
    const testimonial = {
      clientName: "Client",
      quote: "Excellent service",
      isApproved: true,
    };
    expect(testimonialInputSchema.safeParse({ ...testimonial, rating: 5 }).success).toBe(true);
    expect(testimonialInputSchema.safeParse({ ...testimonial, rating: 6 }).success).toBe(false);
  });
});
