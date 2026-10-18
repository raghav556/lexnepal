type JSONMark = { type: string; attrs?: Record<string, unknown> };
type JSONNode = {
  type: string;
  attrs?: Record<string, unknown>;
  text?: string;
  marks?: JSONMark[];
  content?: JSONNode[];
};

const UNSUPPORTED =
  /```|~~~|^\s{4,}\S|!\[[^\]]*]\(|\[[^\]]+]\[[^\]]*]|<\/?[A-Za-z][^>\n]*>|~~|`|\|.*\||^#{4,}\s|^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/m;

function textNode(text: string, marks: JSONMark[] = []): JSONNode {
  return marks.length > 0 ? { type: "text", text, marks } : { type: "text", text };
}

function paragraph(content: JSONNode[]): JSONNode {
  return content.length > 0 ? { type: "paragraph", content } : { type: "paragraph" };
}

function parseInlines(source: string, marks: JSONMark[] = []): JSONNode[] | null {
  const nodes: JSONNode[] = [];
  let buffer = "";
  const flush = () => {
    if (buffer) nodes.push(textNode(buffer, marks));
    buffer = "";
  };
  for (let index = 0; index < source.length; index += 1) {
    if (source.startsWith("**", index)) {
      const end = source.indexOf("**", index + 2);
      if (end === -1) return null;
      flush();
      const inner = parseInlines(source.slice(index + 2, end), [...marks, { type: "bold" }]);
      if (!inner) return null;
      nodes.push(...inner);
      index = end + 1;
      continue;
    }
    if (source[index] === "*") {
      const end = source.indexOf("*", index + 1);
      if (end === -1) return null;
      flush();
      const inner = parseInlines(source.slice(index + 1, end), [...marks, { type: "italic" }]);
      if (!inner) return null;
      nodes.push(...inner);
      index = end;
      continue;
    }
    if (source[index] === "[") {
      const full = /^\[([^\]]+)]\((https?:\/\/[^\s)]+)\)/.exec(source.slice(index));
      if (!full) return null;
      flush();
      const inner = parseInlines(full[1], [...marks, { type: "link", attrs: { href: full[2] } }]);
      if (!inner) return null;
      nodes.push(...inner);
      index += full[0].length - 1;
      continue;
    }
    if (source[index] === "]" || source[index] === "`") return null;
    buffer += source[index];
  }
  flush();
  return nodes;
}

function linesOf(block: string): string[] {
  return block.split("\n").map((line) => line.trimEnd());
}

function parseBlock(block: string): JSONNode | null {
  const lines = linesOf(block);
  if (lines.some((line) => /^\s{2,}(?:[-*]|\d+\.)\s/.test(line))) return null;
  const heading = /^(#{1,3})\s+(.+)$/.exec(lines[0] ?? "");
  if (heading) {
    if (lines.length !== 1) return null;
    const content = parseInlines(heading[2].trim());
    if (!content?.length) return null;
    return { type: "heading", attrs: { level: heading[1].length }, content };
  }
  if (lines.every((line) => line.startsWith("> "))) {
    const content = parseInlines(lines.map((line) => line.slice(2)).join(" "));
    if (!content) return null;
    return { type: "blockquote", content: [paragraph(content)] };
  }
  if (lines.every((line) => /^[-*]\s+/.test(line))) {
    const items = lines.map((line) => parseInlines(line.replace(/^[-*]\s+/, "")));
    if (items.some((item) => !item?.length)) return null;
    return {
      type: "bulletList",
      content: items.map((item) => ({ type: "listItem", content: [paragraph(item!)] })),
    };
  }
  if (lines.every((line) => /^\d+\.\s+/.test(line))) {
    const items = lines.map((line) => parseInlines(line.replace(/^\d+\.\s+/, "")));
    if (items.some((item) => !item?.length)) return null;
    return {
      type: "orderedList",
      content: items.map((item) => ({ type: "listItem", content: [paragraph(item!)] })),
    };
  }
  if (lines.some((line) => /^(?:#{1,6}\s|> |[-*]\s|\d+\.\s)/.test(line))) return null;
  const content = parseInlines(lines.join(" ").trim());
  if (!content) return null;
  return paragraph(content);
}

export function markdownToDoc(source: string): JSONNode | null {
  if (UNSUPPORTED.test(source)) return null;
  if (!source.trim()) return { type: "doc", content: [{ type: "paragraph" }] };
  const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const content: JSONNode[] = [];
  for (const block of blocks) {
    if (!block.trim()) continue;
    const parsed = parseBlock(block.trim());
    if (!parsed) return null;
    content.push(parsed);
  }
  return { type: "doc", content };
}

function renderText(node: JSONNode): string | null {
  if (node.type === "hardBreak") return "  \n";
  if (node.type !== "text" || node.text == null) return null;
  const marks = node.marks ?? [];
  if (marks.some((mark) => !["bold", "italic", "link"].includes(mark.type))) return null;
  let text = node.text;
  if (marks.some((mark) => mark.type === "italic")) text = `*${text}*`;
  if (marks.some((mark) => mark.type === "bold")) text = `**${text}**`;
  const link = marks.find((mark) => mark.type === "link");
  if (link) {
    const href = String(link.attrs?.href ?? "");
    if (!/^https?:\/\//i.test(href)) return null;
    text = `[${text}](${href})`;
  }
  return text;
}

function renderParagraph(node: JSONNode): string | null {
  if (!node.content?.length) return "";
  const parts: string[] = [];
  for (const child of node.content) {
    const rendered = renderText(child);
    if (rendered == null) return null;
    parts.push(rendered);
  }
  return parts.join("");
}

export function jsonToMarkdown(doc: JSONNode): string | null {
  if (doc.type !== "doc") return null;
  const blocks: string[] = [];
  for (const node of doc.content ?? []) {
    if (node.type === "paragraph") {
      const text = renderParagraph(node);
      if (text == null) return null;
      blocks.push(text);
      continue;
    }
    if (node.type === "heading") {
      const level = Number(node.attrs?.level);
      const text = renderParagraph({ type: "paragraph", content: node.content });
      if (!text || ![1, 2, 3].includes(level)) return null;
      blocks.push(`${"#".repeat(level)} ${text}`);
      continue;
    }
    if (node.type === "blockquote") {
      const inner = node.content?.[0];
      if (!inner || node.content?.length !== 1) return null;
      const text = renderParagraph(inner);
      if (text == null) return null;
      blocks.push(`> ${text}`);
      continue;
    }
    if (node.type === "bulletList" || node.type === "orderedList") {
      const lines: string[] = [];
      for (const [index, item] of (node.content ?? []).entries()) {
        const inner = item.content?.[0];
        if (item.type !== "listItem" || !inner || item.content?.length !== 1) return null;
        const text = renderParagraph(inner);
        if (!text) return null;
        lines.push(node.type === "bulletList" ? `- ${text}` : `${index + 1}. ${text}`);
      }
      blocks.push(lines.join("\n"));
      continue;
    }
    return null;
  }
  return blocks.join("\n\n");
}

export function markdownRichTextSupport(source: string): "rich" | "source" {
  const doc = markdownToDoc(source);
  if (!doc) return "source";
  const markdown = jsonToMarkdown(doc);
  if (markdown == null) return "source";
  const again = markdownToDoc(markdown);
  if (!again || jsonToMarkdown(again) !== markdown) return "source";
  return "rich";
}
