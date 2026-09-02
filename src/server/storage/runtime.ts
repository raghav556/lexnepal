import "server-only";
import { getServerEnvironment, isClamAvConfigured } from "@/server/env";
import { createLogger } from "@/server/observability/logger";
import { MySqlDocumentStorageRepository } from "@/server/repositories/document-storage-repository";
import { MySqlSecurityRepository } from "@/server/repositories/security-repository";
import { DocumentDownloadService } from "@/server/storage/document-download";
import { DocumentArchiveService } from "@/server/storage/document-archive";
import { DocumentPipelineService } from "@/server/storage/document-pipeline";
import {
  ClamAvScanner,
  CompositeDocumentScanner,
  HttpCdrScanner,
  TrustingDocumentScanner,
  type DocumentScanner,
} from "@/server/storage/document-scanner";
import { LocalObjectStorage } from "@/server/storage/local-object-storage";

let objectStorage: LocalObjectStorage | undefined;
let runtime:
  | {
      pipeline: DocumentPipelineService;
      downloads: DocumentDownloadService;
      archives: DocumentArchiveService;
      storage: LocalObjectStorage;
      scanner: DocumentScanner;
    }
  | undefined;

export function getObjectStorageRuntime(): LocalObjectStorage {
  if (objectStorage) return objectStorage;
  const environment = getServerEnvironment();
  objectStorage = new LocalObjectStorage({
    root: environment.STORAGE_ROOT,
    appBaseUrl: environment.APP_PUBLIC_URL,
  });
  return objectStorage;
}

export function getDocumentStorageRuntime(): {
  pipeline: DocumentPipelineService;
  downloads: DocumentDownloadService;
  archives: DocumentArchiveService;
  storage: LocalObjectStorage;
  scanner: DocumentScanner;
} {
  if (runtime) return runtime;
  const environment = getServerEnvironment();
  const storage = getObjectStorageRuntime();
  const repository = new MySqlDocumentStorageRepository();
  const authorization = new MySqlSecurityRepository();
  const scanner = createDocumentScanner(environment);
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

function createDocumentScanner(
  environment: ReturnType<typeof getServerEnvironment>,
): DocumentScanner {
  if (!isClamAvConfigured()) return new TrustingDocumentScanner();
  const antivirus = new ClamAvScanner(
    environment.CLAMAV_HOST ?? "127.0.0.1",
    environment.CLAMAV_PORT,
  );
  return new CompositeDocumentScanner(
    antivirus,
    environment.CDR_ENDPOINT
      ? new HttpCdrScanner(environment.CDR_ENDPOINT, environment.CDR_API_KEY)
      : undefined,
  );
}
