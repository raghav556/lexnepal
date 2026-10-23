export type DocumentPreviewKind = "pdf" | "docx" | "image" | "text" | "legacy-doc" | "unsupported";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "div",
  "span",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "colgroup",
  "col",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "blockquote",
  "pre",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan"]),
  col: new Set(["span"]),
};

export function fileExtension(title?: string | null): string {
  const name = String(title || "")
    .trim()
    .toLowerCase();
  if (!name.includes(".")) return "";
  return name.split(".").pop() || "";
}

export function classifyDocumentPreview(input: {
  mimeType?: string | null;
  title?: string | null;
}): DocumentPreviewKind {
  const mime = String(input.mimeType || "")
    .toLowerCase()
    .split(";", 1)[0]
    .trim();
  const ext = fileExtension(input.title);

  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  // Check DOCX before legacy DOC so ".docx" is never treated as ".doc".
  if (mime === DOCX_MIME || ext === "docx") return "docx";
  if (mime === "application/msword" || ext === "doc") return "legacy-doc";
  if (
    mime === "image/jpeg" ||
    mime === "image/jpg" ||
    mime === "image/png" ||
    ext === "jpg" ||
    ext === "jpeg" ||
    ext === "png"
  ) {
    return "image";
  }
  if (mime === "text/plain" || ext === "txt") return "text";
  return "unsupported";
}

export function previewKindLabel(kind: DocumentPreviewKind): string {
  if (kind === "pdf") return "PDF";
  if (kind === "docx") return "DOCX";
  if (kind === "image") return "Image";
  if (kind === "text") return "Text";
  if (kind === "legacy-doc") return "DOC";
  return "File";
}

export function isSameOriginDownloadUrl(url: string, origin: string): boolean {
  try {
    return new URL(url, origin).origin === new URL(origin).origin;
  } catch {
    return false;
  }
}

export function previewErrorMessage(error: unknown): string {
  const status =
    error && typeof error === "object" && "status" in error
      ? Number((error as { status?: unknown }).status)
      : NaN;
  if (status === 403) {
    return "This file is not available. The link may have expired, or you do not have permission to view it.";
  }
  if (status === 404) {
    return "This document could not be found.";
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return "This document could not be opened.";
}

export function fallbackPreviewMessage(kind: DocumentPreviewKind): string {
  if (kind === "legacy-doc") {
    return "Legacy Word (.doc) files cannot be previewed in the browser. Mammoth only reads .docx, and there is no local converter for the older OLE format. Download the file to open it.";
  }
  return "Inline preview is not available for this file type. Download the file to open it.";
}

/**
 * Allowlist sanitizer for mammoth HTML. Scripts, event handlers, urls and
 * inline styles are stripped. Only structural text and table markup remain.
 */
export function sanitizeDocxHtml(html: string): string {
  const cleaned = String(html)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|svg)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<(?:script|style|iframe|object|embed|link|meta|form|svg)\b[^>]*>/gi, "")
    .replace(
      /\s(?:on\w+|href|src|xlink:href|style|formaction|action)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
      "",
    );

  return cleaned.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (full, rawTag, rawAttrs) => {
    const tag = String(rawTag).toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (full.startsWith("</")) return `</${tag}>`;
    const attrs = sanitizeAllowedAttrs(tag, String(rawAttrs || ""));
    if (tag === "br" || tag === "col") return `<${tag}${attrs}>`;
    return `<${tag}${attrs}>`;
  });
}

function sanitizeAllowedAttrs(tag: string, raw: string): string {
  const allowed = ALLOWED_ATTRS[tag];
  if (!allowed) return "";
  const kept: string[] = [];
  const attrRe = /([a-zA-Z_:][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)'|(\S+))/g;
  let match: RegExpExecArray | null;
  while ((match = attrRe.exec(raw))) {
    const name = match[1].toLowerCase();
    if (!allowed.has(name)) continue;
    const value = match[3] ?? match[4] ?? match[5] ?? "";
    if (!/^\d+$/.test(value)) continue;
    kept.push(`${name}="${value}"`);
  }
  return kept.length > 0 ? ` ${kept.join(" ")}` : "";
}
