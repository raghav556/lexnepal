import "server-only";
import net from "node:net";

export interface ScanResult {
  verdict: "clean" | "infected";
  provider: string;
  details: string;
  sanitizedBytes?: Uint8Array;
}

export interface DocumentScanner {
  scan(bytes: Uint8Array, mimeType: string): Promise<ScanResult>;
}

export class RetryableScanError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "RetryableScanError";
    if (options?.cause !== undefined)
      Object.defineProperty(this, "cause", { value: options.cause });
  }
}

export class ClamAvScanner implements DocumentScanner {
  constructor(
    private readonly host: string,
    private readonly port = 3310,
    private readonly timeoutMs = 30_000,
  ) {}

  async scan(bytes: Uint8Array): Promise<ScanResult> {
    const response = await sendClamAvInstream(this.host, this.port, bytes, this.timeoutMs);
    if (response.includes("FOUND"))
      return { verdict: "infected", provider: "clamav", details: response };
    if (response.includes("OK")) return { verdict: "clean", provider: "clamav", details: response };
    throw new RetryableScanError(`Unexpected ClamAV response: ${response}`);
  }
}

export class HttpCdrScanner implements DocumentScanner {
  constructor(
    private readonly endpoint: string,
    private readonly apiKey?: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async scan(bytes: Uint8Array, mimeType: string): Promise<ScanResult> {
    try {
      const response = await this.fetcher(this.endpoint, {
        method: "POST",
        headers: {
          "content-type": mimeType,
          ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: bytes as BodyInit,
      });
      if (!response.ok) throw new Error(`CDR service returned ${response.status}`);
      const verdict = response.headers.get("x-cdr-verdict");
      if (verdict === "infected" || verdict === "rejected") {
        return { verdict: "infected", provider: "cdr", details: verdict };
      }
      if (verdict !== "clean" && verdict !== "sanitized") {
        throw new Error("CDR service did not return an explicit clean verdict");
      }
      const sanitizedBytes = new Uint8Array(await response.arrayBuffer());
      if (sanitizedBytes.byteLength === 0) throw new Error("CDR service returned an empty file");
      return { verdict: "clean", provider: "cdr", details: "sanitized", sanitizedBytes };
    } catch (error) {
      if (error instanceof RetryableScanError) throw error;
      throw new RetryableScanError("CDR scanning failed", { cause: error });
    }
  }
}

export class CompositeDocumentScanner implements DocumentScanner {
  constructor(
    private readonly antivirus: DocumentScanner,
    private readonly cdr?: DocumentScanner,
  ) {}

  async scan(bytes: Uint8Array, mimeType: string): Promise<ScanResult> {
    const antivirus = await this.antivirus.scan(bytes, mimeType);
    if (antivirus.verdict === "infected" || !this.cdr) return antivirus;
    const cdr = await this.cdr.scan(bytes, mimeType);
    return {
      ...cdr,
      provider: `${antivirus.provider}+${cdr.provider}`,
      details: `${antivirus.details}; ${cdr.details}`,
    };
  }
}

function sendClamAvInstream(
  host: string,
  port: number,
  bytes: Uint8Array,
  timeoutMs: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    const chunks: Buffer[] = [];
    socket.setTimeout(timeoutMs);
    socket.on("connect", () => {
      socket.write("zINSTREAM\0");
      for (let offset = 0; offset < bytes.byteLength; offset += 64 * 1024) {
        const chunk = Buffer.from(bytes.subarray(offset, offset + 64 * 1024));
        const length = Buffer.allocUnsafe(4);
        length.writeUInt32BE(chunk.byteLength);
        socket.write(length);
        socket.write(chunk);
      }
      socket.end(Buffer.alloc(4));
    });
    socket.on("data", (chunk: Buffer) => chunks.push(chunk));
    socket.on("end", () =>
      resolve(Buffer.concat(chunks).toString("utf8").replaceAll("\0", "").trim()),
    );
    socket.on("timeout", () => socket.destroy(new Error("ClamAV scan timed out")));
    socket.on("error", (error) =>
      reject(new RetryableScanError("ClamAV scanning failed", { cause: error })),
    );
  });
}
