import { getServerEnvironment } from "../../src/server/env";
import { LocalObjectStorage } from "../../src/server/storage/local-object-storage";

const environment = getServerEnvironment();
const storage = new LocalObjectStorage({
  root: environment.STORAGE_ROOT,
  appBaseUrl: environment.APP_PUBLIC_URL,
});
await storage.initialize();
process.stdout.write(
  `${JSON.stringify({ root: environment.STORAGE_ROOT, provider: "local-filesystem", private: true })}\n`,
);
