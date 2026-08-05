/** Client-side helpers for document upload UX. */

export async function computeSHA256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Best-effort text extraction for local preview/search hints (non-OCR). */
export async function extractTextFromFile(file: File): Promise<string> {
  if (file.type.startsWith("text/") || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
    return file.text();
  }
  return "";
}
