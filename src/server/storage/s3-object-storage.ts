import "server-only";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ObjectStorage, StoredObject, UploadGrant } from "@/server/storage/object-storage";

export interface S3ObjectStorageOptions {
  bucket: string;
  region: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  serverSideEncryption?: "AES256" | "none";
  client?: S3Client;
}

export class S3ObjectStorage implements ObjectStorage {
  private readonly client: S3Client;
  private readonly serverSideEncryption: "AES256" | undefined;

  constructor(private readonly options: S3ObjectStorageOptions) {
    const config: S3ClientConfig = {
      region: options.region,
      maxAttempts: 4,
      ...(options.endpoint ? { endpoint: options.endpoint } : {}),
      ...(options.forcePathStyle ? { forcePathStyle: true } : {}),
    };
    this.client = options.client ?? new S3Client(config);
    this.serverSideEncryption =
      options.serverSideEncryption === "none"
        ? undefined
        : (options.serverSideEncryption ?? "AES256");
  }

  async createUploadGrant(input: {
    key: string;
    contentType: string;
    maxBytes: number;
    intentId: string;
    expiresInSeconds: number;
  }): Promise<UploadGrant> {
    const expiresAt = new Date(Date.now() + input.expiresInSeconds * 1000);
    const encrypted = this.serverSideEncryption === "AES256";
    const result = await createPresignedPost(this.client, {
      Bucket: this.options.bucket,
      Key: input.key,
      Expires: input.expiresInSeconds,
      Fields: {
        "Content-Type": input.contentType,
        "x-amz-meta-upload-intent-id": input.intentId,
        ...(encrypted ? { "x-amz-server-side-encryption": "AES256" } : {}),
      },
      Conditions: [
        ["content-length-range", 1, input.maxBytes],
        ["eq", "$Content-Type", input.contentType],
        ["eq", "$x-amz-meta-upload-intent-id", input.intentId],
        ...(encrypted
          ? [["eq", "$x-amz-server-side-encryption", "AES256"] as ["eq", string, string]]
          : []),
      ],
    });
    return { url: result.url, method: "POST", fields: result.fields, expiresAt };
  }

  async createDownloadUrl(key: string, expiresInSeconds: number): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.options.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  async headObject(key: string): Promise<StoredObject | null> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.options.bucket, Key: key }),
      );
      return {
        key,
        sizeBytes: result.ContentLength ?? 0,
        contentType: result.ContentType ?? null,
        metadata: result.Metadata ?? {},
      };
    } catch (error) {
      if (isMissingObject(error)) return null;
      throw error;
    }
  }

  async readObject(key: string): Promise<Uint8Array> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.options.bucket, Key: key }),
    );
    if (!result.Body) throw new Error(`Object ${key} has no response body`);
    return result.Body.transformToByteArray();
  }

  async putObject(
    key: string,
    bytes: Uint8Array,
    contentType: string,
    metadata: Record<string, string> = {},
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
        Body: bytes,
        ContentLength: bytes.byteLength,
        ContentType: contentType,
        Metadata: metadata,
        ...(this.serverSideEncryption ? { ServerSideEncryption: this.serverSideEncryption } : {}),
      }),
    );
  }

  async copyObject(
    sourceKey: string,
    destinationKey: string,
    metadata?: Record<string, string>,
  ): Promise<void> {
    const contentType = metadata?.["content-type"];
    const objectMetadata = metadata
      ? Object.fromEntries(Object.entries(metadata).filter(([key]) => key !== "content-type"))
      : undefined;
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.options.bucket,
        Key: destinationKey,
        CopySource: `${this.options.bucket}/${encodeURIComponent(sourceKey).replace(/%2F/g, "/")}`,
        ...(this.serverSideEncryption ? { ServerSideEncryption: this.serverSideEncryption } : {}),
        ...(metadata
          ? {
              Metadata: objectMetadata,
              MetadataDirective: "REPLACE" as const,
              ...(contentType ? { ContentType: contentType } : {}),
            }
          : {}),
      }),
    );
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.options.bucket, Key: key }));
  }

  async listKeys(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    let continuationToken: string | undefined;
    do {
      const page = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.options.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );
      for (const object of page.Contents ?? []) if (object.Key) keys.push(object.Key);
      continuationToken = page.NextContinuationToken;
    } while (continuationToken);
    return keys;
  }
}

function isMissingObject(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return candidate.name === "NotFound" || candidate.$metadata?.httpStatusCode === 404;
}
