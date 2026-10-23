import { z } from "zod";

const cursorPayloadSchema = z.object({
  t: z.string().min(1).max(64),
  i: z.string().uuid(),
});

function toBase64Url(value: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  }
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Stable history cursor: createdAt + message id (base64url JSON). */
export function encodeMessageCursor(createdAt: string | Date, id: string): string {
  const t = createdAt instanceof Date ? createdAt.toISOString() : new Date(createdAt).toISOString();
  if (Number.isNaN(Date.parse(t)) || !z.string().uuid().safeParse(id).success) {
    throw new Error("Invalid message cursor inputs");
  }
  return toBase64Url(JSON.stringify({ t, i: id }));
}

export function decodeMessageCursor(cursor: string): { createdAt: Date; id: string } | null {
  if (!cursor || typeof cursor !== "string" || cursor.length > 512) return null;
  try {
    const parsed = cursorPayloadSchema.safeParse(JSON.parse(fromBase64Url(cursor)));
    if (!parsed.success) return null;
    const createdAt = new Date(parsed.data.t);
    if (Number.isNaN(createdAt.getTime())) return null;
    return { createdAt, id: parsed.data.i };
  } catch {
    return null;
  }
}

export function compareMessageOrder(
  a: { createdAt?: string | Date; _creationTime?: string | Date; _id?: string; id?: string },
  b: { createdAt?: string | Date; _creationTime?: string | Date; _id?: string; id?: string },
): number {
  const aTime = new Date(a.createdAt ?? a._creationTime ?? 0).getTime();
  const bTime = new Date(b.createdAt ?? b._creationTime ?? 0).getTime();
  if (aTime !== bTime) return aTime - bTime;
  return String(a._id ?? a.id ?? "").localeCompare(String(b._id ?? b.id ?? ""));
}

export function messageIdOf(message: { _id?: string; id?: string }): string {
  return String(message._id ?? message.id ?? "");
}

export function mergeMessagePages<T extends { _id?: string; id?: string }>(...pages: T[][]): T[] {
  const byId = new Map<string, T>();
  for (const page of pages) {
    for (const message of page) {
      const id = messageIdOf(message);
      if (!id) continue;
      byId.set(id, message);
    }
  }
  return [...byId.values()].sort(compareMessageOrder);
}
