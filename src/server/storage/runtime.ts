import "server-only";
import { getServerEnvironment } from "@/server/env";
import { createLogger } from "@/server/observability/logger";
import { PostgresDocumentStorageRepository } from "@/server/repositories/document-storage-repository";
import { PostgresSecurityRepository } from "@/server/repositories/security-repository";
import { DocumentDownloadService } from "@/server/storage/document-download";
import { DocumentArchiveService } from "@/server/storage/document-archive";
import { DocumentPipelineService } from "@/server/storage/document-pipeline";
import {
  ClamAvScanner,
  CompositeDocumentScanner,
  HttpCdrScanner,
} from "@/server/storage/document-scanner";
import { S3ObjectStorage } from "@/server/storage/s3-object-storage";

let runtime:
  | {
      pipeline: DocumentPipelineService;
      downloads: DocumentDownloadService;
      archives: DocumentArchiveService;
      storage: S3ObjectStorage;
      scanner: CompositeDocumentScanner;
    }
  | undefined;

export function getDocumentStorageRuntime(): {
  pipeline: DocumentPipelineService;
  downloads: DocumentDownloadService;
  archives: DocumentArchiveService;
  storage: S3ObjectStorage;
  scanner: CompositeDocumentScanner;
} {
  if (runtime) return runtime;
  const environment = getServerEnvironment();
  if (!environment.OBJECT_STORAGE_BUCKET) {
    throw new Error("OBJECT_STORAGE_BUCKET is required for document storage");
  }
  const storage = new S3ObjectStorage({
    bucket: environment.OBJECT_STORAGE_BUCKET,
    region: environment.OBJECT_STORAGE_REGION,
    endpoint: environment.OBJECT_STORAGE_ENDPOINT,
    forcePathStyle: environment.OBJECT_STORAGE_FORCE_PATH_STYLE,
    serverSideEncryption: environment.OBJECT_STORAGE_SSE === "aes256" ? "AES256" : "none",
  });
  const repository = new PostgresDocumentStorageRepository();
  const authorization = new PostgresSecurityRepository();
  const antivirus = new ClamAvScanner(environment.CLAMAV_HOST, environment.CLAMAV_PORT);
  const scanner = new CompositeDocumentScanner(
    antivirus,
    environment.CDR_ENDPOINT
      ? new HttpCdrScanner(environment.CDR_ENDPOINT, environment.CDR_API_KEY)
      : undefined,
  );
  const logger = createLogger({ component: "document-pipeline" });
  runtime = {
    pipeline: new DocumentPipelineService(repository, storage, authorization, scanner, {
      uploadTtlSeconds: environment.UPLOAD_INTENT_TTL_SECONDS,
      uploadUrlTtlSeconds: environment.UPLOAD_URL_TTL_SECONDS,
      observe: (event, attributes) => {
        if (event.endsWith("dead_letter")) logger.error(event, attributes);
        else if (event.endsWith("retry") || event.endsWith("rejected"))
          logger.warn(event, attributes);
        else logger.info(event, attributes);
      },
    }),
    downloads: new DocumentDownloadService(
      authorization,
      repository,
      storage,
      environment.DOWNLOAD_URL_TTL_SECONDS,
    ),
    archives: new DocumentArchiveService(authorization, repository, storage),
    storage,
    scanner,
  };
  return runtime;
}
