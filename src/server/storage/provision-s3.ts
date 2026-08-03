import "server-only";
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketEncryptionCommand,
  PutBucketLifecycleConfigurationCommand,
  PutBucketOwnershipControlsCommand,
  PutPublicAccessBlockCommand,
  PutBucketVersioningCommand,
  S3Client,
  type BucketLocationConstraint,
} from "@aws-sdk/client-s3";

export async function ensurePrivateDocumentBucket(input: {
  client: S3Client;
  bucket: string;
  region: string;
  provider: "aws-s3" | "minio";
  serverSideEncryption?: "AES256";
}): Promise<void> {
  if (!(await bucketExists(input.client, input.bucket))) {
    await input.client.send(
      new CreateBucketCommand({
        Bucket: input.bucket,
        ...(input.region === "us-east-1"
          ? {}
          : {
              CreateBucketConfiguration: {
                LocationConstraint: input.region as BucketLocationConstraint,
              },
            }),
      }),
    );
  }
  if (input.provider === "aws-s3") {
    await input.client.send(
      new PutPublicAccessBlockCommand({
        Bucket: input.bucket,
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          IgnorePublicAcls: true,
          BlockPublicPolicy: true,
          RestrictPublicBuckets: true,
        },
      }),
    );
    await input.client.send(
      new PutBucketOwnershipControlsCommand({
        Bucket: input.bucket,
        OwnershipControls: { Rules: [{ ObjectOwnership: "BucketOwnerEnforced" }] },
      }),
    );
    if (input.serverSideEncryption) {
      await input.client.send(
        new PutBucketEncryptionCommand({
          Bucket: input.bucket,
          ServerSideEncryptionConfiguration: {
            Rules: [
              {
                ApplyServerSideEncryptionByDefault: {
                  SSEAlgorithm: input.serverSideEncryption,
                },
              },
            ],
          },
        }),
      );
    }
  }
  await input.client.send(
    new PutBucketVersioningCommand({
      Bucket: input.bucket,
      VersioningConfiguration: { Status: "Enabled" },
    }),
  );
  await input.client.send(
    new PutBucketLifecycleConfigurationCommand({
      Bucket: input.bucket,
      LifecycleConfiguration: {
        Rules: [
          {
            ID: "expire-abandoned-quarantine",
            Status: "Enabled",
            Filter: { Prefix: "quarantine/" },
            Expiration: { Days: 7 },
            AbortIncompleteMultipartUpload: { DaysAfterInitiation: 1 },
          },
          {
            ID: "expire-rejected-files",
            Status: "Enabled",
            Filter: { Prefix: "rejected/" },
            Expiration: { Days: 30 },
          },
        ],
      },
    }),
  );
}

async function bucketExists(client: S3Client, bucket: string): Promise<boolean> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return true;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404
    ) {
      return false;
    }
    throw error;
  }
}
