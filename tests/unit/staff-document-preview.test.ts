import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  classifyDocumentPreview,
  fallbackPreviewMessage,
  isSameOriginDownloadUrl,
  previewErrorMessage,
  previewKindLabel,
  sanitizeDocxHtml,
} from "../../src/components/documents/staff-document-preview";

describe("staff document preview classification", () => {
  it("classifies PDF, DOCX, images and text from mime or extension", () => {
    expect(classifyDocumentPreview({ mimeType: "application/pdf", title: "a.bin" })).toBe("pdf");
    expect(
      classifyDocumentPreview({ mimeType: "application/octet-stream", title: "brief.pdf" }),
    ).toBe("pdf");
    expect(
      classifyDocumentPreview({
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        title: "note",
      }),
    ).toBe("docx");
    expect(
      classifyDocumentPreview({ mimeType: "application/octet-stream", title: "affidavit.docx" }),
    ).toBe("docx");
    expect(classifyDocumentPreview({ mimeType: "image/jpeg", title: "scan.bin" })).toBe("image");
    expect(classifyDocumentPreview({ mimeType: "image/png", title: "photo.PNG" })).toBe("image");
    expect(classifyDocumentPreview({ mimeType: "text/plain", title: "notes" })).toBe("text");
    expect(
      classifyDocumentPreview({ mimeType: "application/octet-stream", title: "readme.txt" }),
    ).toBe("text");
  });

  it("never treats legacy DOC as DOCX", () => {
    expect(classifyDocumentPreview({ mimeType: "application/msword", title: "legacy.doc" })).toBe(
      "legacy-doc",
    );
    expect(classifyDocumentPreview({ mimeType: "application/msword", title: "legacy.docx" })).toBe(
      "docx",
    );
    expect(
      classifyDocumentPreview({ mimeType: "application/octet-stream", title: "old.doc" }),
    ).toBe("legacy-doc");
    expect(fallbackPreviewMessage("legacy-doc")).toMatch(/cannot be previewed/i);
    expect(fallbackPreviewMessage("legacy-doc")).not.toMatch(/treated as docx/i);
  });

  it("uses an accurate unsupported fallback", () => {
    expect(classifyDocumentPreview({ mimeType: "image/tiff", title: "scan.tif" })).toBe(
      "unsupported",
    );
    expect(
      classifyDocumentPreview({
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        title: "sheet.xlsx",
      }),
    ).toBe("unsupported");
    expect(previewKindLabel("unsupported")).toBe("File");
    expect(fallbackPreviewMessage("unsupported")).toMatch(/Download/i);
  });
});

describe("staff document preview security helpers", () => {
  it("keeps download fetches on the same origin", () => {
    expect(
      isSameOriginDownloadUrl("/api/v1/storage/objects/a?token=1", "https://app.lexnepal.test"),
    ).toBe(true);
    expect(
      isSameOriginDownloadUrl(
        "https://app.lexnepal.test/api/v1/storage/objects/a?token=1",
        "https://app.lexnepal.test",
      ),
    ).toBe(true);
    expect(
      isSameOriginDownloadUrl(
        "https://viewer.example/preview?url=secret",
        "https://app.lexnepal.test",
      ),
    ).toBe(false);
  });

  it("maps expired, missing and unauthorized downloads to safe messages", () => {
    expect(previewErrorMessage({ status: 403 })).toMatch(/expired|permission/i);
    expect(previewErrorMessage({ status: 404 })).toMatch(/could not be found/i);
    expect(previewErrorMessage(new Error("Custom"))).toBe("Custom");
  });

  it("strips scripts, urls and event handlers from Word HTML", () => {
    const dirty = `
      <h1 onclick="alert(1)">Hearing note</h1>
      <p>Paragraph <a href="javascript:alert(1)">link</a></p>
      <script>document.cookie</script>
      <img src="https://evil.example/x.png" onerror="alert(1)" />
      <table><tr><th>Party</th><th>Role</th></tr><tr><td colspan="2">Client</td></tr></table>
    `;
    const clean = sanitizeDocxHtml(dirty);
    expect(clean).toContain("<h1>Hearing note</h1>");
    expect(clean).toContain("<p>Paragraph link</p>");
    expect(clean).toContain("<table>");
    expect(clean).toContain('colspan="2"');
    expect(clean).not.toMatch(/script|onclick|href|javascript|img|onerror|src=/i);
  });
});

describe("staff documents viewer label", () => {
  it("shows DOCX for Word Open XML and DOC only for legacy Word", () => {
    expect(previewKindLabel("docx")).toBe("DOCX");
    expect(previewKindLabel("legacy-doc")).toBe("DOC");
    const page = readFileSync("src/views/staff/StaffDocumentsPage.tsx", "utf8");
    expect(page).toContain("previewKindLabel(classifyDocumentPreview(activeSidebarDoc))");
  });
});

describe("staff documents filter dialog contract", () => {
  it("opens the shared Dialog from controlled state instead of DialogTrigger", () => {
    const source = readFileSync("src/components/documents/AdvancedSearch.tsx", "utf8");
    expect(source).toContain("const [isOpen, setIsOpen]");
    expect(source).toContain("open={isOpen}");
    expect(source).toContain("onClick={() => setIsOpen(true)}");
    expect(source).not.toContain("DialogTrigger");
    expect(source).toContain("Apply Filters");
    expect(source).toContain("Document Type");
  });
});
