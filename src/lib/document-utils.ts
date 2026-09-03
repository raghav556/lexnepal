/** Client-side helpers for document upload UX. */

/** SHA-256 hex digest of raw bytes (the shared hashing primitive for all upload intents). */
export async function sha256HexOfBytes(buffer: BufferSource): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function computeSHA256(file: File): Promise<string> {
  return sha256HexOfBytes(await file.arrayBuffer());
}

/** Best-effort text extraction for local preview/search hints (non-OCR). */
export async function extractTextFromFile(file: File): Promise<string> {
  if (file.type.startsWith("text/") || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
    return file.text();
  }
  return "";
}
