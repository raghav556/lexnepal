import "server-only";

export interface UploadGrant {
  url: string;
  method: "POST";
  fields: Record<string, string>;
  expiresAt: Date;
}

export interface StoredObject {
  key: string;
  sizeBytes: number;
  contentType: string | null;
  metadata: Record<string, string>;
}

export interface ObjectStorage {
  createUploadGrant(input: {
    key: string;
    contentType: string;
    maxBytes: number;
    intentId: string;
    expiresInSeconds: number;
  }): Promise<UploadGrant>;
  createDownloadUrl(key: string, expiresInSeconds: number): Promise<string>;
  headObject(key: string): Promise<StoredObject | null>;
  readObject(key: string): Promise<Uint8Array>;
  putObject(
    key: string,
    bytes: Uint8Array,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<void>;
  copyObject(
    sourceKey: string,
    destinationKey: string,
    metadata?: Record<string, string>,
  ): Promise<void>;
  deleteObject(key: string): Promise<void>;
  listKeys(prefix: string): Promise<string[]>;
}
