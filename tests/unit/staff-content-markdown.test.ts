import { describe, expect, it } from "vitest";
import {
  buildNewsPayload,
  contentRequiredMessage,
  emptyNewsForm,
  missingContentFields,
  newsFormFromItem,
  saveResultMessage,
} from "@/views/staff/staff-content-model";
import {
  jsonToMarkdown,
  markdownRichTextSupport,
  markdownToDoc,
} from "@/views/staff/staff-content-markdown";

const supported = [
  "Hello",
  "Hello\n\nWorld",
  "# Title\n\nA paragraph",
  "## Section",
  "### Detail",
  "**Bold** and *italic*",
  "[Site](https://example.com)",
  "- One\n- Two",
  "1. First\n2. Second",
  "> Quoted text",
];

describe("staff content markdown round-trip", () => {
  it.each(supported)("preserves %j", (source) => {
    expect(markdownRichTextSupport(source)).toBe("rich");
    const doc = markdownToDoc(source);
    expect(doc).not.toBeNull();
    const markdown = jsonToMarkdown(doc!);
    expect(markdown).toBeTruthy();
    expect(jsonToMarkdown(markdownToDoc(markdown!)!)).toBe(markdown);
  });

  it("keeps code fences, tables, and deep headings in source mode", () => {
    expect(markdownRichTextSupport("```\ncode\n```")).toBe("source");
    expect(markdownRichTextSupport("| a | b |\n| --- | --- |")).toBe("source");
    expect(markdownRichTextSupport("#### Too deep")).toBe("source");
    expect(markdownToDoc("```\ncode\n```")).toBeNull();
  });

  it("does not accept unsafe link protocols", () => {
    expect(markdownToDoc("[bad](javascript:alert(1))")).toBeNull();
  });

  it("treats a 408 as an unknown save and keeps the user on the draft", () => {
    const created = saveResultMessage(408, { submitAfter: false, hadExistingId: false });
    const existing = saveResultMessage(408, { submitAfter: true, hadExistingId: true });
    expect(created.settled).toBe(false);
    expect(created.message).toMatch(/timed out/);
    expect(created.message).toMatch(/library/);
    expect(created.message).toMatch(/still on this page/);
    expect(existing.settled).toBe(false);
    expect(saveResultMessage(500, { submitAfter: false, hadExistingId: false })).toEqual({
      settled: true,
      message: "Failed to save draft.",
    });
  });

  it("names the empty field and accepts formatted Markdown as content", () => {
    expect(
      missingContentFields({ title: "Title", excerpt: "Excerpt", content: "**bold**" }),
    ).toEqual([]);
    expect(missingContentFields({ title: "", excerpt: "Excerpt", content: "Body" })).toEqual([
      "Title",
    ]);
    expect(missingContentFields({ title: "Title", excerpt: " ", content: "Body" })).toEqual([
      "Excerpt",
    ]);
    expect(missingContentFields({ title: "Title", excerpt: "Excerpt", content: "   " })).toEqual([
      "Content",
    ]);
    expect(contentRequiredMessage(["Content"])).toBe("Content is required.");
    expect(contentRequiredMessage(["Title", "Excerpt", "Content"])).toBe(
      "Title, Excerpt, and Content are required.",
    );
  });

  it("keeps optional news SEO fields on save and reload", () => {
    const form = {
      ...emptyNewsForm(),
      title: "Firm update",
      excerpt: "Summary",
      content: "Body",
      seoTitle: "  Search title  ",
      seoDescription: "Search description",
    };
    const payload = buildNewsPayload(form);
    expect(payload.seoTitle).toBe("Search title");
    expect(payload.seoDescription).toBe("Search description");
    expect(payload.status).toBe("draft");
    const cleared = buildNewsPayload({ ...form, seoTitle: "   ", seoDescription: "" });
    expect(cleared.seoTitle).toBeUndefined();
    expect(cleared.seoDescription).toBeUndefined();
    expect(
      newsFormFromItem({
        _id: "news-1",
        title: "Firm update",
        type: "firm_news",
        date: "2026-10-18",
        status: "published",
        seoTitle: "Stored title",
        seoDescription: "Stored description",
      }),
    ).toMatchObject({ seoTitle: "Stored title", seoDescription: "Stored description" });
  });

  it("serializes a TipTap document that contains formatted text", () => {
    expect(
      jsonToMarkdown({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Hello " },
              { type: "text", text: "bold", marks: [{ type: "bold" }] },
              { type: "text", text: " world" },
            ],
          },
        ],
      }),
    ).toBe("Hello **bold** world");
  });
});
